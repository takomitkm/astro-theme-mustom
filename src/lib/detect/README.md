# 能力与性能检测（src/lib/detect）

一句话：**不用点开游戏，就知道这台设备缺哪一样；不用访客反馈，就知道开屏该放多复杂。**

灵感来自 [nihui/ruapu](https://github.com/nihui/ruapu)。ruapu 的做法是把各指令集的一段机器码写进 `.text`、尾随一条 `ret`，直接执行，靠 `SIGILL`/`EXCEPTION_ILLEGAL_INSTRUCTION` 判断 CPU 认不认——它明确不用 CPUID、不看操作系统声明。浏览器里这条路走不通：网页拿不到可执行代码页，也没有非法指令异常可捕获。等价物是 **`WebAssembly.validate(bytes)` / 实例化**，浏览器对一段 wasm 字节码的接受与否就是它的能力自证，所以 `wasm-features.ts` 逐字节照抄 wasm-feature-detect 1.9.0（Apache-2.0）的模块。代价是 wasm 的 `v128` 在核心规范里定宽 128 位，**宿主是 SSE 还是 AVX-512 从 wasm 这层看不出来**——这是规范决定的，不是探测不够努力。

---

## 文件各管什么

| 文件 | 职责 |
| --- | --- |
| `capabilities.ts` | 唯一的读数来源。`probeSync()` 同步 10 ms 级、`probeAsync()` 补 WebGPU/WebGL/媒体/UA-CH/配额/电池，`probeAll()` 两步串起来。产出 `Caps` |
| `wasm-features.ts` | 23 个 wasm 特性的字节码探测器，逐字节抄自 wasm-feature-detect，不联网 |
| `games.ts` | 需求 DSL + 四态判定 `verdict()`。游戏清单在 `src/data/games.json` |
| `splash.ts` | 开屏 4 档、微基准、运行时帧率看门狗 |
| `../client/detect.ts` | 接线：跑一次、缓存到本会话、给 `[data-game]` 打标、把档位写进 `<html data-splash-tier>` |

页面：`src/pages/games.astro`（列表）、`src/pages/device-check.astro`（公开读数页）、`src/components/Splash.astro`（开屏，由 `Base.astro` 全站挂载，**每位访客只播一次**）。

---

## 两个轴必须分开

- **能力轴（games.ts）**：布尔量，声明式，能在不运行游戏的前提下判定。产出 `ok / unknown / blocked / site`。
- **性能轴（splash.ts）**：连续量，只能在现场测。硬件信息不足以判性能，见下。

混在一起的后果是：拿 `hardwareConcurrency` 当算力，弱机判定一片红、强机照样卡。

---

## 四态的语义（这套 UI 的地基，别改）

| 态 | 触发 | 显示 |
| --- | --- | --- |
| `ok` | 每条硬需求都拿到**正面证据** | 无标记 |
| `unknown` | 至少一条**判不了**：探针没测到、异步段没跑完、该内核根本没这条通道 | 整卡灰（`filter: grayscale(1)` + `opacity: .55`），角标「判不了」 |
| `blocked` | 至少一条被**正面否定**：API 不存在、wasm 字节码被拒、WebGPU feature 缺席、扩展没开 | 角标「不支持」+ 压在卡上的 ✕ 水印 |
| `site` | 需求本身没问题，失败原因能落到托管层（缺 COOP/COEP、非安全上下文） | 角标「站点限制」+ ✕，颜色与 blocked 不同 |

三条纪律：

1. **证据缺失一律 `unknown`，绝不静默当 `blocked`。** 把"没测到"显示成"你的设备不行"是最坏的错法。
2. **`site` 与 `blocked` 分开。** GitHub Pages 上 `threadweave` 永远是 `site`——访客的机器没问题，是托管设不了响应头。
3. **三态都不吃掉点击。** 判错了访客仍能点进去自己试，链接一律保留。

`prefers`（软需求）只进 `warn` 列表，不参与判定；性能档位不够时把 `ok` 压到 `unknown`（灰），不压到 `blocked`。

---

## Caps 读数结构

```ts
Caps = {
  probeVersion, at, tookMs: { sync, async }, notes: ProbeNote[],
  engine,   // ua / family / familyHow / isWebView / isWebViewHow / uach / uachHigh
  host,     // hardwareConcurrency / deviceMemory / maxTouchPoints / dpr / screen / viewport / heap / connection / quota / battery
  ctx,      // isSecureContext / crossOriginIsolated / protocol / origin / siteLimits[]
  prefs,    // reducedMotion / reducedTransparency / contrast / colorGamut / dynamicRange / pointer / hover / forcedColors
  es,       // 28 个运行时布尔
  apis,     // 63 个点路径 → 值为 typeof（'function'|'object'|'string'…）或 'accessor'|'undefined'|'null'|'missing'|'error'
  wasm,     // 23 个特性布尔
  webgl1, webgl2,   // grade / unmasked 串 / exts / params / precision / anisoMax
  webgpu,   // verdict + 4 种适配器请求各自的 features/limits/info
  media,    // 14 条编解码 + MSE + AudioContext 实测值
  asyncDone
}
```

### grade 的含义（WebGL 与硬件线索通用）

| 值 | 意思 |
| --- | --- |
| `direct` | 直接读到的真值 |
| `coarse` | 量化值（如 `deviceMemory` 只给 1/2/4/8） |
| `masked` | 拿到了但被内核改写过：走软渲染或驱动黑名单时扩展表不可信 |
| `absent` | 这个内核没有这条通道 —— **是内核限制，不是设备没有硬件** |
| `error` | 探测本身抛错 |
| `pending` | 还没测（同步段的占位，异步补完前不能当"没有"） |

### 两条一定要记住的假阴性来源

- **`*.prototype.X` 不能用整串求值判断存在性。** IDL 属性是挂在原型上的 getter，拿原型当 `this` 读会触发品牌检查抛 `TypeError`，早期版本把它当成"不存在"，于是 `KeyboardEvent.prototype.code`、`URL.canParse`、`Element.prototype.requestFullscreen` 在 Chrome 上全部误报缺失。现在 `walkPath()` 逐段只用 `in` 判断、末段才取值，取值抛错记为 `accessor`（＝存在）。中间段还允许是 `typeof 'function'`（类本身），不然也一律误报。
- **`adapter.info` 与 `WEBGL_debug_renderer_info` 的字符串不能当判据。** WebGPU 规范 §3.6.2.4 明说"没有任何成员保证填值，给什么是内核裁量"，§2.2.6 又要求标识"尽可能宽泛"、§2.2.3 限制最多 32 个分档。实测本机 Chromium 只给 `vendor=amd`、`architecture=rdna-3`，`device`/`description` 是空串。空值不等于没显卡，别按 GPU 名字分支。

---

## 开屏 4 档

`full → reduced → static → skip`。

**L0 硬负排除（同步、零成本）**，`pickSplashTier()` 顺序：
1. `prefers-reduced-motion` / `forced-colors` / `saveData` → **static**。这是访客意愿，文案里明确写"与设备性能无关"，不许写成"你的机器不行"。
2. 没有 `requestAnimationFrame` → **skip**。
3. `deviceMemory ≤ 1`，或（WebGL 确实建不出 且 线程数 ≤2）→ **static**。
4. 其余一律先给 **reduced**（保守），`basis: 'conservative'`。

**L1 微基准**，`runSplashBench()`：32 帧 rAF 采样 + 一帧固定工作量（离屏画布 2000 个 `fillRect` + 一次 `getImageData`）。`headroom = (1 - 丢帧比) × (1 - 工作量占帧预算比)`，`≥ 0.7` 才升 `full`。测不出就维持原判，**绝不因为"没测"而升档**。页面在后台时直接放弃（rAF 被节流，数毫无意义）。

**L2 帧率看门狗**，`createFpsWatchdog()`：动画真在放的时候采 48 帧，中位帧间隔 > 26 ms 且 p95 > 60 ms 才降一档——取中位数所以单次 GC/图片解码尖峰不会误触发。降档写进 `sessionStorage`（`mustom.splash.degrade`），本会话不再往回试，一次动画周期最多降 2 档。

为什么不能只看硬件信息：`deviceMemory` 在 Firefox/Safari 根本不存在；`hardwareConcurrency` 是线程数不是算力；低端 ARM 的大核常被报成 4。所以硬件信息只做"硬负排除"，升档必须靠实测。

### 全站只播一次（2026-10-16 定的口径）

`Splash.astro` 挂在 `Base.astro` 的 `.GlobalLayout` 最前面，所以每页都有这一层；播过之后**永久不再播**，记账写在访客本地。

- **记在哪**：本站那份偏好对象里加一个 `splashSeen` 时间戳（`localStorage`，键 `btoa(location.host)`，与皮肤/语言同一份，走 `patchSave`）。这是整套检测**唯一**落长期存储的东西，读数本身仍然只在 `sessionStorage`。
- **不闪遮罩**：`Base.astro` 的首帧前 boot 脚本读到 `splashSeen` 就给 `<html>` 加 `sp-seen`，CSS `html.sp-seen .Splash{display:none}` 先把这层压掉，模块脚本随后把节点摘走。
- **没真播过就不记账**：两条硬规则——① 页面在后台标签里打开时（`document.hidden`）先挂 `sp-gone` 等 `visibilitychange`，别把访客唯一的一次开屏消耗在看不见的标签页里；② 档位判成 `skip` 时不写 `splashSeen`，因为那台引擎本来也放不出来，下次进来还应该再试一次判档。
- **自动收尾**：`HOLD = { full: 5000, reduced: 5000, static: 1200, skip: 0 }` 毫秒，另外点任意处 / 按任意键立即收尾。开屏不拦内容。
- **升档能就地接住**：L1 微基准是首屏之后闲时才跑的，所以 rAF 循环每帧都回头读一次 `getSplashTier()`，档位变了就地换档——不然首次访问永远看不到 `full`。
- **重播口子**：`/device-check/` 的「重播开屏」按钮清掉 `splashSeen` 并摘掉 `sp-seen`，刷新即可再看一次。「清除会话缓存」按钮**不动** `splashSeen`——它只管 `sessionStorage` 那份读数，跟按钮名字对得上。

本机实测（内置 Chromium，2026-10-16）：清干净存储后首次进站 → `splashSeen` 写入、`.Splash` 从 DOM 摘除、`<html>` 带上 `sp-seen`；再刷两次 → 时间戳一字未变、DOM 里没有 `.Splash`；点「重播开屏」→ 偏好对象回到 `{}`、`sp-seen` 摘掉、状态行转成「开屏还没播过」。

> 一处采集限制要写清楚：内置浏览器的页面恒为 `document.hidden === true`，所以"真的播出来"那一段是把 **`dist` 里那份构建产物**的 `if(document.hidden)` 临时改成 `if(false)` 跑通的（源码未动，事后重新构建即还原）。因此被验证的是 `dismiss → markSeen → patchSave` 这条记账链，动画帧本身在这个环境里看不到。

---

## 站点限制 vs 设备限制

`ctx.siteLimits` 里固定两条，判定函数按失败文案能不能归到这两条上来分 `site`：

- **`crossOriginIsolated`**：`SharedArrayBuffer` / wasm-threads 需要 **COOP + COEP 两个响应头**。**GitHub Pages 设不了响应头**，所以在线程类托管上这类游戏恒为 `site`。迁到能设头的托管（自建 nginx/Caddy、Cloudflare Workers/Pages Functions、Vercel/Netlify 的 header 配置）后这一条自动转绿，代码不用改。
- **`isSecureContext`**：`file://` 与 `http://<局域网 IP>` 打开时，WebGPU、`SharedArrayBuffer`、Service Worker 按规范都不暴露。用 `https://` 或 `localhost` 即消失。`astro preview` 走 localhost，属安全上下文。

未来迁到动态托管时的顺序：先给全站加 `Cross-Origin-Opener-Policy: same-origin` 与 `Cross-Origin-Embedder-Policy: require-corp`，再把第三方资源（不蒜子、一言、B 站）改成 `crossorigin` 或本地代理——COEP 会拦掉不带 CORP 的跨域响应，这一步不做完会变成"线程可用了但图表和计数全挂"。

---

## 需求 DSL（`src/data/games.json`）

```jsonc
{
  "id": "threadweave",            // 必填，卡片用 data-game 关联
  "title": "织线", "titleEn": "Threadweave",
  "url": "/games/threadweave/",   // 可选：填了才是链接（自动补 basePath），没填显示"未上线"
  "tags": ["wasm", "threads"],
  "desc": "…", "descEn": "…",
  "needs":  { … },                // 硬需求，缺一条即判 blocked/unknown
  "prefers": { … },               // 软需求，只出提示
  "splashTier": "reduced",        // 可选：性能档位要求
  "sentinel": true                // 可选：这条是判定哨兵不是游戏，卡片上会标出来
}
```

`needs` / `prefers` 的键：

| 键 | 值 | 判据 |
| --- | --- | --- |
| `es` | 字符串数组 | `caps.es[name]`，取 `ES_FLAGS` 的名字 |
| `api` | 点路径数组 | `caps.apis[path]`；`missing`/`undefined` → 不支持，`error`/表里没有 → 判不了 |
| `wasm` | 特性名数组 | `caps.wasm[name]`；`threads` 特判成站点限制 |
| `gl.minVersion` | `1`/`2` | 必须有对应版本的上下文 |
| `gl.ext` | 扩展名数组 | 在 `webgl1.exts` 或 `webgl2.exts` 里出现即满足；`grade==='masked'` 时判不了（扩展表不可信） |
| `gl.param` | `{ 名: 下限 }` | `MAX_TEXTURE_SIZE`、`MAX_SAMPLES` 等，读不到判不了 |
| `gl.precision` | 数字 | 着色器精度范围下限 |
| `gl.aniso` | 数字 | 各向异性倍数（缺 `EXT_texture_filter_anisotropic` 判不了） |
| `gpu.any` | `true` | 只要有适配器 |
| `gpu.feature` | 名字数组 | 适配器 `features` 里没有 → 不支持；API 在但一个适配器都不给 → 判不了（可能是黑名单/隐私设置） |
| `gpu.limit` | `{ 名: 下限 }` | 同上 |
| `threads` | `true` | 要三层同时成立：`SharedArrayBuffer` 在、wasm threads 字节码被接受、`crossOriginIsolated` |
| `secure` | `true` | 安全上下文 |
| `media.codec` | 标签数组 | 取 `CODEC_PROBES` 第一列；`probably` 满足、`maybe` 默认算满足（`strict: true` 时判不了）、`no` 不支持 |
| `media.mse` | MIME 数组 | `MediaSource.isTypeSupported` |

内置的 5 条示例覆盖全部四个态，它们不是游戏，是**回归哨兵**。

> 哨兵＝清单里长期留着、永远不真上线的条目，唯一作用是把判定的每条分支各打一态。
> 用法：改过 `games.ts` 的判据、或 `capabilities.ts` 换了读数口径（`PROBE_VERSION` +1）之后，
> 开 `/games/` 只看这张表还对不对——该 `ok` 的还 `ok`、该 `site` 的还 `site`。
> 哪一行的颜色变了、而改的不是那条判据，就是把判定改坏了。
> 之所以需要它：这套判定没法写单元测试——判据依赖真实浏览器的运行时读数，
> Astro 静态站里也没有测试跑线。真浏览器就是唯一的测试台，哨兵把它变成可重复的对照。
> 加真游戏时**建议至少留 1–2 条**（`threadweave` 和 `reduce-demo` 最值，分别钉住 `site` 和 `blocked` 两条最容易被误并的分支）。

| id | 需求 | 本机（Chromium 150 / Electron 43）实测 |
| --- | --- | --- |
| `dust` | PointerEvent | `ok` |
| `wasm-sim` | wasm simd + bulkMemory | `ok` |
| `threadweave` | threads + COOP/COEP | `site`（两条原因都归到跨域隔离） |
| `pathtrace` | WebGPU subgroups + 8192 纹理 + secure + 档位 reduced | `unknown`（能力全过，档位 static < reduced） |
| `reduce-demo` | WebGPU `subgroups-reduce` | `blocked`（本机 feature 表里确实没有） |

---

## 隐私口径

写死在 `client/detect.ts`：读数只进 `sessionStorage`（键 `mustom.detect.v{PROBE_VERSION}`）和内存，**不发任何请求、不进不蒜子、Service Worker 不参与**。私密模式下 `sessionStorage.setItem` 抛错就当没记，功能不受影响。改读数结构必须把 `PROBE_VERSION` +1，旧缓存自动作废。

**唯一的长期存储写入**是开屏那一个 `splashSeen` 时间戳（`localStorage`，与本站皮肤/语言偏好同一份对象），由 `Splash.astro` 写、不是探针写的；里面没有任何读数字段，`/device-check/` 的「重播开屏」可以随时清掉。

`device-check` 页公开给访客：访客在这里看到的是**自己**浏览器的读数，页面不上传、不比对。

---

## 已知边界

- **覆盖不到 ISA。** wasm 层面看不到 SSE/AVX2/AVX-512/NEON；能测的是 wasm 特性位（simd、relaxedSimd、wideArithmetic、memory64、gc、threads…）。要按 CPU 指令集分支只能靠 `adapter.info.architecture`（如 `rdna-3`）这类粗标识，而且内核可以不给。
- **构建目标。** Astro 默认 esbuild target 会把可选链等语法降级，但 **`WebGL2RenderingContext` 之类的存在性判断不受降级影响**；真正的坑是给旧 WebView（Android 7 之类）用 `for...of over Map`、`Object.entries` 等仍需运行时支持的特性——所以探针里所有属性访问都过 `safe()`，任何一步抛错只记 `notes`，绝不让探针把页面搞崩。老内核上这套代码是"能跑、少读数"，不是"白屏"。
- **WebView 识别只能到疑似。** Android 的 UA 有 `; wv` 是确定的；iOS 的 WKWebView 没有可靠标记，只能按"iPhone 但 UA 结尾没有 Safari/xxx 且不是 CriOS/FxiOS"给疑似，`isWebViewHow` 会写"判不准"。
- **Electron / 各类桌面壳。** UA-CH 的 brands 只报内嵌 Chromium，壳这一层只有 UA 里有；`probeEngine` 优先匹配 `Electron/x`，因为壳决定了权限与 GPU 策略。
- **`asyncDone` 之前判不了。** 同步段只 10 ms 级，WebGPU 那半要等 Promise；期间依赖 WebGPU/WebGL 的游戏显示灰，补齐后自动重算标记。
- **微基准会受邻居影响。** 超过 1.2 s 的采样会在 `note` 里提示"可能被别的任务抢了主线程"；`document.hidden` 时直接不测。

---

## 本机实测基线（2026-10-16，内置 Chromium 150 / Electron 43.1.1，localhost）

原始整份读数在同目录 `baseline.chromium-2026-10-16.json`，下表只列判据用到的部分。

**那份 JSON 是脱敏过的**，不是探针输出的原样：仓库是公开的，原样入库等于把这台机器的设备指纹公开发布。抹掉的五处逐条写在文件自己的 `scrub` 块里（UA 的应用标识与版本、`languages` 整串、WebGL renderer 里的 PCI 设备号、持久配额两个数、`downlink`/`rtt`），并且给了一份在自己机器上重新抓一份的配方。下面表里凡是与那五处对应的数字，也一并从文档里撤了——文档和 JSON 是同一个公开面上，只清一个等于没清。

| 项 | 读数 |
| --- | --- |
| `tookMs` | 主线程空闲时（在 `/device-check/` 连点「重新检测」三次）：sync **2 / 2 / 6 ms**，async **30 / 36 / 795 ms**。冷启动整页时：首页 sync **312 / 224 ms**、async **685 / 888 ms**，检测页 sync **462 ms**、async **1068 ms** |
| 内核 | `Electron 43.1.1（内嵌 Chromium）`，UA-CH 高熵 `architecture=x86, bitness=64, platform=Windows` |
| 上下文 | `isSecureContext: true`，`crossOriginIsolated: false` → 站点限制 1 条 |
| 偏好 | `prefers-reduced-motion: true`、`reduced-transparency: true` → **开屏判到 static，理由是访客意愿不是性能** |
| 设备 | 16 线程、`deviceMemory 32`、dpr 1、`heap limitMB 4192`、`connection` 只有 `effectiveType: 4g`（`downlink`/`rtt`/配额两个数已脱敏，见上） |
| WebGL | 1 与 2 都是 `grade: direct`，ANGLE **AMD Radeon 780M**（核显），扩展 35/32，`MAX_TEXTURE_SIZE 16384`，各向异性 16 |
| WebGPU | `verdict: ok`；4 次请求里 3 次拿到适配器，`forceFallbackAdapter` 返回 null；`info` 只有 `vendor=amd` + `architecture=rdna-3`，`device`/`description` 空；`subgroupMinSize 32 / subgroupMaxSize 128`；features **19 项**含 `subgroups`、`texture-compression-bc`、`timestamp-query`，**不含 `subgroups-reduce`**；`wgslLanguageFeatures` 10 项；limits `maxTextureDimension2D 16384`、`maxBufferSize 2147483648`、`maxStorageBufferBindingSize 2147483644`、`maxBindGroups 4` |
| wasm | 23 项检测，**20 通过**，失败 3 项：`wideArithmetic`、`threads`（缺跨域隔离）、`typeReflection` |
| ES | 28 项全 true（含 `Temporal`、`Float16Array`、`Atomics.waitAsync`） |
| API | 63 条路径，`missing` 只剩 3 项：`ServiceWorkerGlobalScope`（窗口上下文本来就没有）、`SharedArrayBuffer`（未隔离）、`Gamepad.prototype.hapticActuators`（这条是 Firefox/Safari 侧的）；另有 5 项记为 `accessor`（`GPUAdapter.prototype.info`、`GPUDevice.prototype.adapterInfo`、`CanvasRenderingContext2D.prototype.filter`、`Gamepad.prototype.vibrationActuator`、`KeyboardEvent.prototype.code`），这些是"存在但读值抛错"，不能当缺失 |
| 媒体 | 14 条编解码：`avc1`/`av1`/`hevc` 等 12 条 `probably`，`ogg/vorbis` 与 `aac lc` 是 `no`；MSE 14 条里 10 条 true（`theora`、`audio/aac`、`audio/flac`、`audio/wav` 四条为 false）；WebCodecs、RTCPeerConnection 在；AudioContext 48000 Hz / baseLatency 0.01 / 2 声道 |
| `notes` | 空数组，同步段与异步段都没有抛错 |
| 五条示例 | `dust` ok、`wasm-sim` ok、`threadweave` site、`pathtrace` unknown、`reduce-demo` **blocked** —— 四个态在同一个页面上都渲染出来了 |

这份读数是内置浏览器**页面处于后台**时抓的，同一次读数里 `screen.w/h`、`viewport.w/h` 都是 0 —— 隐藏页拿不到窗口尺寸，属采集环境限制，不是探针 bug。这四字段不参与任何判定，但别拿这份基线当"分辨率"参照。

`tookMs` 两栏差出 50–100 倍，别只引其中一个数：`probeSync()` 是一整段同步代码，它自己的工作量就是那 2–6 ms；冷启动那几次量到的是**同一段代码被页面启动挤在主线程上的墙上时间**（首页那 224–312 ms 里绝大部分不是探针在算，是它排队等 HTML 解析/渲染/看板娘/播放器初始化）。后台页被降优先级会进一步放大。要判"探针本身贵不贵"看空闲那栏，要判"首屏被拖了多久"看冷启动那栏——**后者才是真该优化的数**，办法是把 `initDetect()` 从模块顶层挪到首帧之后（`requestIdleCallback`），现在还没做。

**Firefox 那份没有读数**：上面这份是内置 Chromium 抓的，Firefox 与各类 WebView 的分支代码路径同一份，但**未采集**——所以下面这些差异是按各家文档写的预期，不是实测，别当基线引用：`deviceMemory` 缺失（应记为内核限制、不参与判档）、`userAgentData` 不存在（走 UA 规则表）、`wideArithmetic` 在 Firefox 155+ 为真、WebGPU 只在 Windows 141+ 与 Apple 硅 145/147 暴露且 **Service Worker 里没有**、`SharedArrayBuffer` 同样要 COOP/COEP。

---

## 已定口径（2026-10-16 她拍的）

1. **5 条哨兵全部保留**——原话「保留。这些测了总是有用的吧。」。落地方式不是把它们挪出渲染，而是**照样渲染但明确标注**：`GameEntry` 加了 `sentinel?: boolean`，`games.json` 里 5 条都置 `true` 并**删掉 `url`**（原来那 5 个 `/games/dust/` 之类全是死链，也没带 `basePath` 前缀）。`/games/` 上每张哨兵卡因此显示虚线「判定哨兵 / SELF-CHECK」标签（`title` 里写清它为什么在这），底部是「自检样本，不上线」而不是播放链接；将来加真游戏时把 `url` 填上就自动换成链接（走 `abs()` 补 `basePath`）。
2. **开屏全站挂载，每位访客只播一次**——原话「开屏挂载，只在第一次访问这个站点的时候播一次，然后就存进访问者的本地记忆里，以后就不用再重复跑了。」。实现与实测见上文《全站只播一次》。顺带把根 `README.md` 里那条对不上的「启动画面每个浏览器会话只播一次」改成了实话：那句话当初指的是 `Spinner.astro`，而 `Spinner` 是**每页都铺、`load` 后淡出**的加载指示（`position:fixed` 全覆盖、z-index 980），从来不是会话级；现在真正的开屏是 `Splash.astro`（z-index 1200，盖在 `Spinner` 上面），一次即止。`Spinner` 保持原样不动。

## 待决口径（尚未定，定了就把对应条删掉）

1. **`prefers-reduced-motion` 在开屏 L0 的权重。** 现在它直接砍到 `static`（整段动画换成静态帧），理由是"访客操作系统里勾了减少动态效果"。另一种口径是只降到 `reduced`（保动画、去位移与视差、留透明度变化），认为勾选项针对的是大幅位移而不是任何动效。两种都合规，差在体验取向；本机两个偏好都勾着，选哪个都会让这台机看不到 `full`——实测档位就是 `static`，理由行原样写着"这是访客意愿，与设备性能无关"。

---

## 怎么跑

```bash
cd S:/apps/llm/agentwork/mustom-astro
# 项目自带的 node，PATH 里没有 node
.tools/node-v22.21.1-win-x64/node.exe node_modules/astro/astro.js build
.tools/node-v22.21.1-win-x64/node.exe node_modules/astro/astro.js check
.tools/node-v22.21.1-win-x64/node.exe node_modules/astro/astro.js preview --port 4321
```

**构建要临时目录**：PWA 的 workbox 那步在 `%LOCALAPPDATA%\Temp` 里建哈希名目录会 `EPERM`（本机 6958 个临时项、这台机器的临时目录有别的软件在管 ACL），三个变量一起指到项目内就没问题：

```bash
mkdir -p .tmp
TMP="$PWD/.tmp" TMPDIR="$PWD/.tmp" TEMP="$PWD/.tmp" .tools/node-v22.21.1-win-x64/node.exe node_modules/astro/astro.js build
```

`.tmp` 别提交。

---

## 加一个游戏要做的事

1. 往 `src/data/games.json` 加一条，`needs` 只写**真的用得到**的——每多写一条硬需求就多一个判成红的理由。
2. 游戏自己那边的降级路径要写：判成灰/红不等于不能加载，只是本站知道它缺什么。
3. 想看判定过程就开 `/device-check/`，小游戏那一段逐条列出四态与原因，原始 JSON 可复制。

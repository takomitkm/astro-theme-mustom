# Mustom for Astro

把 jinyaoMa 的简约设计主题 **Mustom**（[hexo-theme-mustom](https://github.com/jinyaoMa/hexo-theme-mustom) / [vuepress-theme-mustom](https://github.com/jinyaoMa/vuepress-theme-mustom)）重写为 **Astro** 主题：构建期输出纯静态 HTML，客户端只保留少量原生 TypeScript，零框架运行时，GitHub Pages 开箱即用。

以 VuePress 版（Mustom 的最终形态）的视觉与交互为蓝本，同时保留了 Hexo 版的 RESTful API 习惯。

## 技术栈映射（一一对应）

| 原 Mustom | 本仓库 |
| --- | --- |
| Hexo / VuePress | Astro（static output） |
| EJS 模板（layout/_partial/_part/*.ejs） | `.astro` 组件（src/components/） |
| Stylus（source/asset/css/_part/*.styl） | SCSS（组件内 `<style lang="scss">`，调色板经 Vite additionalData 全局注入，无需手写 import） |
| Hexo helpers（$count/$min2read/$word4site…） | src/lib/wordcount.ts、src/lib/posts.ts |
| Hexo 页面生成器 / @vuepress/plugin-blog | Astro 路由 + content collections（src/content.config.ts） |
| hexo-generator-restful（/api/posts.json） | JSON API 路由（/api/recent.json；/api/search.json 仅作 dev 后备） |
| 不蒜子自写 JSONP | **不蒜子官方脚本** + 官方 span id（拉取失败显示 ∞） |
| Valine/Vssue 评论 | **Giscus**（GitHub Discussions），并移植 zmfk fork 的主题/语言热切换（夜间/皮肤/语言变更经 postMessage 实时生效） |
| @vuepress/plugin-search（title+headers 检索） | **Pagefind**（构建期全文索引，中文分词开箱即用） |
| sw.tpl / @vuepress/pwa + manifest.json | **@vite-pwa/astro**（Workbox generateSW + webmanifest，全量预缓存） |
| hexo feed / RSS | **@astrojs/rss** |
| @vuepress/plugin-zooming | **medium-zoom**（同款配置：黑底、0.9 缩放） |
| vuepress-plugin-img-lazy | 一行 rehype 插件（loading="lazy"） |
| vuepress-plugin-mathjax | **KaTeX**（remark-math + rehype-katex） |
| nprogress（换页进度） | Astro core `prefetch`（悬停预取，MPA 下逼近 SPA 手感） |
| vuepress-plugin-sitemap | **@astrojs/sitemap** |
| 客户端 JS（source/asset/js/part/*.js） | 原生 TS（src/lib/client/*.ts，`<script>` 自动打包） |
| Font Awesome 字体图标 | **astro-icon** + Iconify fa6 数据集（构建期内联 SVG，组件内做 FA5→FA6 名称映射） |
| 盘古之白（pangunode.js） | **npm `pangu`**（官方维护版）+ remark 壳 |
| VuePress header-anchor（标题 ¶） | **rehype-slug + rehype-autolink-headings** |
| Vuex stores（皮肤/语言/看板娘/播放器） | `<html>` class + localStorage + CustomEvent（src/lib/client/actions.ts） |
| Vssue（GitHub Issues 评论） | Giscus（GitHub Discussions，按 config 配置） |

原则：**有官方等价用官方，有新替代用新，有通用方案用通用，都没有才自己写**——上面只有皮肤变量系统、状态层和一小把交互是自己实现的，其余全部落在 Astro 官方或生态标准件上。

## 特性

**已移植**（对照 blog fork 快照 39fc71b 全量对齐）：三套皮肤（jshine 彩色 / whiteblack 黑白 / night 夜间）、加载指示、顶部阅读进度条、顶栏站名（回首页链接 + em/strong 徽章）、**B 站 BGM 播放器**（右栏卡片，≤1016px 自动搬进一言卡；倒计时/自动切歌/静音挂载首次手势接音；歌单数据与两个维护工具见下）、**产量热力图**（echarts 日历热力图，主栏顶部，CDN 脚本按需注入）、**看板娘**（live2d-widget 自托管 + umaru 模型，设置里可关）、**划词翻译**（谷歌免密钥端点，记住上次目标语言）、**随机文章入口**（左下圆钮，?utm_source=random）、**/live/ 直播间常驻页**（liveRoutes 三种线路写法）、**标题序号**（构建期 data-num）、字数提示行 + **页级访问量**（不蒜子 page_pv）、页脚计数**说明气泡**、列表**分隔符**（✟⫘…⫘✟ 按行宽重算）、列表**摘要 10 行截断**（超行末尾删字补……，随窗口/字体重算）、**四档正文字体链**（汇文明朝体→上图东观体粗→Noto Sans SC→设备字体；侧栏思源宋）、**整站壁纸**（半透明纱，config 可换图）、宽屏上限与移动断点改 **em 表达**（每行 10 字下限）、左右栏折叠总开关（xdrawer/xaside，状态持久化）、门户页（PWA 安装卡 + RSS 入口）、**全站搜索**（Pagefind：emoji 提示、结果总数行、命中片段高亮、Enter 触发，s// 热键）、名片（文章/分类/标签计数）、多组菜单（当前页高亮）、皮肤/设置抽屉、分类/标签云图、一言、近期文章（首屏 N 条 + 更多文章追加）、按年分组归档时间轴、文章页（大标题 meta、Shiki 双主题高亮、KaTeX 公式、标题锚点 ¶、结束线、好友二维码、BY-NC-SA 版权块、标签、上/下一篇）、阅读模式、目录 scrollspy、卡片最小化、回到顶部/底部、图片点击放大、图片懒加载、不蒜子 pv/uv、标签页标题彩蛋、盘古之白、RSS、站点地图、PWA 离线可用、404、移动端自适应、双语界面（设置里切换）。

**未移植**（留给站点层或暂不需要）：FeedPulse 访客地图、Records/Gallery/Codes/Icons 四类数据页、简历/求职信生成器（Hexo 站点层个人页面）、Happyday 彩蛋、页脚维护者署名、About 页分段双语、PWA 更新弹窗（保持静默 autoUpdate，改法见下）。

**与原版的有意差异**：开屏改为**每位访客一生只播一次**（原版每次进 SPA 都放；本仓是 MPA，播过就记进访客本地偏好，之后任何页面都不再出现）；加载指示改为页面加载淡出（代替 SPA 路由转圈）；上/下一篇按语义修正（原版指向与文案相反）；`viewport` 允许双指缩放；搜索索引为 标题+标签+分类+摘要（原版为标题+小节）。

## 设备与特性检测（2026-10-16 加）

给小游戏和开屏做的一层能力判定。设计、判据 DSL、实测基线全在 **`src/lib/detect/README.md`**，这里只记站点上多了什么：

- **`/games/`**（`src/pages/games.astro` + `src/components/GameGrid.astro`）——清单在 `src/data/games.json`，每条声明自己要什么（API 存在性 / ES 特性 / wasm 特性 / WebGL 参数与扩展 / WebGPU feature 与 limit / 编解码 / 安全上下文 / 跨域隔离 / 开屏档位）。访客**没点进去之前**卡片就按四态标好：可玩不加标记、判不了整卡去色压暗、明确不支持压一个 ✕ 水印、站点限制也压 ✕ 但另配色且文案点明是托管设不了响应头。链接一律保留，三态都不吃掉点击。
  现在清单里那 5 条（`dust`/`wasm-sim`/`threadweave`/`pathtrace`/`reduce-demo`）**不是游戏，是判定哨兵**：故意让它们把 `ok`/`unknown`/`blocked`/`site` 四个态各钉一个在页面上，改过判据后拿这张表当对照，哪一行颜色变了而改的不是那条判据就是把判定改坏了。卡片上因此标着虚线的「判定哨兵」，底部写「自检样本，不上线」而不是链接。加真游戏时往 `games.json` 追加、填上 `url` 即可，哨兵按她的决定全部留着。
- **`/device-check/`**（`src/pages/device-check.astro`）——公开给访客的读数页，15 个小节加一份原始 JSON，五个按钮（重测 / 跑一次开屏基准 / 复制 JSON / 清除会话缓存 / 重播开屏）。只显示访客自己这台机，不上传、不比对。
- **开屏**——`full / reduced / static / skip` 四档由 `src/lib/detect/splash.ts` 判，结果写在 `<html data-splash-tier>` 上；`src/components/Splash.astro` 由 `Base.astro` 全站挂载，**每位访客只播一次**：播完把时间戳写进本地那份偏好对象（`localStorage`，键 `btoa(location.host)`，与皮肤/语言同一份），首帧前的 boot 脚本读到它就给 `<html>` 加 `sp-seen` 把这层压掉，所以不会闪遮罩。后台标签里打开时先等页面可见再播，档位判成 `skip` 时不记账。`/device-check/` 的「重播开屏」可以随时解锁再看一次。这层跟 `Spinner`（加载指示，每页都铺、`load` 后淡出，z-index 980）是两回事，开屏在它上面（z-index 1200）。
- **接线**——`src/layouts/Base.astro` 里 `initDetect()`：同步探针自身工作量 2–6 ms，但冷启动时它排在页面启动后面，墙上时间实测 224–462 ms（后台页更甚），这一条还没优化；WebGPU/媒体那半异步补齐后自动重算标记。
- **隐私**——读数只进 `sessionStorage`，不发任何请求、不进不蒜子、Service Worker 不参与；私密模式下写不进去就当没记。整套检测**唯一**落长期存储的就是上面那个开屏时间戳，里面不含任何读数字段。
- **现状**——判定与两个页面在 Chromium 侧逐条实测过（读数 `src/lib/detect/baseline.chromium-2026-10-16.json`，**这份是脱敏过的**：仓库公开，原样入库等于把采集那台机器的设备指纹公开发布，抹掉了哪五处写在文件自己的 `scrub` 块里）；Firefox 与各类 WebView 走的是同一份判据，但**没有采到过读数**。线程类特性（`SharedArrayBuffer`、wasm-threads）在 GitHub Pages 上恒判"站点限制"，迁到能设 COOP/COEP 响应头的托管即自动解锁。
- **实测到哪一步**——开屏"只播一次"的记账链在内置 Chromium 上跑通了：首次进站写入时间戳并摘掉节点，再刷两次时间戳一字未变、DOM 里没有 `.Splash`，「重播开屏」把偏好清回 `{}` 并摘掉 `sp-seen`。**一处限制**：内置浏览器的页面恒为后台（`document.hidden === true`），所以"真播出来"那一段是把 `dist` 里构建产物的可见性判断临时改掉跑通的，源码未动、事后重新构建即还原；动画帧本身在这个环境里看不到，`full`/`reduced` 两档的 rAF 循环与帧率看门狗**未在真机验证过**。要在 Firefox 或真机上核，直接开 `/device-check/`。

## 快速开始

要求 Node 18.17+（仓库自带 `.tools/` 便携版的话可直接用）。

```bash
npm install
npm run dev       # http://localhost:4321（dev 下搜索退化为 JSON 索引）
npm run build     # astro build && pagefind --site dist（生成全文搜索索引）
npm run preview   # 本地构建/预览自动走本站资源；CDN 前缀只在 CI（部署）构建时启用
npm run icons:pwa # 由 favicon.svg 重新生成 PWA PNG 图标（需 devDependencies 里的 sharp）

# B 站歌单维护（Deno）：
# deno run -A tools/bili_fav_dump.mjs <收藏夹 media_id> [输出=source/data/bili-playlist.json]
# deno run -A tools/bili_playlist_fix.mjs   # 剔除失效条目，跑过再 build
```

> PWA / Pagefind 的产物只在 `build` 后可见（`dist/sw.js`、`dist/pagefind/`），
> 用 `npm run preview` 或部署后体验；`astro dev` 里 SW 不会注册。
>
> PWA 更新弹窗：当前配置为 `autoUpdate`（静默更新，下次访问即新版），不会弹窗；
> 想要"发现新版本 → 点击更新"的弹窗，把 `astro.config.ts` 里 `registerType`
> 改为 `'prompt'` 并接 `useRegisterSW` 即可——弹窗会在你开着旧版页面、
> 后台装好新版 Service Worker 的那一刻出现（通常= 部署后再次访问）。

## 配置

几乎一切都集中在 **`src/config.ts`**（对应原版 `_config.yml` / themeConfig）：站名、作者、语言、默认皮肤、菜单、门户（含 PWA 安装卡）、名片联系方式、一言、评论（Giscus，填 repoId/categoryId 即出现并支持热切换）、不蒜子、二维码、许可协议、搜索引擎验证 meta、广告脚本注入、`cdnPrefix`（静态资源 CDN 前缀）、`biliplayer`（歌单路径/倒计时）、`liveRoutes`（/live/ 线路）、`translater`（划词默认语言）、`images.wallpaper`（整站壁纸，置空关闭）等。改完无需动组件。

内容用 Markdown：

- 文章放 `src/content/posts/`，frontmatter：`title`（必填）、`date`、`updated`、`tags[]`、`categories[]`、`excerpt`（可选，缺省取正文首段）、`cover`（可选，列表低透明度背景）、`draft`
- 独立页面放 `src/content/pages/`（如 `about.md` → `/about/`）

图片/占位资源在 `public/images/`，全部是本主题原创的 SVG 占位画，换成你自己的即可。

## 目录结构

```
src/
├── config.ts              # 主题配置（≡ _config.yml）
├── content.config.ts      # posts / pages 两个内容集合
├── styles/                # _vars.scss 令牌；skin.scss 皮肤变量；global.scss 全局
├── markdown/remark-pangu.ts   # 盘古之白 remark 插件（≡ pangunode.js）
├── icons/                 # 内联 SVG 图标注册表
├── lib/
│   ├── posts.ts wordcount.ts locales.ts   # 构建期工具（≡ Hexo helpers）
│   ├── detect/            # 能力与性能探针：capabilities / wasm-features /
│   │                      # games（判据 DSL）/ splash（4 档）＋ README 与实测基线
│   └── client/            # 浏览器端 TS：storage/actions/layout/search/
│                          # hitokoto/busuanzi/recentmore/global/config/misc
│                          # + detect.ts（跑探针、给 [data-game] 打标、写 data-splash-tier）
├── data/games.json        # 小游戏清单（含需求声明；当前 5 条是判定用的哨兵样本）
├── components/            # Icon/T/Header/Goingto/Spinner/Progress/Drawer/Aside/
│                          # Brand/Menu/Skin/Settings/Panel/Toc/Ext/Empty/Hitokoto/
│                          # Recent/Timeline/Article/Comment/Cloud/Footer/Heatmap/
│                          # Biliplayer/Translate/Random/GameGrid/Splash
├── layouts/Base.astro     # ≡ frame.ejs + GlobalLayout.vue（含防闪烁 boot 脚本）
└── pages/                 # index / posts/[...slug] / archive / tags / categories /
                           # [...slug]（src/content/pages 的独立页，如 about）/ 404 /
                           # live / games / device-check / rss.xml / api/{recent,search}.json
```

## 部署到 GitHub Pages

`.github/workflows/deploy.yml` 随 `main` 自动发布：build 产物一方面走官方工件模式发布 Pages，另一方面用 peaceiris 把 `dist` 推到同仓库的 **`cdn` 分支**（jsdelivr 镜像的是分支文件，工件模式的产物不在任何分支上，所以必须单独推）。

**子路径部署**：仓库名不是 `<user>.github.io`，Pages 会挂在 `/<仓库名>/` 子路径下，因此主题内置了 base 支持：

- `src/config.ts` 的 `basePath` 是唯一的根路径来源（当前 `/astro-theme-mustom`），`astro.config.ts` 的 `base` 直接取它；
- 构建期引用（组件模板、`config.ts` 里的图片/菜单/门户路径、`posts.ts` 生成的 URL）统一走 `abs()` 补前缀；
- 客户端运行时引用走 `src/lib/client/base.ts` 的 `abs()`——**注意 Astro 给的 `import.meta.env.BASE_URL` 不带尾斜杠**，直接拼接会得到 `/xxxapi/...`，所以统一在那里补 `/`；
- `public/` 下的文件（Astro 不会自动加前缀）、PWA manifest 的 `start_url`/`scope`、workbox 的 `navigateFallback` 与排除规则、`live2d` 资源路径都做了对应处理。

**换域名/仓库名时改一处**：把 `basePath` 改成 `''` 即为根部署（`<user>.github.io` 仓库）；改成 `/新仓库名` 则整站跟着搬。`site.url` 要与 Pages 实际地址一致（canonical / OG / RSS / sitemap 都取它），`cdnPrefix` 的 jsdelivr 路径也要同步换成新仓库，否则 CDN 资源仍指向旧站。

注意事项：仓库必须公开（jsdelivr 只镜像公开仓库）；jsdelivr 对分支引用有数小时缓存（换内容后可到 jsdelivr 手动 purge）；大陆直连偶有波动——介意单点就把 `cdnPrefix` 留空。分支名由 deploy.yml 的 `publish_branch` 决定，当前 `cdn`。

## 状态管理原理（无框架版）

原版用 Vuex + mixin 管理皮肤/语言/折叠偏好；MPA 下改为：

1. `<head>` 内联 boot 脚本在**首帧前**把 localStorage 里的偏好写成 `<html>` 的 class（`skin-xxx` / `lang-en` / `close-drawer` / `close-aside` / `NO_LIVE2D` / `hide-player`），无闪烁；
2. 所有组件样式读 CSS 变量（皮肤变量表在 `src/styles/skin.scss`，数值与原版逐一对应）；
3. 组件间通过 `document` 上的 CustomEvent（`mustom:skin`、`mustom:lang`、`mustom:player`、`mustom:resize`）联动，例如换皮肤时热力图重画、Giscus 热切主题；
4. 卡片最小化、左右栏折叠、回到顶部等全局行为用事件委托，等价于原版 `mustom$ToggleMinimize` / xdrawer / xaside。

## Reference

This project is inspired by and references the following Mustom projects:

- [jinyaoMa/hexo-theme-mustom](https://github.com/jinyaoMa/hexo-theme-mustom)
- [jinyaoMa/mustom-next](https://github.com/jinyaoMa/mustom-next)
- [jinyaoMa/vuepress-theme-mustom](https://github.com/jinyaoMa/vuepress-theme-mustom)
- [zmfk/vuepress-theme-mustom](https://github.com/zmfk/vuepress-theme-mustom)
- [椒盐豆豉的博客](https://blog.douchi.space/)

### 取用细节

- [reference/vitepress-theme-sakura.md](reference/vitepress-theme-sakura.md) — 从
  [flaribbit/vitepress-theme-sakura](https://github.com/flaribbit/vitepress-theme-sakura) 取用的部分
  （回到顶部卷轴、一言故障风、半透明顶栏、文章卡片悬浮阴影），逐条列明照搬了什么、
  改了什么、为什么改。**注意：上游没有 LICENSE 文件，详见该文档开头的许可证提示。**

## 许可

MIT（继承原主题，见 LICENSE）。其中：

- 图标：astro-icon + Iconify 的 Font Awesome 6 数据集（CC BY 4.0）
- CC BY-NC-SA 徽章：Creative Commons 官方物料
- `public/images/` 下的占位画（头像/滑稽表情/猫爪印等）：本仓库原创，随意替换
- 拟物化回到顶部的鸟居图形（`Goingto.astro`）：**纯 CSS 绘制**，
  早期版本曾直接引用 vitepress-theme-sakura 的 `scroll.png` 位图，
  因**上游没有 LICENSE 文件**（保留所有权利）已改为自绘，仓库内不再包含其任何文件。
  详见 [reference/vitepress-theme-sakura.md](reference/vitepress-theme-sakura.md)

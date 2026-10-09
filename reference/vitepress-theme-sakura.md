# 参考实现：vitepress-theme-sakura

本文记录本站从 [flaribbit/vitepress-theme-sakura](https://github.com/flaribbit/vitepress-theme-sakura)
取用的部分：**照搬了什么、改了什么、为什么改**。目的是让后来者能核对来源，
而不是"看起来像"。

- 上游仓库：<https://github.com/flaribbit/vitepress-theme-sakura>
- 演示站：<https://flaribbit.github.io/vitepress-theme-sakura/>
- 默认分支：`master`，源码在 `.vitepress/theme/`
- 取用时间：2026-10

---

## ⚠️ 许可证状态

**上游仓库没有 LICENSE 文件，README 里也没有任何许可声明，GitHub API 同样检测不到许可证。**

这在著作权法上等于"保留所有权利"（all rights reserved），默认不允许他人复制、修改、再分发。
本仓库（LICENSE 为 MIT）与之并不兼容。

具体到本项目，**原先有一处是直接复制二进制素材**：

| 文件 | 状态 |
| --- | --- |
| `public/images/sakura/scroll.png` | **已移除。** 原为从上游 `.vitepress/theme/assets/scroll.png` 原样下载（70×900，3572 字节）。现已改为纯 CSS 绘制，见下方「回到顶部」。 |

其余几处从一开始就是按其思路**重写的 CSS/JS**（见下表），没有逐字复制源文件。

因此本站目前**不再包含任何来自该仓库的文件**，只借鉴设计思路与若干具体数值
（尺寸、缓动时长、颜色）。若仍担心 construed as 衍生作品，建议：

1. 联系上游作者取得书面授权；或
2. 继续按本文件「改动」表里列的差异点进一步拉开距离。

`src/components/` 里凡是标注「参考 sakura …」注释的地方都列在下面表格中，
核对来源时按表逐个对照即可。

---

## 取用清单

| 上游文件 | 用到的东西 | 本站位置 |
| --- | --- | --- |
| `theme/ToTop.vue` | 卷轴式回到顶部按钮 | `src/components/Goingto.astro` |
| `theme/GlitchText.vue` | 故障风文字 | `src/components/Hitokoto.astro`、`src/lib/client/hitokoto.ts` |
| `theme/Header.vue` | 半透明顶栏 + 居中菜单 | `src/components/Header.astro`、`src/config.ts` (`headerMenu`) |
| `theme/BlogList.vue` | 文章卡片悬浮阴影 | `src/components/Recent.astro`、`src/components/Timeline.astro` |

---

## 回到顶部（`ToTop.vue`）

上游是一根 900px 高的卷轴图，滚过 200px 后从屏幕下方推上来，点击平滑回顶。

**图形已改为纯 CSS 绘制**，不再使用上游那张 `scroll.png`（原因见上方许可证一节）。
下面先把原图的量测结果记下来，作为 CSS 复刻的依据：

| 部位 | 量测结果 |
| --- | --- |
| 柱身 | x 33–36（共 4px），y 0–796；**8px 一个周期 = 7px `#BE493E` + 1px `#000000`**，两侧各 1px 黑边；共 99 段 |
| 门身整体 | y 797–894（98px 高） |
| 上梁 | y 797 起，最宽处在 y≈818（左右几乎顶满 70px），两端收成尖角 |
| 梁面装饰 | x≈36–50 处有几道 `#5C5C5C` 深色短竖线 |
| 下梁 | y 839–858，红褐 `#BE493E` 与暗部相间的斜纹 |
| 基座 | y 856–871，白色外扩梯形 |
| 右下卷曲 | y 872–894，x≈38–49 的小白色卷曲 |

CSS 实现拆成 9 个零件（`.pole` + `.gate` 里的 8 个 `<i>`），
柱身用 `repeating-linear-gradient` 画 8px 周期，白色件用 `clip-path` 定形、
四向 0 模糊 `drop-shadow` 勾 1px 墨线轮廓。整体仍是 70×900。

**照搬的部分**

- 定位：`width: 70px; height: 900px; right: 25px`
- 过渡：`transition: top .5s ease-in-out`
- 浮动动画：`translateY(0) → -6px → 0`，`2s ease-in-out infinite`
- 显隐判据：

  | 条件 | `top` |
  | --- | --- |
  | `scrollY <= 200` | `-900px`（藏在屏外） |
  | `scrollY > 200` 且 `innerWidth > 720` | `min(innerHeight - 968, 0)px` |
  | `scrollY > 200` 且 `innerWidth <= 720` | `-640px` |

**改动**

| 项 | 上游 | 本站 | 原因 |
| --- | --- | --- | --- |
| 图形 | 一张 `scroll.png` 位图 | 纯 CSS，9 个零件 | 上游无 LICENSE，二进制素材不宜再分发 |
| 形态 | 上下对称的抽象卷轴 | 依量测结果画成鸟居（柱 + 上梁 + 双柱 + 下梁 + 基座） | 原图实为一座鸟居，量测后按结构还原 |
| 触发方式 | 中间那个按钮直接滚一屏 | 左栏设置「滚动导航拟物化」开关切换两种形态 | 需求指定 |
| `z-index` | `50` | `960` | 要压过本站的 `.Goingto` / `.Random` / 页脚浮层（940–961 一带） |
| 移动端 | 只有 `top` 变化 | 另加 `@media (max-width: $smallestWidth)` 时 `transform: translateX(headerHeight)` 收起 | 沿用本站原有的移动端行为 |
| 深色皮肤 | 无 | 白件在黑底上照常显示（与原位图行为一致），中键图标 `filter: invert(1)` | 中键图标是黑色像素图，黑底看不见 |

---

## 故障风文字（`GlitchText.vue`）

上游用 `attr(data-text)` 造两层错位色，静止时裁掉，悬浮时跑 clip 抖动。

**照搬的部分**

- 结构：两层伪元素 `content: attr(data-text)`，`position: absolute; top: 0; width: 100%`
- 动效节奏：`animation: glitch-loop-1/2 .8s infinite ease-in-out alternate-reverse`
- `glitch-loop-2` 里带 `top` 位移（只有一层上下抖，另一层不动）
- 配色思路：一红一青两层反向偏移

**改动**

| 项 | 上游 | 本站 | 原因 |
| --- | --- | --- | --- |
| 裁剪属性 | `clip: rect(...)` | `clip-path: inset(...)` | `clip` 已废弃且不可平滑过渡；`inset()` 百分比写法不依赖字号 |
| 静止态 | `clip: rect(0,0,0,0)` | `clip-path: inset(100% 0 0 0)` | 同上 |
| 颜色 | 硬编码 `#ff3f1a` / `#00a7e0` | `var(--selection)` / `var(--link-markdown)` | 要跟随三套皮肤，否则夜间皮肤下红青错位会瞎 |
| 字号 | `80px`（移动端 48px） | 继承卡片的 `1.25rem` | 用在「一言」卡片里，不是页面大标题 |
| 常态偏移 | `left: -1px` / `left: 1px` | 常态不偏移，仅 `::after` 在动画里动 `top` | 卡片里常态就带偏移会看着像渲染错位 |
| 基础阴影 | `text-shadow: rgba(0,0,0,.2) 4px 4px 8px` | 去掉 | 卡片已有自己的排版层次 |
| 宿主元素 | `.glitch` 直接是根 | 单独包一层 `.glitch` | `.word` 的 `::before/::after` 已被『』括号占用 |

**配套改动**：`src/lib/client/hitokoto.ts` 在换句时同步 `data-text`，
否则句子换了而伪元素里还留着旧句子。

---

## 顶栏（`Header.vue`）

上游是 `rgba(255,255,255,0.9)` 的固定顶栏，中间一组绝对居中的图标+文字菜单。

**照搬的部分**

- `li { margin: 0 12px }`（本站改用 `0.75rem` 跟随根字号）
- `a { transition: color .2s ease-out }`，悬浮转强调色
- 每项 `<i class="fa …">图标</i> + 文字` 的组合
- 左右各一组图标按钮、菜单居中

**改动**

| 项 | 上游 | 本站 | 原因 |
| --- | --- | --- | --- |
| 背景 | 写死 `rgba(255,255,255,.9)` | `color-mix(in srgb, var(--header-bg) 88%, transparent)`，前一行留不透明底色兜底 | 本站有三套皮肤，写死白底会让夜间皮肤瞎掉；`color-mix` 让三套皮肤自动都对 |
| 居中方式 | `position: absolute; left: 50%; translate: -50%` | 直接放在 grid 的 `auto` 中间列 | 本站顶栏左右各是两格等宽固定列，中间那格天然就是视口正中（实测偏差 6px），不必再叠一层绝对定位 |
| 菜单内容 | 首页 / 标签 / 关于 | 首页 / 归档 / 关于 / 直播间 | 按本站实际路由 |
| 窄屏 | `font-size: 48px` | 收起图标只留文字 | 四个带图标的按钮塞不下 |
| 下划线 | — | `a::before { display: none }` | 全局 `a::before` 的下划线在导航里太吵 |

**配套改动**：`src/config.ts` 新增 `headerMenu`，与抽屉用的 `menus` 分开配置
——抽屉那份刻意不含「首页」（首页走 Logo），顶栏这份四个主入口列全。

---

## 文章卡片悬浮阴影（`BlogList.vue`）

**照搬的部分**

卡片静息态用一道向下扩散、透明度约五成的柔和长阴影（纵向偏移 1px、模糊 20px、
负 6px 的收缩让阴影只向外发散），过渡时长 0.3 秒、缓动为 `ease`；
悬浮态换成一道更靠近元素、横向与纵向都外扩约 5px 的短实阴影，透明度降到两成。
两者对比的效果是「阴影由弥散收紧」。窄屏（720px 以下）把这层效果整个关掉。

以及 720px 以下把阴影整个关掉的移动端处理。

**改动**

| 项 | 上游 | 本站 | 原因 |
| --- | --- | --- | --- |
| 作用元素 | `.card` | `.Recent .item-info`、`.Timeline .item-content` | 本站列表项的 `::after` 承担条目之间的分隔符（`✟⫘⫘⫘`），给 `.list-item` 加圆角阴影会把分隔线一起框进去 |
| 圆角 | `10px` | `$borderRadius`（4px） | 跟随本站卡片圆角 |

---

## 未取用的部分

上游还有很多东西本站没有搬过来，若日后要加可从这里取：

- `Banner.vue` — 文章页顶部 400px 封面横幅
- `TOC.vue` — 右侧悬浮目录（本站已有自己的 `Toc.astro`）
- `Waline.vue` — Waline 评论（本站用 `Comment.astro`）
- `base.scss` — 配色变量体系（本站用 `src/styles/skin.scss` 三套皮肤）
- `build/` — 静态化脚本，本站用 Astro 自带的 `getStaticPaths`
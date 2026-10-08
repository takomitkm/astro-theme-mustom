/**
 * Mustom for Astro — 站点/主题配置
 *
 * 对应原版：
 *   hexo-theme-mustom/_config.yml（主题选项）
 *   vuepress-theme-mustom 的 themeConfig（皮肤/菜单/门户/评论等）
 *
 * 改完这里即可换皮，无需动组件。
 */

/**
 * 部署在子路径时（GitHub Pages 的 `/<仓库名>/`）给站内绝对路径加的前缀。
 * 挂在域名根目录（`<user>.github.io` 仓库）时置空字符串即可。
 * astro.config.ts 的 `base` 直接取这里，两边不会走散。
 */
export const basePath = '/astro-theme-mustom';

/** 给站内绝对路径补 base 前缀；外链（http/https/mailto）、协议相对与锚点原样返回 */
export const abs = (p: string): string => {
  if (!p || !p.startsWith('/') || p.startsWith('//')) return p;
  return basePath + p;
};

export const site = {
  /** 部署地址（与 astro.config.ts 的 site 保持一致，RSS/canonical 会用到） */
  url: 'https://takomitkm.github.io/astro-theme-mustom',
  title: 'Mustom',
  author: 'Your Name',
  description: 'Mustom for Astro —— 简约设计的博客主题',
  keywords: 'mustom, astro, blog, theme',
  /** 页脚版权起始年份 */
  startYear: 2026,
  /** 搜索引擎站点验证 meta（frame.ejs 的对应能力；留空不输出） */
  verification: {
    google: '',
    baidu: '',
  },
  /** 额外的 <head> 注入（如广告脚本）；字符串会原样插入 */
  adScript: '',
  /**
   * 静态资源 CDN 前缀（对应 zmfk fork 的 jsdelivr publicPath）。
   * 填 `https://cdn.jsdelivr.net/gh/<user>/<repo>@<branch>` 启用；留空 = 资源走 GitHub Pages 本体。
   * 仓库里的 deploy.yml 会把 dist 同步推到 `cdn` 分支，jsdelivr 镜像的就是它。
   *
   * 演示站留空：_astro/* 全走 CDN 时，jsdelivr 一旦不可达（被墙/超时/新分支尚未同步）
   * 整站 JS 会加载失败、页面完全不可用。主题演示站图的是稳定，自托管更合适；
   * 正式站点仍可填上 CDN。
   */
  cdnPrefix: '',
  /** 界面语言，二选一：['zh-CN'] 或 ['zh-CN', 'en-US']（开启后设置里出现语言切换） */
  languages: ['zh-CN', 'en-US'] as Array<'zh-CN' | 'en-US'>,
  /** 默认皮肤（首次访问生效，之后由访客自己保存的选择接管）：jshine | whiteblack | night */
  defaultSkin: 'whiteblack',
};

/** 首页「近期文章」卡片初始显示条数，之后点“更多文章”按此数追加 */
export const recentPostOffset = 3;

/** 皮肤色板（swatch 的 background，可选渐变）。三套：jshine 彩色 / whiteblack 黑白 / night 夜间 */
export const skins = [
  { name: 'jshine', color: 'linear-gradient(120deg, #ff3300, #cc66ff, #00ccff)' },
  { name: 'whiteblack', color: 'linear-gradient(120deg, #666666, #999999, #333333)' },
  { name: 'night', color: 'linear-gradient(180deg, #000000, #111111, #111111, #222222)' },
] as const;

/** 顶栏左/右两个按钮：门户页 与 搜索 */
export const header = {
  sitename: {
    'zh-CN': 'Mustom <em>for</em> <strong>Astro</strong>',
    'en-US': 'Mustom <em>for</em> <strong>Astro</strong>',
  },
  portal: true,
  search: true,
};

/** 左侧抽屉：名片 */
export const brand = {
  avatar: abs('/images/brand.svg'),
  author: site.author,
  signature: {
    'zh-CN': '简约设计 · 静态优先',
    'en-US': 'Simple design · Static first',
  },
  contacts: [
    { icon: 'github', text: 'GitHub', link: 'https://github.com/your-name' },
    { icon: 'bilibili', text: 'Bilibili', link: 'https://space.bilibili.com/your-bilibili-uid' },
    { icon: 'envelope', text: 'Email', link: 'mailto:you@example.com' },
  ],
};

/** 左侧抽屉：菜单（icon 为 Font Awesome 6 图标名，见 src/components/Icon.astro 映射表）
 *  只保留"没有第二个入口"的那些：分类/标签在右栏 Panel（见 panels），
 *  RSS 在顶栏门户浮层（见 portals），首页入口由顶栏站名承担，这里都不再重复。 */
export const menus = [
  {
    caption: { 'zh-CN': '主菜单', 'en-US': 'MAIN' },
    icon: 'cube',
    items: [
      { text: { 'zh-CN': '归档', 'en-US': 'Archive' }, icon: 'archive', link: abs('/archive/') },
      { text: { 'zh-CN': '关于', 'en-US': 'About' }, icon: 'user', link: abs('/about/') },
      { text: { 'zh-CN': '直播间', 'en-US': 'Live' }, icon: 'video', link: abs('/live/') },
    ],
  },
];

/** 门户页（顶栏左侧按钮展开）：icon 为图片路径；install: true 的项是 PWA 安装按钮 */
export const portals: Array<{
  name: string;
  desc: string;
  link: string;
  icon: string;
  install?: boolean;
}> = [
  {
    name: 'RSS',
    desc: '订阅本站更新',
    link: abs('/rss.xml'),
    icon: abs('/images/portals/rss.svg'),
  },
  {
    name: '安装 App',
    desc: 'PWA · 离线可用',
    link: '',
    icon: abs('/images/pwa-192.png'),
    install: true,
  },
];

/** 一言（首页卡片）：留空 api 则使用 customs；customs 也为空则显示占位语句 */
export const hitokoto = {
  api: 'https://v1.hitokoto.cn',
  type: 'i', // https://developer.hitokoto.cn/sentence/#请求参数
  customs: [] as Array<{ word: string; from: string }>,
  placeholder: { word: '简单，比复杂更难。', from: 'Mustom' },
};

/** B 站 BGM 播放器（右栏；≤1016px 时搬进一言卡片）。歌单格式见 public/data/bili-playlist.json，
 *  维护工具：deno run -A tools/bili_fav_dump.mjs <收藏夹 media_id> && deno run -A tools/bili_playlist_fix.mjs */
export const biliplayer = {
  playlist: abs('/data/bili-playlist.json'),
  countdown: 3,
};

/** /live/ 直播间常驻轮播页的线路：字符串=直连媒体地址（m3u8/mp4），
 *  { embed }=第三方播放器 iframe，{ name, room }=B 站直播间跳板。空数组显示"未配置线路" */
export const liveRoutes: Array<string | { embed: string; name?: string } | { room: string; name?: string }> = [];

/** 划词翻译默认目标语言：'zh' | 'en' | 'jp'（访客上次的选择会记住） */
export const translater = { default: 'zh' } as const;

/** 评论：Giscus（基于 GitHub Discussions）。不想要评论就设为 null */
export const comment: {
  repo: `${string}/${string}`;
  repoId: string;
  category: string;
  categoryId: string;
  mapping: 'pathname' | 'url' | 'title';
} | null = {
  repo: 'your-name/your-repo',
  repoId: '',
  category: 'Announcements',
  categoryId: '',
  mapping: 'pathname',
};

/** 不蒜子访问统计（页脚 pv/uv），不需要设为 false */
export const busuanzi = true;

/** 侧栏：分类/标签云开关 */
export const panels = {
  categories: true,
  tags: true,
};

/** 文章尾部「加我好友」二维码（不需要设为空数组） */
export const qrcodes: Array<{ path: string; text: { 'zh-CN': string; 'en-US': string } }> = [];

/** 许可协议（文章尾部版权块） */
export const license = {
  name: 'BY-NC-SA',
  url: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  badge: abs('/images/by-nc-sa.svg'),
};

/** 本主题署名（页脚） */
export const theme = {
  name: 'Mustom',
  url: 'https://github.com/takomitkm/astro-theme-mustom',
  author: 'takomitkm',
  authorUrl: 'https://github.com/takomitkm',
};

/** 图片资源（可全部换成自己的）；wallpaper 为整站壁纸（html.wallpaper 时半透明纱下可见）
 *  全部经 abs() 补 base 前缀——public/ 下的文件不会被 Astro 自动加前缀 */
export const images = {
  favicon: abs('/images/favicon.svg'),
  appleTouchIcon: abs('/images/brand.svg'),
  avatar: abs('/images/avatar.svg'),
  empty: abs('/images/empty.svg'),
  hitokotoLeft: abs('/images/hitokoto-left.svg'),
  hitokotoRight: abs('/images/hitokoto-right.svg'),
  wallpaper: abs('/images/bg.jpg'),
};

/** 文章默认封面（列表无 cover 时不再显示背景图） */
export const defaultCover = '';

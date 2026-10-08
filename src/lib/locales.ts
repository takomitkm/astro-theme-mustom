/**
 * 界面文案 —— 移植自 vuepress-theme-mustom locales/zh-CN.js、locales/en-US.js
 *（裁剪掉未移植功能的条目；新增 tagpage/catpage）
 */

export const zhCN = {
  sitename: 'Mustom',
  notfound: {
    caption: '404',
    text: '找不到页面 [:path:] 了，或许本来就没有 ๑乛◡乛๑',
  },
  visibilitychange: {
    away: '╭(°A°`)╮ 页面崩溃啦~ ',
    back: '(ฅ>ω<*ฅ) 噫又好了~ ',
  },
  footer: {
    copyright: '© [:start_year:] - [:build_year:] [:author:]',
    powered: '由 [:generator:] 强力驱动',
    themed: '主题 [:theme:] by [:author:]',
    pv: '本站总点击量',
    uv: '本站总访客量',
    wd: '本站文章总字数',
    tipPv: '全站浏览量 PV：第三方服务"不蒜子"按本站地址累计的打开次数，包含你自己打开的次数，无防刷',
    tipUv: '全站独立访客 UV：不蒜子按访客浏览器去重后的数量，换浏览器、清缓存或换网络会被当成新的人',
    tipWd: '全站字数：构建时统计的所有文章正文字数，和访客无关',
    license: '知识共享署名-非商业性使用-相同方式共享 4.0 国际许可协议',
  },
  brand: {
    caption: '狗 ๑乛◡乛๑ 牌',
    pstCount: '文章计数',
    catCount: '分类计数',
    tagCount: '标签计数',
    tipPstCount: '已发布文章总数，构建时统计',
    tipCatCount: '全站用到的分类数，点分类名可进分类页',
    tipTagCount: '全站用到的标签数，点标签名可进标签页',
    bilibili: '通过B站关注我',
  },
  skins: {
    caption: '皮肤',
    names: {
      jshine: '彩色',
      whiteblack: '黑白',
      night: '夜间',
    },
  },
  settings: {
    caption: '设置',
    names: {
      transfigure: '看板娘',
      hideplayer: '隐藏播放器',
      autoplay: '自动播放',
      language: 'English',
    },
  },
  biliplayer: {
    caption: '我的歌单',
    willplay: '即将开始播放我的歌单',
    cancel: '取消自动播放',
    play: '播放',
    prev: '上一首',
    next: '下一首',
    nopause: '无法暂停，关闭后在左栏打开',
  },
  heatmap: {
    caption: '博客废话产量',
    unit: '千字',
    source:
      '做法取自椒盐豆豉<a href="https://blog.douchi.space/hugo-blog-heatmap/" target="_blank">《如何给 Hugo 博客添加热力图》</a>，数据端按本站的 Astro 重写过',
  },
  random: {
    title: '闲逛',
    refresh: '强制刷新',
    refreshing: '正在清除缓存…',
  },
  live: {
    title: '直播间',
  },
  panels: {
    captions: {
      categories: '分类',
      tags: '标签',
    },
  },
  translate: {
    copytip: '点击复制翻译条上方区域高亮内容',
    result: '翻译结果',
  },
  hitokoto: {
    caption: '一言',
  },
  recent: {
    caption: '近期文章',
    more: '更多文章',
  },
  comment: {
    caption: '评论 & 留言 & 骚话',
  },
  timeline: {
    caption: '文章档案',
    yearTotal: '共写有 [:total:] 篇文章',
  },
  tagpage: {
    caption: '标签',
  },
  catpage: {
    caption: '分类',
  },
  article: {
    caption: '页面内容',
    minuteUnit: '[:time:] 分钟',
    hint: '本文总计 [:words:] 字，阅读约需要 [:min:] 分钟',
    viewcount: '本文访问量（不蒜子按本页地址统计）',
    ending: {
      left: '以上文章结束',
      right: '感谢您的阅读',
    },
    friend: {
      text: '请多多留言，您的建议将大大提升我的创作质量！',
      button: '加我好友',
    },
    license: {
      author: '本文作者:',
      link: '本文链接:',
      copyright: '版权声明:',
      notice: {
        name: 'BY-NC-SA',
        text: '本站所有文章除特别声明外，均采用 [:license:] 许可协议。转载请注明出处！',
      },
    },
    prev: '上一篇: ',
    next: '下一篇: ',
    readmode: {
      open: '开启阅读模式',
      close: '关闭阅读模式',
    },
  },
  toc: {
    caption: '目录',
  },
} as const;

export const enUS = {
  sitename: 'Mustom',
  notfound: {
    caption: '404',
    text: 'Page [:path:] not found.',
  },
  visibilitychange: {
    away: '╭(°A°`)╮ Opps, page crashes~ ',
    back: '(ฅ>ω<*ฅ) Eh, restore again~ ',
  },
  footer: {
    copyright: '© [:start_year:] - [:build_year:] [:author:]',
    powered: 'Powered by [:generator:]',
    themed: 'Theme [:theme:] by [:author:]',
    pv: 'Site total page views',
    uv: 'Site total visitors',
    wd: 'Site total word count',
    tipPv: 'Site PV: counted by busuanzi (a third-party counter) per site URL, including your own visits, no anti-spam',
    tipUv: 'Site UV: deduplicated by visitor browser; a new browser, cleared cache or new network counts as a new visitor',
    tipWd: 'Site words: counted at build time from all posts, unrelated to visitors',
    license: 'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International license',
  },
  brand: {
    caption: 'CARD',
    pstCount: 'Count of Posts',
    catCount: 'Count of Categories',
    tagCount: 'Count of Tags',
    tipPstCount: 'Total published posts, counted at build time',
    tipCatCount: 'Categories used across the site; click a name to open it',
    tipTagCount: 'Tags used across the site; click a name to open it',
    bilibili: 'Follow me on Bilibili',
  },
  skins: {
    caption: 'SKIN',
    names: {
      jshine: 'JShine',
      whiteblack: 'Monochrome',
      night: 'Night',
    },
  },
  settings: {
    caption: 'SETTINGS',
    names: {
      transfigure: 'Live2D Widget',
      hideplayer: 'Hide Player',
      autoplay: 'Autoplay',
      language: '简体中文',
    },
  },
  biliplayer: {
    caption: 'PLAYLIST',
    willplay: 'The playlist is about to play',
    cancel: 'Cancel autoplay',
    play: 'Play',
    prev: 'Prev',
    next: 'Next',
    nopause: "It can't be paused — reopen it from the left panel after closing",
  },
  heatmap: {
    caption: 'WAFFLE OUTPUT',
    unit: 'k chars',
    source:
      'Adapted from 椒盐豆豉 <a href="https://blog.douchi.space/hugo-blog-heatmap/" target="_blank">"How to add a heatmap to a Hugo blog"</a>, data side rewritten for this site',
  },
  random: {
    title: 'Feeling lucky',
    refresh: 'Hard refresh',
    refreshing: 'Clearing caches…',
  },
  live: {
    title: 'LIVE',
  },
  panels: {
    captions: {
      categories: 'CATEGORIES',
      tags: 'TAGS',
    },
  },
  translate: {
    copytip: 'Click to copy the highlighted content above the translation bar',
    result: 'Translation Result',
  },
  hitokoto: {
    caption: 'HITOKOTO',
  },
  recent: {
    caption: 'RECENT POSTS',
    more: 'MORE POSTS',
  },
  comment: {
    caption: 'COMMENTS',
  },
  timeline: {
    caption: 'POST ARCHIVE',
    yearTotal: 'have [:total:] posts written this year',
  },
  tagpage: {
    caption: 'TAG',
  },
  catpage: {
    caption: 'CATEGORY',
  },
  article: {
    caption: 'PAGE CONTENT',
    minuteUnit: '[:time:] min.',
    hint: 'This post has [:words:] characters, takes about [:min:] min. to read',
    viewcount: 'Page views (busuanzi, per URL)',
    ending: {
      left: 'The post above ended',
      right: 'Thanks for your reading',
    },
    friend: {
      text: 'Come on! Write some comments, and your suggestions will improve the quality of my creative!',
      button: 'FRIEND ME',
    },
    license: {
      author: 'Post Author:',
      link: 'Post Link:',
      copyright: 'Copyright Notice:',
      notice: {
        name: 'BY-NC-SA',
        text: 'All articles/posts in this website are licensed under [:license:] unless stating additionally.',
      },
    },
    prev: 'Older Post: ',
    next: 'Newer Post: ',
    readmode: {
      open: 'Enable Read Mode',
      close: 'Disable Read Mode',
    },
  },
  toc: {
    caption: 'TABLE OF CONTENTS',
  },
} as const;

export type Locale = typeof zhCN;

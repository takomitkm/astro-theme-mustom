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
      skeuotop: '滚动导航拟物化',
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
  detect: {
    games: '小游戏',
    play: '开始',
    soon: '未上线',
    sentinel: '判定哨兵',
    sentinelSoon: '自检样本，不上线',
    sentinelWhy: '这条不是游戏：它只负责把某一个判定态钉在页面上，改过判据后拿它对照有没有改坏。',
    intro: '下面的标记由你当前这个浏览器现场测出，不点开游戏就能知道缺哪一样。',
    badge: {
      unknown: '判不了',
      blocked: '不支持',
      site: '站点限制',
      notListed: '未登记',
    },
    tier: '开屏档位',
    tierNames: {
      full: '完整',
      reduced: '精简',
      static: '静态',
      skip: '跳过',
    },
    check: {
      caption: '设备与内核检测',
      intro:
        '这一页把本站探针读到的东西全部摊开。读数只待在你这个标签页里（sessionStorage），关掉就没，不发请求。唯一写进本地长期存档的是一个"开屏已播过"的时间戳（跟皮肤、语言那份偏好存在一起），读数本身不落盘。',
      run: '重新检测',
      running: '检测中…',
      bench: '跑一次开屏基准',
      copying: '已复制',
      copy: '复制 JSON',
      clear: '清除会话缓存',
      cleared: '已清除，刷新页面重测',
      replay: '重播开屏',
      replayed: '已解锁，刷新页面即可看到开屏',
      seen: '开屏已播过',
      notSeen: '开屏还没播过',
      cached: '本会话已有读数',
      noCache: '本会话还没有读数',
      asyncPending: '异步读数还没补齐（WebGPU、高熵 UA、配额、电池）',
      asyncDone: '异步读数已补齐',
      sections: {
        summary: '结论',
        engine: '内核',
        host: '设备与连接',
        ctx: '站点上下文',
        prefs: '访客偏好',
        es: '语言与运行时',
        apis: 'API 存在性',
        wasm: 'WebAssembly 特性',
        webgl: 'WebGL',
        webgpu: 'WebGPU',
        media: '编解码与音频',
        splash: '开屏分级',
        games: '小游戏判定',
        notes: '探针备注',
        raw: '原始 JSON',
      },
      gradeHint: '灰底＝这个内核没有这条通道，属内核限制；红字＝实测为不支持。',
      noGpuName:
        'GPU 型号字符串（adapter.info 与 WEBGL_debug_renderer_info）由浏览器自行裁量，空白不代表设备没有显卡，别据此下结论。',
      threadsHint:
        '跨域隔离要服务器发 COOP + COEP 两个响应头。GitHub Pages 设不了，迁到能设头的托管后这一条自动转绿。',
    },
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
      skeuotop: 'Skeuomorphic scroll nav',
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
  detect: {
    games: 'Mini games',
    play: 'Play',
    soon: 'Not shipped',
    sentinel: 'SELF-CHECK',
    sentinelSoon: 'Sample entry, never shipped',
    sentinelWhy:
      'This one is not a game: it exists to pin one verdict state on the page, so a broken rule shows up as a changed colour here.',
    intro:
      'The marks below are measured live by this browser. Missing capabilities show up before you open anything.',
    badge: {
      unknown: 'UNKNOWN',
      blocked: 'UNSUPPORTED',
      site: 'HOSTING LIMIT',
      notListed: 'NOT LISTED',
    },
    tier: 'Splash tier',
    tierNames: {
      full: 'Full',
      reduced: 'Reduced',
      static: 'Static',
      skip: 'Skipped',
    },
    check: {
      caption: 'Device & engine check',
      intro:
        'This page lays out everything the probe read. The numbers stay in this tab only (sessionStorage) and vanish when you close it — no requests. The only thing written to long-lived local storage is a "splash already shown" timestamp, kept with your skin and language preferences; the readings themselves are never stored.',
      run: 'Re-run',
      running: 'Probing…',
      bench: 'Run splash benchmark',
      copying: 'Copied',
      copy: 'Copy JSON',
      clear: 'Clear session cache',
      cleared: 'Cleared — reload to probe again',
      replay: 'Replay splash',
      replayed: 'Unlocked — reload to see the splash',
      seen: 'Splash already shown',
      notSeen: 'Splash not shown yet',
      cached: 'Readings cached for this session',
      noCache: 'No readings cached yet this session',
      asyncPending: 'Async readings still pending (WebGPU, high-entropy UA, quota, battery)',
      asyncDone: 'Async readings complete',
      sections: {
        summary: 'Summary',
        engine: 'Engine',
        host: 'Device & network',
        ctx: 'Site context',
        prefs: 'Visitor preferences',
        es: 'Language & runtime',
        apis: 'API presence',
        wasm: 'WebAssembly features',
        webgl: 'WebGL',
        webgpu: 'WebGPU',
        media: 'Codecs & audio',
        splash: 'Splash grading',
        games: 'Game verdicts',
        notes: 'Probe notes',
        raw: 'Raw JSON',
      },
      gradeHint:
        'Grey = this engine exposes no such channel (an engine limit, not your hardware). Red = measured and unsupported.',
      noGpuName:
        'GPU name strings (adapter.info, WEBGL_debug_renderer_info) are at the browser’s discretion. Empty does not mean the device has no GPU — never branch on them.',
      threadsHint:
        'Cross-origin isolation needs COOP + COEP response headers. GitHub Pages cannot send them; move to a host that can and this line turns green by itself.',
    },
  },
} as const;

export type Locale = typeof zhCN;

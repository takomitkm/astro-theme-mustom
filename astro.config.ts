import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import AstroPWA from '@vite-pwa/astro';
import icon from 'astro-icon';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { remarkPangu } from './src/markdown/remark-pangu';
import { rehypeLazyImages } from './src/markdown/rehype-lazy-images';
import { rehypeHeadingNumbers } from './src/markdown/rehype-heading-numbers';
import { site, basePath } from './src/config';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Mustom for Astro — static output, GitHub Pages ready.
// `site` must be changed to your final deployment URL.
const stylesDir = fileURLToPath(new URL('./src/styles', import.meta.url));

// 把设计令牌自动注入每个 SCSS 编译单元（对应 VuePress 对 palette.styl 的全局注入）
function injectScssVars(source: string, id: string): string {
  const p = id.split('?')[0].replace(/\\/g, '/');
  if (p.endsWith('/styles/vars.scss')) return source;
  const dir = p.slice(0, p.lastIndexOf('/'));
  const rel = relative(dir, stylesDir).split('\\').join('/') || '.';
  const usePath = rel === '.' ? './vars' : `${rel}/vars`;
  return `@use '${usePath}' as *;\n${source}`;
}

export default defineConfig({
  site: site.url,
  // 仓库名不是 <user>.github.io，Pages 会挂在 /<仓库名>/ 子路径下，
  // base 必须与 src/config.ts 的 basePath 一致，站内绝对路径靠 abs() 补前缀
  base: basePath || undefined,
  output: 'static',
  trailingSlash: 'ignore',
  // 悬停预取链接：MPA 下逼近原 SPA 的换页手感
  prefetch: { prefetchAll: true },
  integrations: [
    sitemap(),
    icon({
      include: {
        'fa6-solid': ['*'],
        'fa6-regular': ['*'],
        'fa6-brands': ['*'],
        'simple-icons': ['bilibili'],
      },
    }),
    AstroPWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['robots.txt', 'images/*'],
      manifest: {
        name: site.title,
        short_name: site.title,
        description: site.description,
        lang: 'zh-CN',
        start_url: `${basePath}/`,
        scope: basePath || '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#000000',
        background_color: '#ffffff',
        icons: [
          { src: `${basePath}/images/pwa-192.png`, sizes: '192x192', type: 'image/png' },
          { src: `${basePath}/images/pwa-512.png`, sizes: '512x512', type: 'image/png' },
          {
            src: `${basePath}/images/pwa-512-maskable.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // 站点全量预缓存；离线导航兜底回首页
        navigateFallback: `${basePath}/index.html`,
        navigateFallbackDenylist: [
          new RegExp(`^${basePath}/api/`),
          new RegExp(`^${basePath}/rss\\.xml$`),
          new RegExp(`^${basePath}/sitemap`),
          new RegExp(`^${basePath}/pagefind`),
        ],
        runtimeCaching: [
          {
            // 一言：网络优先，短超时，旧响应兜底
            urlPattern: ({ url }) => url.hostname.endsWith('hitokoto.cn'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'hitokoto',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 20, maxAgeSeconds: 24 * 3600 },
            },
          },
          {
            // 不蒜子：计数器只走网络（对应原版 sw 的 networkOnly 策略）
            urlPattern: ({ url }) => url.hostname.includes('busuanzi'),
            handler: 'NetworkOnly',
          },
          {
            // B 站播放器/图片域名：iframe 自己管缓存，SW 不得拦截（Hexo fork 白名单）
            urlPattern: ({ url }) =>
              /(^|\.)bilibili\.com$/.test(url.hostname) ||
              /(^|\.)(bilivideo|hdslb)\.com$/.test(url.hostname),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  markdown: {
    // 盘古之白（数学/代码节点跳过）；公式走 KaTeX
    remarkPlugins: [remarkMath, remarkPangu],
    // 标题锚点 ¶（对应 VuePress 的 header-anchor）；Astro 已给标题生成 id，slug 幂等
    rehypePlugins: [
      rehypeKatex,
      rehypeLazyImages,
      rehypeSlug,
      rehypeHeadingNumbers,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'prepend',
          content: { type: 'text', value: '#' },
          properties: { className: 'header-anchor', 'aria-hidden': 'true', tabIndex: -1 },
        },
      ],
    ],
    // 双主题代码高亮：nightshift 时切换到暗色变量
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: 'light',
      wrap: true,
    },
  },
  build: {
    inlineStylesheets: 'auto',
    // jsdelivr CDN 分发（对应 zmfk fork 的 publicPath）：只在 CI（部署）构建时启用——
    // dist 推到 cdn 分支的动作也在同一次 CI 里，本地构建/预览永远走本站本体，
    // 否则样式指向一个还不存在的 CDN 分支会整页裸奔。
    // 手动想出一份 CDN 构建时：FORCE_CDN=1 npm run build
    assetsPrefix:
      process.env.CI || process.env.FORCE_CDN ? site.cdnPrefix || undefined : undefined,
  },
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          // biome-ignore lint/suspicious/noExplicitAny: Vite 的 additionalData 函数签名
          additionalData: injectScssVars as never,
        },
      },
    },
  },
});

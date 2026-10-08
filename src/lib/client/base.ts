/**
 * 客户端取 base 前缀的小工具。
 *
 * 为什么不在这里直接 import src/config.ts 的 abs()：那个模块连带 locales 全量文案，
 * 会被打进每个客户端 chunk。而 `import.meta.env.BASE_URL` 由 Vite 在构建期替换成
 * 字面量，零体积。
 *
 * 另外实测 Astro 给的 BASE_URL **不带**尾斜杠（base='/astro-theme-mustom' → '/astro-theme-mustom'），
 * 所以拼路径必须自己补 '/'，否则会拼出 '/astro-theme-mustomapi/...'。
 */
const RAW = import.meta.env.BASE_URL ?? '/';

/** 去掉尾斜杠的 base，根部署时为空串 */
export const base = RAW.replace(/\/+$/, '');

/** 给站内绝对路径补 base 前缀；外链与锚点原样返回 */
export function abs(p: string): string {
  if (!p || !p.startsWith('/') || p.startsWith('//')) return p;
  return base + p;
}
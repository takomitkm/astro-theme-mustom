/**
 * 客户端运行时配置 —— 由 Base 布局以 <script type="application/json" id="mustom-config">
 * 注入，构建期生成，等价于原版 themeConfig 在 Vue 原型上的暴露。
 */

export interface MustomClientConfig {
  defaultSkin: string;
  busuanzi: boolean;
  searchMax: number;
  hitokoto: {
    api: string;
    type: string;
    customs: Array<{ word: string; from: string }>;
    placeholder: { word: string; from: string };
  };
  strings: {
    notfound: { 'zh-CN': string; 'en-US': string };
    visibilitychange: { away: { 'zh-CN': string; 'en-US': string }; back: { 'zh-CN': string; 'en-US': string } };
  };
}

let cached: MustomClientConfig | null = null;

export function mustomConfig(): MustomClientConfig {
  if (cached) return cached;
  const el = document.getElementById('mustom-config');
  try {
    cached = JSON.parse(el?.textContent || '{}') as MustomClientConfig;
  } catch {
    cached = {} as MustomClientConfig;
  }
  return cached!;
}

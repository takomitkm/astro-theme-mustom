/**
 * 杂项 —— 404 页面的 [:path:] 替换（对应 404.vue computed text）。
 */
import { mustomConfig } from './config';

export function init404(): void {
  const el = document.querySelector<HTMLElement>('.NotFound .inner .path');
  if (!el) return;
  const { notfound } = mustomConfig().strings;
  const isEn = document.documentElement.classList.contains('lang-en');
  const text = (isEn ? notfound['en-US'] : notfound['zh-CN']).replace(
    '[:path:]',
    window.location.pathname,
  );
  el.textContent = text;
}

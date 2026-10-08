/**
 * 状态动作 —— 对应 vuepress-theme-mustom stores/*.js（Vuex）+ mixins 中的 mustom$* 方法。
 * MPA 下没有跨页面的 store，真相源就是 <html> 上的类名 + localStorage，组件间用事件同步。
 */
import { patchSave, getSave } from './storage';

const html = () => document.documentElement;

export const isMobileUA = () =>
  /(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i.test(
    window.navigator.userAgent,
  );

export const currentSkin = () =>
  [...html().classList].find((c) => c.startsWith('skin-'))?.slice(5) ?? 'jshine';

/* ---------- 皮肤（stores/skin.js） ---------- */
export function setSkin(name: string): void {
  for (const c of [...html().classList]) {
    if (c.startsWith('skin-')) html().classList.remove(c);
  }
  html().classList.add(`skin-${name}`);
  patchSave({ skin: name });
  document.dispatchEvent(new CustomEvent('mustom:skin', { detail: name }));
  syncSkinUI();
}

/* ---------- 看板娘开关（Hexo settings.transfigure → NO_LIVE2D） ---------- */
export function toggleLive2d(): boolean {
  const off = html().classList.toggle('NO_LIVE2D');
  patchSave({ noLive2d: off });
  syncSettingsUI();
  return off;
}

/* ---------- 隐藏播放器（Hexo settings.hideplayer） ---------- */
export function togglePlayer(): boolean {
  const hide = html().classList.toggle('hide-player');
  patchSave({ hidePlayer: hide });
  document.dispatchEvent(new CustomEvent('mustom:player', { detail: hide }));
  syncSettingsUI();
  return hide;
}

/* ---------- 播放器自动播放（Hexo settings.autoplay） ---------- */
export function toggleAutoplay(): boolean {
  const on = !getSave().autoplay || false;
  patchSave({ autoplay: on });
  document.dispatchEvent(new CustomEvent('mustom:autoplay', { detail: on }));
  syncSettingsUI();
  return on;
}

/* ---------- 语言（stores/lang.js swapLang） ---------- */
export function swapLang(): void {
  const en = html().classList.toggle('lang-en');
  html().lang = en ? 'en-US' : 'zh-CN';
  patchSave({ lang: en ? 'en-US' : 'zh-CN' });
  // 通知 Giscus 等组件热切换语言
  document.dispatchEvent(new CustomEvent('mustom:lang', { detail: en ? 'en-US' : 'zh-CN' }));
  syncSettingsUI();
}

/* ---------- Ext 浮层（stores/ext.js：portal / search） ---------- */
export type ExtName = '' | 'portal' | 'search';

export function currentExt(): ExtName {
  if (html().classList.contains('ext-portal')) return 'portal';
  if (html().classList.contains('ext-search')) return 'search';
  return '';
}

export function setExt(name: ExtName): void {
  const next = currentExt() === name ? '' : name;
  html().classList.toggle('ext-portal', next === 'portal');
  html().classList.toggle('ext-search', next === 'search');
  for (const btn of document.querySelectorAll<HTMLElement>('[data-ext]')) {
    btn.classList.toggle('active', btn.dataset.ext === next);
  }
  if (next === 'search') {
    document.querySelector<HTMLInputElement>('.Ext .Search input')?.focus();
  }
}

/* ---------- 左右栏折叠（Hexo 版 xdrawer/xaside：每侧一个总开关） ---------- */
export function toggleCollapse(side: 'drawer' | 'aside'): void {
  const cls = side === 'drawer' ? 'close-drawer' : 'close-aside';
  const on = html().classList.toggle(cls);
  patchSave(side === 'drawer' ? { closeDrawer: on } : { closeAside: on });
  for (const btn of document.querySelectorAll<HTMLElement>(`[data-collapse="${side}"]`)) {
    btn.classList.toggle('active', on);
  }
}

/* ---------- UI 状态回写（Settings/Skin 的高亮） ---------- */
export function syncSettingsUI(): void {
  const rows = document.querySelectorAll<HTMLElement>('.Settings [data-setting]');
  for (const row of rows) {
    const name = row.dataset.setting;
    let checked = false;
    if (name === 'transfigure') checked = !html().classList.contains('NO_LIVE2D');
    else if (name === 'hideplayer') checked = html().classList.contains('hide-player');
    else if (name === 'autoplay') checked = !!getSave().autoplay || getSave().autoplay === undefined;
    else if (name === 'language') checked = html().classList.contains('lang-en');
    row.classList.toggle('active', checked);
  }
}

export function syncSkinUI(): void {
  const skin = currentSkin();
  for (const el of document.querySelectorAll<HTMLElement>('.Skin [data-skin]')) {
    el.classList.toggle('active', el.dataset.skin === skin);
  }
}

/* ---------- 滚动（mixins mustom$Scroll2Top/Bottom） ---------- */
export function scroll2Top(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
export function scroll2Bottom(): void {
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

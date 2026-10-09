/**
 * 全站交互接线 —— 对应原版 mixins/index.js 的全局方法与 GlobalLayout.vue 的 mounted 逻辑：
 *   卡片最小化（mustom$ToggleMinimize）、回到顶部/底部（Goingto）、
 *   设置项与皮肤、顶栏 Ext 开关、阅读模式、好友二维码、搜索热键、
 *   标签页标题彩蛋（visibilitychange）。
 */
import { initLayout } from './layout';
import { getSave, patchSave } from './storage';
import {
  setExt,
  setSkin,
  toggleCollapse,
  toggleLive2d,
  togglePlayer,
  toggleAutoplay,
  toggleSkeuoTop,
  swapLang,
  scroll2Top,
  scroll2Bottom,
  syncSettingsUI,
  syncSkinUI,
  currentExt,
} from './actions';
import { mustomConfig } from './config';
import mediumZoom from 'medium-zoom';
import { clampExcerpts } from './clamp';
import { initDividers } from './divider';

/** 卡片最小化（逐行对应 mustom$ToggleMinimize）
 *  带 data-mini-id 的卡片折叠状态会写进 localStorage，任意页面进来都保持原样。 */
function toggleMinimize(card: HTMLElement | null): void {
  if (!card) return;
  // 折叠类是在 setTimeout 里加的，此刻还没生效，所以先把目标状态算出来再存档
  const willBeMini = !card.classList.contains('mini');
  if (willBeMini) {
    card.style.height = card.offsetHeight + 'px';
    window.setTimeout(() => {
      card.classList.add('mini');
    }, 0);
  } else {
    card.classList.remove('mini');
    window.setTimeout(() => {
      card.style.height = 'auto';
    }, 200);
  }
  persistMini(card, willBeMini);
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent('mustom:resize'));
  }, 200);
}

/** 把某张卡的折叠状态记进存档（无 data-mini-id 的卡片不记） */
function persistMini(card: HTMLElement, isMini: boolean): void {
  const id = card.dataset.miniId;
  if (!id) return;
  const set = new Set(getSave().mini ?? []);
  isMini ? set.add(id) : set.delete(id);
  patchSave({ mini: [...set] });
}

/** 首帧后把存档里的折叠状态还原到当前页对应的卡片 */
export function restoreMini(): void {
  const ids = getSave().mini ?? [];
  if (!ids.length) return;
  document.querySelectorAll<HTMLElement>('.card[data-mini-id]').forEach((card) => {
    if (ids.includes(card.dataset.miniId ?? '')) {
      // 直接挂 .mini，不走动画（避免页面刚进来就抖一下）
      card.classList.add('mini');
    }
  });
  window.dispatchEvent(new CustomEvent('mustom:resize'));
}

/** 好友二维码展开/收起（Article.vue friend()） */
function toggleQrcode(): void {
  const qrcode = document.querySelector<HTMLElement>('.Article .qrcode');
  if (!qrcode) return;
  if (qrcode.classList.contains('mini')) {
    qrcode.classList.remove('mini');
    window.setTimeout(() => {
      qrcode.style.height = 'auto';
    }, 200);
  } else {
    qrcode.style.height = qrcode.offsetHeight + 'px';
    window.setTimeout(() => {
      qrcode.classList.add('mini');
    }, 0);
  }
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent('mustom:resize'));
  }, 200);
}

/** 标签页标题彩蛋（GlobalLayout setVisibilitychange） */
function initVisibilityChange(): void {
  const { visibilitychange } = mustomConfig().strings;
  if (!visibilitychange) return;
  let origin = '';
  let timer = 0;
  const isEn = () => document.documentElement.classList.contains('lang-en');
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      origin = document.title;
      document.title = (isEn() ? visibilitychange.away['en-US'] : visibilitychange.away['zh-CN']) + origin;
      window.clearTimeout(timer);
    } else {
      document.title = (isEn() ? visibilitychange.back['en-US'] : visibilitychange.back['zh-CN']) + origin;
      timer = window.setTimeout(() => {
        document.title = origin;
      }, 1000);
    }
  });
}

function doSetting(name: string | undefined): void {
  switch (name) {
    case 'transfigure':
      toggleLive2d();
      break;
    case 'hideplayer':
      togglePlayer();
      break;
    case 'autoplay':
      toggleAutoplay();
      break;
    case 'skeuotop':
      toggleSkeuoTop();
      break;
    case 'language':
      swapLang();
      break;
  }
}

export function initGlobal(): void {
  initLayout();
  initDividers();
  clampExcerpts();
  syncSettingsUI();
  syncSkinUI();
  restoreMini();

  // 左右栏折叠按钮初始态（boot 脚本已按存档恢复 <html> 类）
  for (const btn of document.querySelectorAll<HTMLElement>('[data-collapse]')) {
    btn.classList.toggle(
      'active',
      document.documentElement.classList.contains(`close-${btn.dataset.collapse}`),
    );
  }

  /* ---------- 图片点击放大（对应 vuepress-plugin-zooming → medium-zoom） ---------- */
  mediumZoom('.markdown-body img', {
    background: '#000000ee',
    margin: 24,
  });

  /* ---------- 事件委托：卡片最小化 ---------- */
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    // 主菜单当前页：点了也不动（避免同页重载/回顶）
    if (target.closest?.('.Menu a.active')) {
      e.preventDefault();
      return;
    }
    const path = (e.composedPath?.() ?? []) as EventTarget[];
    const minimize = target.closest?.('.minimize');
    if (minimize && !minimize.matches('.Ext *')) {
      // 用 closest('.card') 而不是 path[1]：热力图的折叠按钮嵌在标题行里，
      // path[1] 拿到的是 .hm-caption，会把折叠挂到标题上而不是整张卡
      const card = minimize.closest<HTMLElement>('.card') ?? (path[1] as HTMLElement | null);
      toggleMinimize(card);
      return;
    }
    const going = target.closest('.Goingto');
    if (going) {
      if (target.closest('.top')) scroll2Top();
      else if (target.closest('.bottom')) scroll2Bottom();
      return;
    }
    // 页脚计数气泡：触屏没有 hover，点一下切 .on（与热力图出处同一套做法）
    const countItem = target.closest<HTMLElement>(
      '.Footer .count-item, .Heatmap .hm-caption, .Brand .counter .count-item',
    );
    if (countItem) {
      const opened = countItem.classList.contains('on');
      document
        .querySelectorAll('.Footer .count-item.on, .Heatmap .hm-caption.on')
        .forEach((o) => o.classList.remove('on'));
      !opened && countItem.classList.add('on');
      return;
    }
    if (target.closest('.Settings [data-setting]')) {
      const row = target.closest<HTMLElement>('.Settings [data-setting]');
      doSetting(row?.dataset.setting);
      return;
    }
    const skin = target.closest<HTMLElement>('.Skin [data-skin]');
    if (skin?.dataset.skin) {
      setSkin(skin.dataset.skin);
      return;
    }
    const collapse = target.closest<HTMLElement>('[data-collapse]');
    if (collapse?.dataset.collapse) {
      toggleCollapse(collapse.dataset.collapse as 'drawer' | 'aside');
      return;
    }
    const extBtn = target.closest<HTMLElement>('[data-ext]');
    if (extBtn?.dataset.ext) {
      setExt(extBtn.dataset.ext as 'portal' | 'search');
      return;
    }
    if (target.closest('.Article .readmode')) {
      document.documentElement.classList.toggle('readmode');
      return;
    }
    if (target.closest('.Article .friend .button')) {
      toggleQrcode();
      return;
    }
  });

  /* ---------- 键盘：Esc 关浮层；s / / 唤起搜索 ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (currentExt() !== '') setExt(currentExt());
      return;
    }
    const onBody = (e.target as HTMLElement | null)?.matches?.('body');
    if (onBody && (e.key === 's' || e.key === '/')) {
      if (currentExt() !== 'search') setExt('search');
      document.querySelector<HTMLInputElement>('.Ext .Search input')?.focus();
      e.preventDefault();
    }
  });

  initVisibilityChange();
}

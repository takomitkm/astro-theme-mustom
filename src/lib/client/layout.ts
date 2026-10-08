/**
 * 布局同步 —— 移植自 vuepress-theme-mustom GlobalLayout.vue 的 onResize/onScroll：
 *   - 桌面端 Drawer/Aside 是 fixed 满高容器，随窗口滚动做“差速”滚动
 *   - main 的 min-height 按 Drawer/Aside 实际高度放大，保证滚动到底时侧栏也走完
 *   - 文章页 TOC scrollspy（原逻辑通过 router.replace 换 hash，这里改为高亮链接）
 */

const SCROLL_DIFF = 1.2;
const HEADER_OFFSET = 80; // 64px header + 16px 1rem
const SPY_WINDOW = 160; // (64px + 16px) * 2

export function initLayout(): void {
  const drawer = document.querySelector<HTMLElement>('.Drawer');
  const aside = document.querySelector<HTMLElement>('.Aside');
  const main = document.querySelector<HTMLElement>('.GlobalLayout .main');
  if (!main) return;
  const mainEl = main; // 函数声明会提升，闭包内不保留窄化，取一次非空别名

  const width = () => window.innerWidth;

  function onResize(): void {
    if (width() > 1328) {
      // 与原版一致：等价于 $smallWidth（手工校准）
      const drawerHeight = (drawer?.scrollHeight ?? 0) * SCROLL_DIFF;
      const asideHeight = (aside?.scrollHeight ?? 0) * SCROLL_DIFF;
      mainEl.style.minHeight = Math.max(drawerHeight, asideHeight) + 'px';
    } else if (width() > 1080) {
      const asideHeight = (aside?.scrollHeight ?? 0) * SCROLL_DIFF;
      mainEl.style.minHeight = asideHeight + 'px';
    } else {
      mainEl.style.minHeight = '100vh';
    }
    onScroll();
  }

  function scrollToSync(el: HTMLElement | null, y: number): void {
    el?.scrollTo(0, y);
  }

  /* ---------- TOC scrollspy ---------- */
  interface SpyTarget {
    a: HTMLAnchorElement;
    top: number;
  }
  let spyTargets: SpyTarget[] = [];

  function wrapHeaderElements(): void {
    spyTargets = [];
    for (const a of document.querySelectorAll<HTMLAnchorElement>('.Toc a[href^="#"]')) {
      const id = decodeURIComponent(a.hash.slice(1));
      const el = document.getElementById(id);
      if (!el) continue;
      spyTargets.push({ a, top: el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET });
    }
  }

  function onScroll(): void {
    if (drawer) {
      scrollToSync(drawer, window.scrollY / (SCROLL_DIFF + (drawer.scrollHeight * (SCROLL_DIFF - 1)) / drawer.scrollHeight));
    }
    if (aside) {
      scrollToSync(aside, window.scrollY / (SCROLL_DIFF + (aside.scrollHeight * (SCROLL_DIFF - 1)) / aside.scrollHeight));
    }
    if (spyTargets.length) {
      let active: SpyTarget | null = null;
      for (const t of spyTargets) {
        if (t.top >= window.scrollY && t.top < window.scrollY + window.innerHeight - SPY_WINDOW) {
          active = t;
          break;
        }
      }
      for (const t of spyTargets) t.a.classList.toggle('active', t === active);
    }
  }

  wrapHeaderElements();
  window.addEventListener('resize', onResize);
  document.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('mustom:resize', onResize);
  window.addEventListener('load', wrapHeaderElements);
  window.setTimeout(onResize, 300);
}

/**
 * 分隔符 —— 移植自 Hexo fork main.js 的 fitDividers：
 * "✟⫘…⫘✟" 的 ⫘ 个数按各自容器的行宽重算，写进 --divider 给 CSS content 用。
 * 量不到（容器没行/宽度为 0）就留着样式里的默认串。
 *
 * 为什么逐个元素算：--divider 原先只写在 .center 上一个值，全站共用。
 * 但列表栏（~1100px）和文章阅读栏（窄得多）宽度差出一倍，同一个串放不下，
 * 文章末尾那条会被 overflow:hidden 从中间截断、右端不是干净的 ✟。
 * 所以改成按目标各自测量、写到各自元素上（内联样式会盖过从 .center 继承的值）。
 */
const DIVIDER_MARK = '✟';
const DIVIDER_FILL = '⫘';

export function fitDividers(): void {
  const content = document.querySelector<HTMLElement>('.GlobalLayout .center');
  if (!content) return;
  const num = (v: string) => parseFloat(v) || 0;

  // 量宽要用分隔符自己的样式（伪元素/元素上还有 font-size、letter-spacing），
  // 照容器的字号量会把 ⫘ 算窄，实际渲染就顶不满栏。
  const probe = document.createElement('span');
  probe.style.cssText =
    'position:fixed;left:-9999px;top:0;visibility:hidden;white-space:nowrap';
  document.body.appendChild(probe);

  /** 按给定样式量出能塞进 room 的分隔符串，写到 target 的 --divider 上 */
  const fit = (target: HTMLElement, room: number, st: CSSStyleDeclaration): void => {
    if (!(room > 0)) return;
    probe.style.fontFamily = st.fontFamily;
    probe.style.fontSize = st.fontSize;
    probe.style.fontWeight = st.fontWeight;
    probe.style.fontStyle = st.fontStyle;
    probe.style.letterSpacing = st.letterSpacing;
    const measure = (text: string): number => {
      probe.textContent = text;
      return probe.getBoundingClientRect().width;
    };
    const make = (n: number): string => DIVIDER_MARK + DIVIDER_FILL.repeat(n) + DIVIDER_MARK;
    const unit = measure(DIVIDER_FILL);
    if (!(unit > 0) || !(room > measure(make(1)))) return;
    let n = Math.max(1, Math.floor(room / unit) - 2);
    while (n > 1 && measure(make(n)) > room) n--;
    while (measure(make(n + 1)) <= room) n++;
    const text = JSON.stringify(make(n));
    if (target.style.getPropertyValue('--divider') !== text) target.style.setProperty('--divider', text);
  };

  // 列表分隔符：写在 .center 上，列表里的条目从它继承。
  // 横向顶满列表容器（.list 的内容盒），所以按容器量宽即可：
  // 早期版本按条目减掉自身 padding 量，量出来比实际窄一截，⫘ 会少几个。
  content.querySelectorAll<HTMLElement>('.Recent .list, .Timeline .list').forEach((box) => {
    if (content.style.getPropertyValue('--divider')) return; // 只取第一个列表，宽度都一样
    const el = box.querySelector<HTMLElement>('.list-item');
    if (!el) return;
    const bs = window.getComputedStyle(box);
    fit(content, box.clientWidth - num(bs.paddingLeft) - num(bs.paddingRight), window.getComputedStyle(el, '::after'));
  });

  // 文章末尾那条：按它自己所在栏的宽度单独算，写在元素上盖过继承值
  content.querySelectorAll<HTMLElement>('.tail-divider').forEach((el) => {
    const bs = window.getComputedStyle(el);
    fit(el, el.clientWidth - num(bs.paddingLeft) - num(bs.paddingRight), bs);
  });

  probe.remove();
}

export function initDividers(): void {
  fitDividers();
  let timer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(fitDividers, 200);
  });
  window.addEventListener('mustom:resize', fitDividers);
  window.addEventListener('load', fitDividers);
  document.fonts?.ready.then(fitDividers);
}
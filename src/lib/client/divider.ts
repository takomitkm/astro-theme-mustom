/**
 * 列表分隔符 —— 移植自 Hexo fork main.js 的 fitDividers：
 * "✟⫘…⫘✟" 的 ⫘ 个数按正文栏行宽重算，写进 .center 的 --divider 给 CSS content 用。
 * 量不到（列表没行/宽度为 0）就留着样式里的默认串。
 */
const DIVIDER_MARK = '✟';
const DIVIDER_FILL = '⫘';
const DEFAULT_DIVIDER = DIVIDER_MARK + DIVIDER_FILL.repeat(8) + DIVIDER_FILL.repeat(0) + DIVIDER_MARK;

export function fitDividers(): void {
  const content = document.querySelector<HTMLElement>('.GlobalLayout .center');
  if (!content) return;
  const num = (v: string) => parseFloat(v) || 0;
  let row: HTMLElement | null = null;
  let room = 0;
  let refStyle: CSSStyleDeclaration | null = null;

  // 分隔符横向顶满列表容器（.list 的内容盒），所以按容器量宽即可：
  // 早期版本按条目减掉自身 padding 量，量出来比实际窄一截，⫘ 会少几个。
  content.querySelectorAll<HTMLElement>('.Recent .list, .Timeline .list').forEach((box) => {
    if (row) return;
    const el = box.querySelector<HTMLElement>('.list-item');
    if (!el) return;
    const bs = window.getComputedStyle(box);
    const w = box.clientWidth - num(bs.paddingLeft) - num(bs.paddingRight);
    if (w <= 0) return;
    // 量宽要用分隔符自己的样式，不是条目的：伪元素上还有 font-size:.85em 和
    // letter-spacing:.15em，照条目的字号量会把 ⫘ 算窄，实际渲染就顶不满栏。
    refStyle = window.getComputedStyle(el, '::after');
    room = w;
    row = el;
  });
  if (!row) return;

  const probe = document.createElement('span');
  probe.style.cssText =
    'position:fixed;left:-9999px;top:0;visibility:hidden;white-space:nowrap';
  const st = refStyle!;
  probe.style.fontFamily = st.fontFamily;
  probe.style.fontSize = st.fontSize;
  probe.style.fontWeight = st.fontWeight;
  probe.style.fontStyle = st.fontStyle;
  probe.style.letterSpacing = st.letterSpacing;
  document.body.appendChild(probe);
  const measure = (text: string) => {
    probe.textContent = text;
    return probe.getBoundingClientRect().width;
  };
  const make = (n: number) => DIVIDER_MARK + DIVIDER_FILL.repeat(n) + DIVIDER_MARK;
  const unit = measure(DIVIDER_FILL);
  if (unit > 0 && room > measure(make(1))) {
    let n = Math.max(1, Math.floor(room / unit) - 2);
    while (n > 1 && measure(make(n)) > room) n--;
    while (measure(make(n + 1)) <= room) n++;
    const text = JSON.stringify(make(n));
    content.style.getPropertyValue('--divider') !== text &&
      content.style.setProperty('--divider', text);
  }
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

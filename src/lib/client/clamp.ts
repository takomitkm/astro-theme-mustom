/**
 * 列表摘要 10 行截断 —— 按访客当前布局实测行数：超过 maxLines 就在末行
 * 删去末尾的部分字符并替换成"……"（二分找能放下的最长前缀，再逐字回退
 * 给"……"腾位置）。窗口 resize / 字体加载完成 / 「更多文章」追加后重跑。
 */
const MAX_LINES = 10;

const SELECTOR = '.Recent .item-excerpt, .Timeline .content-excerpt';

function clampOne(el: HTMLElement): void {
  const style = window.getComputedStyle(el);
  const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 2;
  const target = lineHeight * MAX_LINES;
  if (el.scrollHeight <= target + 1) return;

  const text = el.textContent ?? '';
  // 二分：找能放进 maxLines 行的最长前缀
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    el.textContent = text.slice(0, mid);
    if (el.scrollHeight <= target) lo = mid + 1;
    else hi = mid;
  }
  let k = Math.max(0, lo - 1);
  // 先放"……"，放不下就逐字回退，保证省略号本体也在第 10 行内
  let out = text.slice(0, k).replace(/\s+$/, '') + '……';
  el.textContent = out;
  while (el.scrollHeight > target && k > 0) {
    k -= 1;
    out = text.slice(0, k).replace(/\s+$/, '') + '……';
    el.textContent = out;
  }
}

export function clampExcerpts(): void {
  document.querySelectorAll<HTMLElement>(SELECTOR).forEach(clampOne);
}

export function initClamp(): void {
  clampExcerpts();
  let timer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(clampExcerpts, 200);
  });
  window.addEventListener('mustom:resize', clampExcerpts);
  // 字体切换会改行高，链上几款外链字体加载完成后重跑一次
  document.fonts?.ready.then(clampExcerpts);
}

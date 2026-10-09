/**
 * 一言 —— 对应 mixins mustom$InitHitokoto（utils/ajax.js → fetch）。
 * customs 优先，其次 hitokoto API，最后落回占位语句；失败静默保留占位。
 */
import { mustomConfig } from './config';

export function initHitokoto(): void {
  const card = document.querySelector<HTMLElement>('.Hitokoto');
  if (!card) return;
  const wordEl = card.querySelector<HTMLElement>('.word');
  const fromEl = card.querySelector<HTMLElement>('.from span');
  if (!wordEl || !fromEl) return;

  // 故障风靠 attr(data-text) 取文本，句子换了要同步更新，否则两层伪元素还留着旧句子
  const glitch = wordEl.querySelector<HTMLElement>('.glitch');
  const setWord = (text: string) => {
    wordEl.querySelector<HTMLElement>('.glitch')!.textContent = text;
    (glitch ?? wordEl).dataset.text = text;
  };

  const { api, type, customs, placeholder } = mustomConfig().hitokoto ?? {};

  const apply = (word: string, from: string) => {
    if (word.trim()) setWord(word.trim());
    if (from.trim()) fromEl.textContent = from.trim();
  };

  if (customs && customs.length) {
    const rand = Math.floor(Math.random() * customs.length);
    apply(customs[rand].word, customs[rand].from);
    return;
  }

  if (placeholder) apply(placeholder.word, placeholder.from);

  if (api) {
    fetch(`${api}?c=${encodeURIComponent(type || 'i')}`)
      .then((r) => r.json())
      .then((result: { hitokoto?: string; from_who?: string; from?: string }) => {
        if (typeof result.hitokoto === 'string' && result.hitokoto.trim().length > 0) {
          setWord(result.hitokoto.trim());
        }
        const f =
          typeof result.from_who === 'string' && result.from_who.trim().length > 0
            ? result.from_who
            : typeof result.from === 'string'
              ? result.from
              : '';
        if (f.trim()) fromEl.textContent = f.trim();
      })
      .catch(() => {
        /* 网络不佳时保留占位语句 */
      });
  }
}

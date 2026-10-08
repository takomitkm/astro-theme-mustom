/**
 * 近期文章「更多」 —— 对应 Recent.vue 的 incrementOffset。
 * 首屏只渲染 recentPostOffset 条；点击后拉 /api/recent.json 追加 DOM。
 * 图标从 Recent.astro 内嵌的 <template id="recent-icons"> 克隆
 * （astro-icon 是构建期组件，运行时拼 svg 字符串不再可行）。
 */

import { clampExcerpts } from './clamp';

interface ItemMeta {
  title: string;
  url: string;
  date: string;
  updated: string;
  categories: string[];
  cover?: string;
  excerpt: string;
}

const iconTemplate = () => document.getElementById('recent-icons');
const iconHtml = (key: string): string =>
  iconTemplate()?.querySelector<HTMLElement>(`[data-icon="${key}"]`)?.innerHTML ?? '';

function buildItem(p: ItemMeta): HTMLElement {
  const item = document.createElement('div');
  item.className = 'list-item';

  const info = document.createElement('div');
  info.className = 'item-info markdown-body';

  const title = document.createElement('div');
  title.className = 'item-title';
  const a = document.createElement('a');
  a.href = p.url;
  a.textContent = p.title;
  title.appendChild(a);

  const meta = document.createElement('div');
  meta.className = 'item-meta';
  const date = document.createElement('div');
  date.className = 'meta-date';
  date.innerHTML = iconHtml('date');
  date.appendChild(document.createTextNode(' ' + p.date));
  const updated = document.createElement('div');
  updated.className = 'meta-updated';
  updated.innerHTML = iconHtml('updated');
  updated.appendChild(document.createTextNode(' ' + p.updated));
  meta.append(date, updated);
  if (p.categories.length) {
    const cats = document.createElement('div');
    cats.className = 'meta-categories';
    cats.innerHTML = iconHtml('cats');
    p.categories.forEach((c, i) => {
      cats.appendChild(document.createTextNode(i === 0 ? ' ' : '\u00a0,'));
      const ca = document.createElement('a');
      ca.href = '/categories/' + encodeURIComponent(c) + '/';
      ca.textContent = c;
      cats.appendChild(ca);
    });
    meta.appendChild(cats);
  }

  const excerpt = document.createElement('div');
  excerpt.className = 'item-excerpt';
  excerpt.innerHTML = p.excerpt; // 构建期生成的受信 HTML

  info.append(title, meta, excerpt);

  const cover = document.createElement('div');
  if (p.cover) {
    cover.className = 'item-cover';
    cover.style.backgroundImage = `url('${p.cover}')`;
  }

  item.append(info, cover);
  return item;
}

export function initRecentMore(): void {
  const btn = document.querySelector<HTMLElement>('.Recent .more');
  const list = document.querySelector<HTMLElement>('.Recent .list');
  if (!btn || !list) return;
  const offset = Number(btn.getAttribute('data-offset') || '0');

  btn.addEventListener('click', async () => {
    try {
      const posts = (await (await fetch('/api/recent.json')).json()) as ItemMeta[];
      const frag = document.createDocumentFragment();
      for (const p of posts.slice(offset)) frag.appendChild(buildItem(p));
      list.appendChild(frag);
      btn.remove();
      clampExcerpts();
    } catch {
      // 拉取失败时退化为跳转归档页
      window.location.href = '/archive/';
    }
  });
}

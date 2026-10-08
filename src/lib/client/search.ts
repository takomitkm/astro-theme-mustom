/**
 * 搜索 —— 移植自 Hexo fork 的 pagefind 版 search.js：
 *   emoji 提示、结果总数行、命中片段 <mark> 高亮、Enter 触发搜索、
 *   连续触发丢弃过期结果。dev 模式没有 pagefind 产物时提示"索引没就绪"。
 * 索引由 `pagefind --site dist` 生成（npm run build 已串联）。
 */

interface SearchItem {
  title: string;
  url: string;
  tags: string[];
  categories: string[];
  text: string;
}

const RESULT_LIMIT = 10;

const messages = {
  initial: '(..•˘_˘•..)',
  empty: '(╯°Д°)╯︵ ┻━┻',
  failed: '搜索索引没就绪 (；´д｀)',
};

interface PagefindFragment {
  data: () => Promise<{
    url: string;
    meta?: { title?: string };
    excerpt?: string;
  }>;
}

interface PagefindModule {
  search(query: string): Promise<{ results: PagefindFragment[] }>;
  options?(opts: Record<string, unknown>): Promise<void>;
}

function matchQuery(query: string, item: SearchItem): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return false;
  const haystack = [item.title, ...(item.tags ?? []), ...(item.categories ?? []), item.text ?? '']
    .join('\n')
    .toLowerCase();
  return terms.every((t) => haystack.includes(t));
}

export function initSearch(): void {
  const root = document.querySelector<HTMLElement>('.Ext .Search');
  if (!root) return;
  const input = root.querySelector<HTMLInputElement>('input');
  const list = root.querySelector<HTMLUListElement>('.suggestions');
  if (!input || !list) return;

  // 建议列表容器兼作结果列表：pagefind 结果与 JSON 后备都渲染成同一种行
  let pagefind: PagefindModule | null = null;
  let jsonIndex: SearchItem[] | null = null;
  let backend: 'pagefind' | 'json' | null = null;
  let seq = 0;

  const message = (text: string) => {
    const div = document.createElement('div');
    div.className = 'message';
    div.innerText = text;
    return div;
  };

  async function ensureBackend(): Promise<'pagefind' | 'json'> {
    if (backend) return backend;
    try {
      // 运行时拼接 URL，避免打包器在构建期解析 pagefind 产物
      const pagefindUrl = new URL('/pagefind/pagefind.js', window.location.origin).href;
      pagefind = (await import(/* @vite-ignore */ pagefindUrl)) as PagefindModule;
      await pagefind.options?.({});
      backend = 'pagefind';
    } catch {
      backend = 'json'; // dev 模式或 pagefind 未生成
    }
    return backend;
  }

  async function jsonSearch(query: string): Promise<SearchItem[]> {
    if (!jsonIndex) {
      try {
        jsonIndex = (await (await fetch('/api/search.json')).json()) as SearchItem[];
      } catch {
        jsonIndex = [];
      }
    }
    const out: SearchItem[] = [];
    for (const item of jsonIndex) {
      if (out.length >= RESULT_LIMIT) break;
      if (matchQuery(query, item)) out.push(item);
    }
    return out;
  }

  function renderItem(title: string, url: string, excerptHtml: string): HTMLElement {
    const item = document.createElement('div');
    item.className = 'result-item';
    const a = document.createElement('a');
    a.href = url;
    a.title = title;
    a.textContent = title;
    const p = document.createElement('p');
    // pagefind 的 excerpt 自带 <p>…</p> 与 <mark>；直接塞进 <p> 会生成非法的 <p><p>，
    // 交给 HTML 解析器会被悄悄拍平。剥掉外层 <p> 再放行，保留 <mark> 高亮。
    p.innerHTML = excerptHtml.replace(/^\s*<p[^>]*>/i, '').replace(/<\/p>\s*$/i, '');
    item.append(a, p);
    return item;
  }

  async function search(rawQuery: string): Promise<void> {
    const query = rawQuery.trim();
    const mySeq = ++seq;
    list!.innerHTML = '';
    if (!query) return;

    const kind = await ensureBackend();
    if (mySeq !== seq) return;

    if (kind === 'json') {
      // JSON 后备（dev）：行为对齐 pagefind 主路径
      const items = await jsonSearch(query.toLowerCase());
      if (mySeq !== seq) return;
      if (!items.length) {
        list!.appendChild(message(messages.empty));
        return;
      }
      const count = document.createElement('div');
      count.className = 'count';
      count.innerText = `共 ${items.length} 条`;
      list!.appendChild(count);
      for (const item of items) {
        list!.appendChild(renderItem(item.title, item.url, item.text));
      }
      return;
    }

    if (!pagefind) {
      list!.appendChild(message(messages.failed));
      return;
    }
    try {
      const res = await pagefind.search(query);
      const fragments = await Promise.all(res.results.slice(0, RESULT_LIMIT).map((r) => r.data()));
      if (mySeq !== seq) return;
      if (res.results.length <= 0) {
        list!.appendChild(message(messages.empty));
        return;
      }
      const count = document.createElement('div');
      count.className = 'count';
      count.innerText =
        res.results.length > fragments.length
          ? `共 ${res.results.length} 条，显示前 ${fragments.length} 条`
          : `共 ${res.results.length} 条`;
      list!.appendChild(count);
      for (const d of fragments) {
        const title = d.meta?.title || d.url;
        list!.appendChild(renderItem(title, d.url, d.excerpt ?? ''));
      }
    } catch {
      if (mySeq === seq) list!.appendChild(message(messages.failed));
    }
  }

  // 初始提示（对应原版 on() 的 initial 行）
  list.appendChild(message(messages.initial));

  input.addEventListener('input', () => {
    if (!input.value.trim()) {
      seq++;
      list!.innerHTML = '';
      list!.appendChild(message(messages.initial));
    }
  });

  // 回车或按钮触发搜索（对应原版 dialog 的交互）
  const runSearch = () => {
    input.blur();
    search(input.value);
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runSearch();
  });
  root.querySelector<HTMLButtonElement>('.search-btn')?.addEventListener('click', runSearch);
}

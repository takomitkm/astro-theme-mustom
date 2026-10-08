/**
 * 搜索 —— 移植自 Hexo fork 的 pagefind 版 search.js：
 *   emoji 提示、结果总数行、命中片段 <mark> 高亮、Enter 触发搜索、
 *   连续触发丢弃过期结果。dev 模式没有 pagefind 产物时提示"索引没就绪"。
 * 索引由 `pagefind --site dist` 生成（npm run build 已串联）。
 */

import { abs } from './base';

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
      // 运行时拼接 URL（并补 base 前缀），避免打包器在构建期解析 pagefind 产物
      const pagefindUrl = new URL(abs('/pagefind/pagefind.js'), window.location.origin).href;
      pagefind = (await import(/* @vite-ignore */ pagefindUrl)) as PagefindModule;
      await pagefind.options?.({});
      backend = 'pagefind';
    } catch {
      backend = 'json'; // dev 模式或 pagefind 未生成
    }
    return backend;
  }

  /** 取回并缓存整份 JSON 索引（补全词表与"索引规模"提示都要用它） */
  async function ensureJsonIndex(): Promise<SearchItem[]> {
    if (jsonIndex) return jsonIndex;
    try {
      jsonIndex = (await (await fetch(abs('/api/search.json'))).json()) as SearchItem[];
    } catch {
      jsonIndex = [];
    }
    return jsonIndex;
  }

  async function jsonSearch(query: string): Promise<SearchItem[]> {
    const all = await ensureJsonIndex();
    const out: SearchItem[] = [];
    for (const item of all) {
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


/** 索引规模：直接看 JSON 索引长度（这就是"有多少内容要搜索"） */
  let docTotal = 0;
  const totalDocs = async (): Promise<number> => {
    if (!docTotal) {
      const all = await ensureJsonIndex();
      docTotal = all.length;
    }
    return docTotal;
  };
  // 初始提示（对应原版 on() 的 initial 行）：顺带报一下索引规模
  const initialLine = async () => {
    const msg = message(messages.initial);
    list!.appendChild(msg);
    const total = await totalDocs();
    if (total) {
      msg.innerHTML = `${messages.initial}<br><small>索引共 ${total} 篇文档</small>`;
    }
  };
  void initialLine();

  /* ---------- 预测输入（像搜索引擎那样）----------
     每 500ms 用当前词去索引里捞一遍候选词，显示成可点的补全行；
     点一下直接填进输入框。 */
  const wordPool = new Map<string, string>();
  const loadPool = async () => {
    if (wordPool.size) return;
    try {
      const items = await ensureJsonIndex();
      for (const it of items) {
        const words = [it.title, ...(it.tags ?? []), ...(it.categories ?? [])]
          .join(' ')
          .split(/[\s/、,，。·_-]+/)
          .map((w) => w.trim())
          .filter((w) => w.length >= 2);
        for (const w of words) if (!wordPool.has(w)) wordPool.set(w.toLowerCase(), w);
      }
    } catch {
      /* 没有后备索引就不做补全 */
    }
  };

  // 预测词排在结果上方（像搜索引擎的下拉）。每次渲染都先清掉旧的再插到最前面，
  // 这样两秒一次的自动搜索把结果区清空后，补全行也不会跟着消失。
  const renderPredictions = () => {
    list!.querySelectorAll('.predictions').forEach((e) => e.remove());
    const q = input.value.trim().toLowerCase();
    if (!q || !wordPool.size) return;
    const hits = [...wordPool.values()]
      .filter((w) => {
        const k = w.toLowerCase();
        return k.includes(q) && k !== q;
      })
      .slice(0, 8);
    if (!hits.length) return;
    const box = document.createElement('div');
    box.className = 'predictions';
    for (const w of hits) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'prediction';
      b.textContent = w;
      b.addEventListener('click', () => {
        input.value = w;
        input.focus();
        void search(w);
      });
      box.appendChild(b);
    }
    list!.prepend(box);
  };

  let predictTimer = 0;
  input.addEventListener('input', () => {
    if (!input.value.trim()) {
      seq++;
      list!.innerHTML = '';
      void initialLine();
      return;
    }
    // 每半秒刷新一次预测
    window.clearTimeout(predictTimer);
    predictTimer = window.setTimeout(() => {
      void loadPool().then(renderPredictions);
    }, 500);
  });

  // 回车触发搜索
  const runSearch = () => {
    input.blur();
    void search(input.value).then(() => renderPredictions());
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runSearch();
  });

  // 每 2 秒自动出一次当前输入的结果（像搜索引擎的 instant search）
  let autoTimer = 0;
  input.addEventListener('input', () => {
    window.clearInterval(autoTimer);
    const q = input.value.trim();
    if (!q) return;
    autoTimer = window.setInterval(() => {
      if (input.value.trim() !== q) return;
      void search(q).then(() => renderPredictions());
    }, 2000);
  });
  input.addEventListener('blur', () => window.clearInterval(autoTimer));
}

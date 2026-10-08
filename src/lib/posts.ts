/**
 * 构建期文章工具 —— 对应 Hexo helpers（$count/$min2read/$word4post…）与
 * hexo-generator-restful / @vuepress/plugin-blog 的数据组织方式。
 */
import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import { wordStat, type WordStat } from './wordcount';
import { insertSpace } from '../markdown/remark-pangu';
import { abs } from '../config';

export type Post = CollectionEntry<'posts'>;

/** 全部文章，按日期倒序（draft 仅在 dev 模式出现） */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection(
    'posts',
    ({ data }) => import.meta.env.MODE === 'development' || !data.draft,
  );
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** glob loader 的 id 即文件相对路径（去扩展名），作为文章 slug
 *  经 abs() 补 base 前缀：组件 href 与 /api/*.json 共用这份 URL，源头加一次即可 */
export const postUrl = (post: Post) => abs(`/posts/${post.id}/`);

export interface YearGroup {
  year: string;
  posts: Post[];
}

/** 按年份分组（倒序）—— 对应 Timeline.vue postsInYears */
export function groupByYear(posts: Post[]): YearGroup[] {
  const temp = new Map<string, Post[]>();
  for (const post of posts) {
    const year = String(post.data.date.getFullYear());
    if (!temp.has(year)) temp.set(year, []);
    temp.get(year)!.push(post);
  }
  return [...temp.entries()]
    .map(([year, list]) => ({ year, posts: list }))
    .sort((a, b) => (a.year < b.year ? 1 : a.year > b.year ? -1 : 0));
}

export interface NameMapEntry {
  name: string;
  url: string;
  posts: Post[];
}

/** 标签/分类 → 文章列表（Panel 云图的 fontSize/opacity 依赖计数） */
export function nameMap(posts: Post[], key: 'tags' | 'categories'): NameMapEntry[] {
  const base = key === 'tags' ? abs('/tags/') : abs('/categories/');
  const map = new Map<string, Post[]>();
  for (const post of posts) {
    for (const name of post.data[key] ?? []) {
      if (!map.has(name)) map.set(name, []);
      map.get(name)!.push(post);
    }
  }
  return [...map.entries()]
    .map(([name, list]) => ({
      name,
      url: base + encodeURIComponent(name) + '/',
      posts: list,
    }))
    .sort((a, b) => b.posts.length - a.posts.length);
}

export function maxCount(entries: NameMapEntry[]): number {
  return entries.reduce((max, e) => Math.max(max, e.posts.length), 0);
}

/* ---------- 摘要 ---------- */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 从 markdown 原文粗糙地提取首段纯文本（无依赖、构建期执行） */
function firstParagraph(body: string): string {
  const beforeMore = body.split('<!-- more -->')[0];
  const blocks = beforeMore.split(/\n\s*\n/).map((b) => b.trim());
  for (const block of blocks) {
    if (!block) continue;
    if (/^(#|```|<!--|\!\[)/.test(block)) continue; // 跳过标题/代码/注释/纯图
    return block
      .replace(/\s*\n\s*/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // 图片
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接取文本
      .replace(/<[^>]+>/g, '') // HTML 标签
      .replace(/[*_`~]{1,3}([^*_`~]*)[*_`~]{1,3}/g, '$1'); // 强调记号
  }
  return '';
}

export interface PostMeta {
  id: string;
  title: string;
  url: string;
  date: string;
  updated: string;
  categories: string[];
  tags: string[];
  cover?: string;
  /** 已转义的 HTML 片段（单个 <p> 或原样文本） */
  excerpt: string;
  wordcount: number;
  /** 同 wordcount（别名），产量热力图按天聚合用 */
  chars: number;
  min2read: number;
}

const statCache = new Map<string, WordStat>();

/** 文章字数/阅读时长（含在 README 说明：与原版一致，按原始 markdown 统计） */
export function statOf(post: Post): WordStat {
  if (!statCache.has(post.id)) {
    statCache.set(post.id, wordStat(post.body ?? ''));
  }
  return statCache.get(post.id)!;
}

/** 摘要：frontmatter.excerpt（纯文本）优先，否则取正文首段；统一套 <p> 并做盘古处理 */
export function excerptOf(post: Post): string {
  const raw = post.data.excerpt?.trim() || firstParagraph(post.body ?? '') || post.data.title;
  return `<p>${insertSpace(escapeHtml(raw))}</p>`;
}

export function metaOf(post: Post): PostMeta {
  const stat = statOf(post);
  return {
    id: post.id,
    title: insertSpace(post.data.title),
    url: postUrl(post),
    date: post.data.date.toISOString().slice(0, 10),
    updated: (post.data.updated ?? post.data.date).toISOString().slice(0, 10),
    categories: post.data.categories ?? [],
    tags: post.data.tags ?? [],
    // cover 来自 frontmatter（public/ 下的绝对路径），同样要补 base 前缀
    cover: post.data.cover ? abs(post.data.cover) : undefined,
    excerpt: excerptOf(post),
    wordcount: stat.total,
    chars: stat.total,
    min2read: stat.minutes,
  };
}

/** 全站总字数（页脚 wd） */
export function totalWords(posts: Post[]): string | number {
  const result = posts.reduce((sum, p) => sum + statOf(p).total, 0);
  if (result >= 1000) {
    return Math.round(result / 100) / 10 + 'k';
  }
  return result;
}

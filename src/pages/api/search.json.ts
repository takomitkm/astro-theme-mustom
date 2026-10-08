import type { APIRoute } from 'astro';
import { getPosts, postUrl, excerptOf } from '../../lib/posts';

/**
 * 搜索索引 —— 对应 @vuepress/plugin-search 的 $site.pages（title + headers）。
 * 这里以 title + tags + categories + 摘要纯文本为检索域，matchQuery 语义一致：
 * 空格分词、全部命中才匹配（大小写不敏感的子串匹配）。
 */
export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const items = posts.map((post) => ({
    title: post.data.title,
    url: postUrl(post),
    tags: post.data.tags ?? [],
    categories: post.data.categories ?? [],
    text: excerptOf(post).replace(/<[^>]+>/g, ''),
  }));
  return new Response(JSON.stringify(items), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};

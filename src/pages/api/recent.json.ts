import type { APIRoute } from 'astro';
import { getPosts, metaOf } from '../../lib/posts';

/**
 * 全站文章元数据 —— 对应 hexo-generator-restful 的 /api/posts.json，
 * 供「近期文章 · 更多」客户端追加使用。
 */
export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const metas = posts.map(metaOf);
  return new Response(JSON.stringify(metas), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};

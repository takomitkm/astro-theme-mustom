import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getPosts, postUrl, excerptOf } from '../lib/posts';
import { site } from '../config';
import { insertSpace } from '../markdown/remark-pangu';

/**
 * RSS —— @astrojs/rss 官方方案（取代手写 XML；对应原版主题的 feed 能力）。
 */
export const GET: APIRoute = async (context) => {
  const posts = await getPosts();
  return rss({
    title: site.title,
    description: site.description,
    site: context.site!,
    items: posts.map((post) => ({
      title: insertSpace(post.data.title),
      pubDate: post.data.date,
      description: excerptOf(post),
      link: postUrl(post),
    })),
    customData: '<language>zh-CN</language>',
  });
};

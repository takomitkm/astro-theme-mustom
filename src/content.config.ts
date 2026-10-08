import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 内容集合 —— 对应 Hexo 的 source/_posts 与 VuePress 的 _posts 目录约定。
 *
 * posts：博客文章，路由 /posts/<slug>/
 * pages：独立页面（about 等），路由 /<slug>/
 */
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    categories: z.array(z.string()).default([]),
    /** 手写摘要（纯文本）；不写则自动取正文第一段 */
    excerpt: z.string().optional(),
    /** 列表封面图 URL（近期文章卡片低透明度背景） */
    cover: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date().optional(),
    updated: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, pages };

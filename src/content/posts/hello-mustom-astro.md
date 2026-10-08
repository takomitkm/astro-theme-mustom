---
title: Hello Mustom for Astro
date: 2026-09-01
tags: [Astro, 随笔]
categories: [博客]
---

这是 **Mustom for Astro** 的第一篇示例文章。Mustom 是 jinyaoMa 的简约设计主题，先后有 Hexo 与 VuePress 两个实现，本仓库是它的 Astro 移植版。

## 特性一览

- 构建期静态 HTML，客户端只有少量原生 TS
- 四套皮肤 + 夜间模式（CSS 变量驱动，偏好存 localStorage）
- 一言、近期文章、归档时间轴、标签/分类云图
- 全站搜索、门户页、阅读模式、盘古之白排版

<!-- more -->

## 代码块

代码高亮由 Shiki 提供，夜间模式自动切换暗色主题：

```ts
export function addK(num: number): string | number {
  if (num >= 1000) {
    return Math.round(num / 100) / 10 + 'k';
  }
  return num;
}
```

## 表格

| 原实现 | 新实现 |
| --- | --- |
| Hexo + EJS | Astro 组件 |
| Stylus | SCSS |
| hexo-generator-restful | JSON API 路由 |

> 简单，比复杂更难。你必须努力让你的想法变得清晰明了，让它变得简单。
>
> —— 《禅意生活》

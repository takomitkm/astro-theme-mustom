---
title: Markdown 语法速查
date: 2026-08-15
updated: 2026-08-20
tags: [Markdown, 写作]
categories: [博客, 教程]
excerpt: 一篇用来展示 Mustom 正文排版效果的速查笔记，从标题、列表到公式与分割线。
---

# 这里是 H1（文中一般不用）

## 二级标题

### 三级标题

正文段落。Mustom 使用盘古之白处理中西文间距，比如写出 Astro 主题、VuePress 移植、GitHub Pages 部署时都会自动加空格。

## 列表

1. 有序列表项
2. 有序列表项
   - 嵌套无序列表项
   - 嵌套无序列表项

- 无序列表项
- 无序列表项

## 引用与强调

> 引用块：好的设计是尽可能少的设计。

**粗体**、*斜体*、`行内代码`、[链接](https://astro.build)、~~删除线~~。

## 图片

![这是一张占位图](/images/brand.svg)

## 公式

行内公式 $e^{i\pi} + 1 = 0$，块级公式（KaTeX 渲染，夜间模式跟随主题）：

$$
\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
$$

## 分割线

---

任务列表：

- [x] 支持四套皮肤
- [x] 支持夜间模式
- [x] PWA 离线可用（@vite-pwa/astro）

---
title: 用 Astro 重写 Mustom 主题的一些笔记
date: 2026-07-10
tags: [Astro, 前端]
categories: [技术]
---

记录这次重写过程中的几个关键决策。

## 为什么静态优先

原 Hexo 版是“伪 SPA”：静态页只有外壳，内容由前端 ajax 渲染。VuePress 版改成了构建期渲染，Astro 天生就是这么工作的，所以这次移植选择了 VuePress 版的思路作为蓝本，同时保留 Hexo 版的 RESTful API 习惯（`/api/recent.json`、`/api/search.json`）。

## 状态管理怎么办

没有框架运行时，主题的“皮肤/夜间/语言/画布”偏好改用两条腿：

1. `<html>` 上的 class 作为真相源（首帧前的内联脚本写入，避免闪烁）
2. localStorage 里的 JSON 兜底持久化，key 依旧是 `btoa(location.host)`

组件之间用 `document` 上的 CustomEvent 通信，比如夜间切换后画布重画。

## 字数统计

和原版保持一致：中文字符按每分钟 150 字、英文单词按每分钟 100 词折算。

---
title: 服务器巡检小抄
date: 2024-06-18
tags: [Linux, 运维]
categories: [技术, 教程]
excerpt: 最早的一篇示例：开机后先看什么、再看什么。
---

第三年的示例文章，证明时间轴可以跨年分组。

```bash
# 磁盘
df -h
# 内存
free -h
# 谁在偷跑 CPU
top -b -n 1 | head -20
```

遇到问题先看日志，日志不会骗人（大部分时候）。

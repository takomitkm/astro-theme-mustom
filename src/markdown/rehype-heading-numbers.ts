/**
 * rehype 插件：正文标题序号 —— 移植自 Hexo fork 的 scripts/plugin/heading-numbers.js
 * （构建期给每个标题写 data-num="2.1"，CSS 用 ::before 展示，与目录/锚点互不干扰）
 * 序号从正文中出现的第一个标题层级起算（root），与 hexo-util tocObj 同一算法。
 */
import { visit, SKIP } from 'unist-util-visit';
import type { Element, Root } from 'hast';

export function rehypeHeadingNumbers() {
  return (tree: Root) => {
    const last = [0, 0, 0, 0, 0, 0];
    let root = 0;

    const headings: Element[] = [];
    visit(tree, 'element', (node: Element) => {
      const tag = node.tagName;
      if (/^h[1-6]$/.test(tag)) headings.push(node);
    });

    for (const el of headings) {
      const level = Number(el.tagName[1]);
      last[level - 1]++;
      for (let i = level; i <= 5; i++) last[i] = 0;
      if (!root) root = level;
      const parts: number[] = [];
      for (let i = root - 1; i < level; i++) parts.push(last[i]);
      el.properties.dataNum = parts.join('.');
    }

    void SKIP; // 保持 visit 导入对称；标题遍历不需要提前终止
  };
}

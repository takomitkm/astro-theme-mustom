/**
 * remark 插件：盘古之白 —— 在中西文之间插入空格。
 * 算法来自 npm `pangu`（vinta/pangu.js 官方维护版，pangunode 的上游），
 * 本文件只做 remark 壳：只处理正文文本节点，跳过代码块/行内代码/数学式。
 */
import { visit } from 'unist-util-visit';
import { Pangu } from 'pangu/shared';
import type { Root } from 'mdast';

const pangu = new Pangu();

/** 供标题/摘要等纯文本场景使用（与 remark 管线同一实现） */
export const insertSpace = (text: string): string => pangu.spaceText(text ?? '');

/** 只处理正文文本节点，跳过代码块/行内代码/数学式，避免破坏内容 */
export function remarkPangu() {
  return (tree: Root) => {
    visit(tree, 'text', (node, _index, parent) => {
      const type = (parent as { type?: string } | null)?.type;
      if (type === 'code' || type === 'inlineCode' || type === 'math' || type === 'inlineMath')
        return;
      const value = insertSpace(node.value);
      if (value !== node.value) node.value = value;
    });
  };
}

/**
 * rehype 插件：markdown 图片默认懒加载（对应原版 vuepress-plugin-img-lazy）。
 */
import { visit } from 'unist-util-visit';
import type { Element, Root } from 'hast';

export function rehypeLazyImages() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'img') return;
      node.properties.loading ??= 'lazy';
      node.properties.decoding ??= 'async';
    });
  };
}

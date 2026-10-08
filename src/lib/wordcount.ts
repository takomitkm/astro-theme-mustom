/**
 * 字数统计 —— 移植自 vuepress-theme-mustom index.js extendPageData 的算法（Hexo 版 $word4post/$min2read 同源）
 */

export interface WordStat {
  zh: number;
  en: number;
  total: number;
  /** 阅读分钟数（不足 1 记 1） */
  minutes: number;
}

export function wordStat(content: string): WordStat {
  const zh = (content.match(/[\u4E00-\u9FA5]/g) || []).length;
  const en = (
    content
      .replace(/[\u4E00-\u9FA5]/g, '')
      .match(
        /[a-zA-Z0-9_\u0392-\u03c9\u0400-\u04FF]+|[\u4E00-\u9FFF\u3400-\u4dbf\uf900-\ufaff\u3040-\u309f\uac00-\ud7af\u0400-\u04FF]+|[\u00E4\u00C4\u00E5\u00C5\u00F6\u00D6]+|\w+/g,
      ) || []
  ).length;
  const raw = zh / 150 + en / 100;
  return { zh, en, total: zh + en, minutes: raw < 1 ? 1 : parseInt(String(raw), 10) };
}

/** 1,234 → 1.2k（原 addK） */
export function addK(num: number): string | number {
  if (num >= 1000) {
    return Math.round(num / 100) / 10 + 'k';
  }
  return num;
}

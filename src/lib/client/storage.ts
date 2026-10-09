/**
 * 本地存储 —— 逐行对应 vuepress-theme-mustom utils/storage.js
 * 以 btoa(location.host) 为 key 存一份 JSON（皮肤/语言/看板娘/播放器等偏好）。
 */

export interface SaveData {
  skin?: string;
  lang?: string;
  addin?: string;
  closeDrawer?: boolean;
  closeAside?: boolean;
  noLive2d?: boolean;
  hidePlayer?: boolean;
  autoplay?: boolean;
  /** 右下角按钮是否用拟物化卷轴样式 */
  skeuoTop?: boolean;
  /** 被折叠的卡片 data-mini-id 列表（跨页保持折叠/展开） */
  mini?: string[];
}

export const KEY = () => window.btoa(window.location.host);

export function getSave(): SaveData {
  let value: string | null = null;
  try {
    value = window.localStorage.getItem(KEY());
  } catch {
    return {};
  }
  if (value) {
    try {
      return JSON.parse(value) as SaveData;
    } catch {
      return {};
    }
  }
  return {};
}

export function setSave(value: SaveData): void {
  try {
    window.localStorage.setItem(KEY(), JSON.stringify(value));
  } catch {
    /* storage unavailable — 偏好不保存，功能照常 */
  }
}

export function patchSave(patch: Partial<SaveData>): SaveData {
  const next = { ...getSave(), ...patch };
  setSave(next);
  return next;
}

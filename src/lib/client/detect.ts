/**
 * 检测接线 —— 把探针接到页面上：跑一次、缓存到本会话、给游戏卡片打标、算开屏档位。
 *
 * 数据去向（按她的隐私口径写死在这里）：
 *   sessionStorage  本会话的读数，标签页关掉即没
 *   内存            私密模式里 sessionStorage 会抛，退化成这份
 *   不发请求、不进不蒜子、SW 不参与
 *   读数不写 localStorage；整套检测唯一落长期存储的是 Splash.astro 记的"开屏已播过"时间戳
 *
 * 打标只改视觉，不禁链接：访客照样能点进去，判错了也不把人挡在门外。
 */
import { PROBE_VERSION, probeAll, probeAsync, probeSync, type Caps } from '../detect/capabilities';
import { asGames, verdictAll, type GameEntry, type VerdictDetail, type SplashTierName } from '../detect/games';
import { pickSplashTier, tierFromBench, runSplashBench, applyBurned, type TierDecision } from '../detect/splash';
import gamesJson from '../../data/games.json';

const GAMES: GameEntry[] = asGames(gamesJson);
const CACHE_KEY = `mustom.detect.v${PROBE_VERSION}`;

type Listener = (caps: Caps) => void;
const listeners = new Set<Listener>();

let current: Caps | null = null;
let currentTier: SplashTierName = 'reduced';
let currentDecision: TierDecision | null = null;
let started = false;

/* ------------------------------------------------------------------ */
/* 缓存                                                                */
/* ------------------------------------------------------------------ */

function readCache(): Caps | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as Caps;
    return obj && obj.probeVersion === PROBE_VERSION ? obj : null;
  } catch {
    return null;
  }
}

function writeCache(caps: Caps): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(caps));
  } catch {
    /* 无痕模式或配额满：只用内存那份 */
  }
}

export function getCaps(): Caps | null {
  return current;
}

export function getGames(): GameEntry[] {
  return GAMES;
}

/** 调试页订阅读数更新；返回退订函数 */
export function onCaps(fn: Listener): () => void {
  listeners.add(fn);
  if (current) fn(current);
  return () => listeners.delete(fn);
}

function publish(caps: Caps): void {
  current = caps;
  writeCache(caps);
  for (const fn of [...listeners]) {
    try {
      fn(caps);
    } catch {
      /* 订阅方抛错不能带崩检测 */
    }
  }
  markGames(caps);
}

/* ------------------------------------------------------------------ */
/* 开屏档位                                                            */
/* ------------------------------------------------------------------ */

export function getSplashTier(): SplashTierName {
  return currentTier;
}

export function getSplashWhy(): string[] {
  return currentDecision ? currentDecision.why : [];
}

/** 算档位并同步落到 <html data-splash-tier>。
 *  必须在这里落：MPA 每页都会重跑一遍，命中会话缓存那条路会提前 return，
 *  交给调用方写就会漏掉除首页以外的所有页面（CSS 那半边全靠这个属性）。 */
function decideTier(caps: Caps): TierDecision {
  const d = pickSplashTier(caps);
  currentTier = applyBurned(d.tier);
  document.documentElement.dataset.splashTier = currentTier;
  return { ...d, tier: currentTier };
}

/* ------------------------------------------------------------------ */
/* 打标                                                                */
/* ------------------------------------------------------------------ */

const LABEL: Record<VerdictDetail['verdict'], { zh: string; en: string }> = {
  ok: { zh: '', en: '' },
  unknown: { zh: '判不了', en: 'UNKNOWN' },
  blocked: { zh: '不支持', en: 'UNSUPPORTED' },
  site: { zh: '站点限制', en: 'HOSTING LIMIT' },
};

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

/** 双语片段：复用主题的 .m-zh/.m-en 规则，切语言不用重渲染 */
function bi(zh: string, en: string): DocumentFragment {
  const f = document.createDocumentFragment();
  const a = el('span', 'm-zh', zh);
  const b = el('span', 'm-en', en);
  f.append(a, b);
  return f;
}

function reasonLines(d: VerdictDetail): Array<[string, string]> {
  const lines: Array<[string, string]> = [];
  for (const t of d.blocked) lines.push([`✕ ${t}`, `✕ ${t}`]);
  for (const t of d.site) lines.push([`⚠ ${t}`, `⚠ ${t}`]);
  for (const t of d.unknown) lines.push([`? ${t}`, `? ${t}`]);
  for (const t of d.warn) lines.push([`· ${t}`, `· ${t}`]);
  return lines;
}

/** 给单张卡片打标记；重复调用会先清掉旧标记，读数刷新后能重算 */
function decorate(card: HTMLElement, game: GameEntry, d: VerdictDetail): void {
  card.classList.remove('dt-ok', 'dt-unknown', 'dt-blocked', 'dt-site');
  card.classList.add(`dt-${d.verdict}`);
  card.dataset.detect = d.verdict;
  card.querySelector('.dt-badge')?.remove();
  card.querySelector('.dt-why')?.remove();
  if (d.verdict === 'ok') return;

  const label = LABEL[d.verdict];
  const badge = el('button', 'dt-badge');
  badge.setAttribute('type', 'button');
  badge.append(bi(label.zh, label.en));
  card.append(badge);

  const lines = reasonLines(d);
  if (!lines.length) return;
  const why = el('div', 'dt-why');
  why.hidden = true;
  const whyId = `dt-why-${game.id}`;
  why.id = whyId;
  for (const [zh, en] of lines) {
    const p = el('p');
    p.append(bi(zh, en));
    why.append(p);
  }
  card.append(why);

  badge.setAttribute('aria-expanded', 'false');
  badge.setAttribute('aria-controls', whyId);
  badge.setAttribute('aria-label', label.zh);
  badge.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    why.hidden = !why.hidden;
    badge.classList.toggle('open', !why.hidden);
    badge.setAttribute('aria-expanded', why.hidden ? 'false' : 'true');
  });
  badge.title = game.title;
}

export function markGames(caps: Caps = current!): void {
  if (!caps) return;
  const nodes = document.querySelectorAll<HTMLElement>('[data-game]');
  if (!nodes.length) return;
  const results = verdictAll(GAMES, caps, currentTier);
  const byId = new Map(results.map((r) => [r.game.id, r]));
  for (const card of nodes) {
    const r = byId.get(card.dataset.game ?? '');
    if (!r) {
      // 表里没有这个游戏：不能假装它能跑，也不能说它不能跑
      card.classList.remove('dt-ok', 'dt-blocked', 'dt-site');
      card.classList.add('dt-unknown');
      card.dataset.detect = 'unknown';
      card.querySelector('.dt-badge')?.remove();
      const badge = el('span', 'dt-badge');
      badge.append(bi('未登记', 'NOT LISTED'));
      card.append(badge);
      continue;
    }
    decorate(card, r.game, r.detail);
  }
}

/* ------------------------------------------------------------------ */
/* 启动                                                                */
/* ------------------------------------------------------------------ */

/**
 * 全站入口：首屏只跑同步探针（几毫秒），WebGPU 那半异步补完再重算一次标记。
 * 会话内已有完整读数（asyncDone）就直接复用，一个标签页只测一次。
 */
export function initDetect(): void {
  if (started) return;
  started = true;

  const cached = readCache();
  if (cached) {
    currentDecision = decideTier(cached);
    publish(cached);
    return;
  }

  const sync = probeSync();
  currentDecision = decideTier(sync);
  publish(sync);

  probeAsync(sync).then((full) => {
    currentDecision = decideTier(full);
    publish(full);
  });

  // 微基准放到首屏之后：跟开屏动画抢主线程就本末倒置了
  const idle = (globalThis as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
    .requestIdleCallback;
  const later = () => setTimeout(run, 1500);
  const run = () => {
    if (!current) return;
    currentDecision = decideTier(current);
    runSplashBench().then((bench) => {
      const upgraded = tierFromBench(currentDecision!, bench);
      currentDecision = upgraded;
      currentTier = applyBurned(upgraded.tier);
      document.documentElement.dataset.splashTier = currentTier;
    });
  };
  if (idle) idle(later, { timeout: 4000 });
  else later();
}

/** 调试页的手动重测：绕开缓存跑一遍完整探针 */
export async function refreshDetect(): Promise<Caps> {
  started = true;
  const caps = await probeAll();
  currentDecision = decideTier(caps);
  publish(caps);
  return caps;
}

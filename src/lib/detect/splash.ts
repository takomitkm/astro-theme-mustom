/**
 * 开屏分级 —— 4 档，以及"这台机器现在跑不跑得动"的性能轴。
 *
 * 与 games.ts 的分工是刻意的：
 *   能力轴（games.ts）  布尔量，声明式，不用点进游戏就能判 → ok/unknown/blocked/site
 *   性能轴（本文件）    连续量，只能在现场测，硬件信息只够做硬负排除
 *
 * 必须说清的一件事：navigator.hardwareConcurrency / deviceMemory 这类"硬件信息"
 * 判不了性能。deviceMemory 在 Firefox 根本没有，hardwareConcurrency 是线程数不是
 * 算力，低端 ARM 大核常被报成 4。所以分级顺序是：
 *   L0 硬负排除（同步、零成本）→ 立刻给一个保守档位，不让首屏等
 *   L1 微基准（几十毫秒）    → 用固定工作量实测，够就升 full
 *   L2 帧率看门狗（运行时）  → 真在放动画时掉帧就逐档降，降过一次的档位本会话不再重试
 */
import type { Caps } from './capabilities';
import type { SplashTierName } from './games';

export type { SplashTierName };

/** 会话内记账：降过的档位不再往上试，免得每次都重演一遍卡顿 */
const DEGRADE_KEY = 'mustom.splash.degrade';

export interface TierDecision {
  tier: SplashTierName;
  /** 每条理由都写人话，调试页要原样列出来 */
  why: string[];
  /** 结论的底气：hard=有硬负或实测；conservative=只是没测所以保守 */
  basis: 'hard' | 'conservative';
}

/* ------------------------------------------------------------------ */
/* L0：同步硬负排除                                                    */
/* ------------------------------------------------------------------ */

export function pickSplashTier(caps: Caps): TierDecision {
  const why: string[] = [];
  let tier: SplashTierName = 'reduced';
  let basis: TierDecision['basis'] = 'conservative';

  // 1) 访客的意愿优先于性能判断——这类降档跟机器快慢无关，别写成"设备不行"
  if (caps.prefs.reducedMotion) {
    why.push('系统里勾了「减少动态效果」：这是访客意愿，直接给静态帧，与设备性能无关');
    return { tier: 'static', why, basis: 'hard' };
  }
  if (caps.prefs.forcedColors) {
    why.push('开了强制颜色模式：动画层的颜色会被系统整批改写，静态帧更稳');
    return { tier: 'static', why, basis: 'hard' };
  }
  if (caps.host.connection.saveData) {
    why.push('网络连接开了省流量：首屏动画的资源与解码开销不值得，降静态');
    return { tier: 'static', why, basis: 'hard' };
  }

  // 2) 连 rAF 都没有的引擎：不讨论动画
  const raf = typeof requestAnimationFrame === 'function';
  if (!raf) {
    why.push('requestAnimationFrame 不存在，帧驱动做不了，开屏直接跳过');
    return { tier: 'skip', why, basis: 'hard' };
  }

  // 3) 明确的低端信号：只能凑齐"硬负"才下结论，缺一律保守
  const cores = caps.host.hardwareConcurrency;
  const mem = caps.host.deviceMemory;
  // pending 是"还没测"，不能当"没有"——那样每个访客刚进页面都会被降一档
  const noGpu =
    (caps.webgl1.grade === 'absent' || caps.webgl1.grade === 'error') &&
    (caps.webgl2.grade === 'absent' || caps.webgl2.grade === 'error');
  if (mem !== undefined && mem <= 1) {
    why.push(`deviceMemory 报 ${mem}GB（这是量化到 1/2/4/8 的粗值，只能当线索）`);
    tier = 'static';
    basis = 'hard';
  } else if (noGpu && typeof cores === 'number' && cores <= 2) {
    why.push('WebGL 上下文建不出来，且线程数 ≤2：留给静态帧');
    tier = 'static';
    basis = 'hard';
  } else if (noGpu) {
    why.push('WebGL 上下文建不出来，动画改走 Canvas 2D，先给 reduced');
  }

  if (cores === undefined) {
    why.push('hardwareConcurrency 读不到：不据此降档，交给微基准判');
  }
  if (mem === undefined) {
    why.push('deviceMemory 在该内核不存在（Firefox/Safari 不实现），属内核限制，不参与判档');
  }
  if (caps.engine.isWebView) {
    why.push(`识别为 WebView（${caps.engine.isWebViewHow}）：宿主壳的 GPU 加速与线程策略各家不同，判档只能保守`);
  }

  return { tier, why, basis };
}

/* ------------------------------------------------------------------ */
/* L1：微基准                                                          */
/* ------------------------------------------------------------------ */

export interface SplashBench {
  at: string;
  /** 帧间隔样本数 */
  frames: number;
  medianMs: number;
  p95Ms: number;
  /** 相对 60fps（16.7ms）算出的丢帧比例 */
  droppedRatio: number;
  /** 固定工作量那一帧耗时多少毫秒；跑不起动画的机器这一项最先炸 */
  workMs: number;
  /** 综合分：越高越有余量。<1 表示实测已在丢帧 */
  headroom: number;
  ok: boolean;
  note: string[];
}

/** 中位数与分位数：样本很小，直接排序取索引就够 */
function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * q)));
  return sorted[i];
}

/** 一帧固定工作量：往离屏画布画满一批小方块，模拟开屏粒子的绘制压力。
 *  用 Canvas 2D 是因为它在所有目标内核都在，WebGL 那条路留给能力轴判定。 */
function burnWork(px: number): number {
  const t0 = performance.now();
  let ctx: CanvasRenderingContext2D | null = null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    ctx = canvas.getContext('2d');
  } catch {
    return NaN;
  }
  if (!ctx) return NaN;
  ctx.fillStyle = '#4af';
  for (let i = 0; i < 2000; i++) {
    const x = (i * 37) % px;
    const y = (i * 91) % px;
    ctx.fillRect(x, y, 6, 6);
  }
  ctx.getImageData(0, 0, 1, 1);
  return performance.now() - t0;
}

/**
 * 跑一次微基准。默认 32 帧 ≈ 半秒，首屏之后闲时再跑，别和开屏动画抢主线程。
 * 页面不可见时 rAF 被节流，那样测出来的数毫无意义，所以直接放弃并说明。
 */
export async function runSplashBench(opts?: {
  frames?: number;
  workPx?: number;
  timeoutMs?: number;
}): Promise<SplashBench> {
  const frames = opts?.frames ?? 32;
  const px = opts?.workPx ?? 256;
  const timeoutMs = opts?.timeoutMs ?? 3000;
  const note: string[] = [];
  const base: SplashBench = {
    at: new Date().toISOString(),
    frames: 0,
    medianMs: NaN,
    p95Ms: NaN,
    droppedRatio: NaN,
    workMs: NaN,
    headroom: NaN,
    ok: false,
    note,
  };

  if (typeof document !== 'undefined' && document.hidden) {
    note.push('页面在后台，rAF 被节流，这次不测');
    return base;
  }

  base.workMs = burnWork(px);
  if (!Number.isFinite(base.workMs)) {
    note.push('固定工作量没跑成（建不出画布或拿不到 2D 上下文）');
    return base;
  }

  const deltas: number[] = [];
  const t0 = performance.now();
  await new Promise<void>((resolve) => {
    let last = 0;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      note.push(`帧采样在 ${timeoutMs}ms 处截断，只拿到 ${deltas.length} 个样本`);
      finish();
    }, timeoutMs);
    const step = (now: number) => {
      if (last) deltas.push(now - last);
      last = now;
      if (deltas.length >= frames) {
        finish();
        return;
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  base.frames = deltas.length;
  if (deltas.length < 8) {
    note.push(`帧样本只有 ${deltas.length} 个，不足以判帧率`);
    return base;
  }

  const sorted = deltas.slice().sort((a, b) => a - b);
  base.medianMs = quantile(sorted, 0.5);
  base.p95Ms = quantile(sorted, 0.95);
  base.droppedRatio = Math.max(0, (base.medianMs - 16.7) / 16.7);
  // 余量：把"帧预算够不够"和"固定工作量扛不扛得住"合起来看
  // 16.7ms 一帧，扣掉工作量还剩一半以上预算 ⇒ 有余量
  const frameBudget = 16.7;
  const workShare = Math.min(0.95, base.workMs / frameBudget);
  base.headroom = (1 - base.droppedRatio) * (1 - workShare);
  base.ok = Number.isFinite(base.headroom) && base.headroom >= 0.45 && base.droppedRatio < 0.6;
  if (performance.now() - t0 > 1200) note.push('这次基准跑了超过 1.2s，中途可能被别的任务抢了主线程');
  return base;
}

/** 基准结论 → 档位。够 fast 才升 full，测不出就维持原判，绝不因为"没测"就升档 */
export function tierFromBench(decision: TierDecision, bench: SplashBench): TierDecision {
  if (decision.tier === 'skip' || decision.tier === 'static') {
    return { ...decision, why: [...decision.why, '已判静态/跳过，微基准不再升档（意愿与硬负优先）'] };
  }
  if (!bench.ok || !Number.isFinite(bench.headroom)) {
    return { ...decision, why: [...decision.why, '微基准没得出可用结论，维持保守档'] };
  }
  if (bench.headroom >= 0.7) {
    return {
      tier: 'full',
      basis: 'hard',
      why: [
        ...decision.why,
        `微基准：帧中位 ${bench.medianMs.toFixed(1)}ms、固定工作量 ${bench.workMs.toFixed(1)}ms、余量 ${bench.headroom.toFixed(2)} → 升 full`,
      ],
    };
  }
  return {
    tier: 'reduced',
    basis: 'hard',
    why: [
      ...decision.why,
      `微基准余量 ${bench.headroom.toFixed(2)}（帧中位 ${bench.medianMs.toFixed(1)}ms）→ 维持 reduced`,
    ],
  };
}

/* ------------------------------------------------------------------ */
/* L2：运行时帧率看门狗                                                */
/* ------------------------------------------------------------------ */

export interface Watchdog {
  start(): void;
  stop(): void;
  /** 是否已经因为掉帧触发过降级 */
  fired: boolean;
}

/**
 * 动画真的在放的时候盯帧间隔。连续两段超标就降一档并回调 onDegrade；
 * 降过的档位写进 sessionStorage，本会话不再往回试。
 *
 * 阈值写死成"中位帧间隔 > 26ms（≈38fps）且 p95 > 60ms"，
 * 单帧尖峰（GC、图片解码）不会误触发，因为取的是中位数。
 */
export function createFpsWatchdog(opts: {
  onDegrade: (from: SplashTierName, to: SplashTierName, stats: { medianMs: number; p95Ms: number }) => void;
  tier: () => SplashTierName;
  /** 采样窗口帧数 */
  frames?: number;
  /** 一次动画周期里最多降几档，防止连环降到 skip */
  maxDegrade?: number;
}): Watchdog {
  const frames = opts.frames ?? 48;
  const maxDegrade = opts.maxDegrade ?? 2;
  let rafId = 0;
  let samples: number[] = [];
  let last = 0;
  let fired = 0;
  let stopped = true;

  const nextTier = (t: SplashTierName): SplashTierName | null => {
    const order: SplashTierName[] = ['full', 'reduced', 'static', 'skip'];
    const i = order.indexOf(t);
    return i >= 0 && i < order.length - 1 ? order[i + 1] : null;
  };

  const evaluate = () => {
    if (samples.length < 8) return;
    const sorted = samples.slice().sort((a, b) => a - b);
    const medianMs = quantile(sorted, 0.5);
    const p95Ms = quantile(sorted, 0.95);
    if (medianMs > 26 && p95Ms > 60) {
      const from = opts.tier();
      const to = nextTier(from);
      if (to && fired < maxDegrade) {
        fired++;
        rememberDegraded(from, to);
        opts.onDegrade(from, to, { medianMs, p95Ms });
      }
    }
  };

  const step = (now: number) => {
    if (last) samples.push(now - last);
    last = now;
    // 首个样本前 rAF 的 now 与 last 不可比，跳过
    if (samples.length >= frames) {
      samples = [];
      last = 0;
      evaluate();
    }
    rafId = requestAnimationFrame(step);
  };

  return {
    start() {
      if (!stopped) return;
      if (typeof document !== 'undefined' && document.hidden) return;
      stopped = false;
      samples = [];
      last = 0;
      rafId = requestAnimationFrame(step);
    },
    stop() {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    },
    get fired() {
      return fired > 0;
    },
  };
}

/* ------------------------------------------------------------------ */
/* 会话记账                                                            */
/* ------------------------------------------------------------------ */

interface DegradeRecord {
  /** 已经试过并被帧率看门狗判掉的档位 */
  tried: SplashTierName[];
  at: string;
}

function readDegrade(): DegradeRecord | null {
  try {
    const raw = sessionStorage.getItem(DEGRADE_KEY);
    return raw ? (JSON.parse(raw) as DegradeRecord) : null;
  } catch {
    // 无痕模式下 sessionStorage 可能直接抛错：当作没记过，不影响功能
    return null;
  }
}

function rememberDegraded(from: SplashTierName, to: SplashTierName): void {
  try {
    const rec = readDegrade() ?? { tried: [], at: new Date().toISOString() };
    if (!rec.tried.includes(from)) rec.tried.push(from);
    if (!rec.tried.includes(to)) rec.tried.push(to);
    sessionStorage.setItem(DEGRADE_KEY, JSON.stringify(rec));
  } catch {
    /* 存不进去就只在本页生效 */
  }
}

/** 该档位在会话里是否已经被看门狗否掉过——是就不必再试 */
export function isTierBurned(tier: SplashTierName): boolean {
  const rec = readDegrade();
  return !!rec && rec.tried.includes(tier);
}

/** 把档位压回会话内已确认能跑的那一档 */
export function applyBurned(tier: SplashTierName): SplashTierName {
  const order: SplashTierName[] = ['full', 'reduced', 'static', 'skip'];
  let i = order.indexOf(tier);
  while (i >= 0 && i < order.length - 1 && isTierBurned(order[i])) i++;
  return order[i] ?? 'skip';
}

export function clearDegradeRecord(): void {
  try {
    sessionStorage.removeItem(DEGRADE_KEY);
  } catch {
    /* 忽略 */
  }
}

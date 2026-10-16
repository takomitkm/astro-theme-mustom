/**
 * 游戏需求表与判定 —— 把「这台设备 + 这个内核能不能跑这个游戏」变成一个四态结论，
 * 不用人点开游戏就能标出来。
 *
 * 四条判定原则（决定了整套 UI 的语义，别改）：
 *   ok       每一条硬需求都拿到了正面证据
 *   unknown  至少一条需求判不了（探针还没测到 / 该内核根本没有这条通道）→ 灰色
 *   blocked  至少一条需求被正面否定（API 不存在、扩展没开、wasm 字节码被拒）→ x
 *   site     需求本身没问题，只是当前托管设不了响应头 / 不是安全上下文 → x，但注明「站点限制」
 *
 * 最关键的一条是 unknown 与 blocked 不能混。证据缺失一律 unknown，
 * 绝不把「没测到」当成「不支持」——那会让访客以为自己的设备不行。
 */
import type { Caps } from './capabilities';

export type Verdict = 'ok' | 'unknown' | 'blocked' | 'site';

/** 硬需求与软需求共用同一个形状：软需求只出警告，不改判定 */
export interface Needs {
  /** capabilities.ts 里 es 表的键名，全部必须为 true */
  es?: string[];
  /** 点路径，必须存在（apis 里不是 'missing'） */
  api?: string[];
  /** wasm 特性名，必须 WebAssembly.validate/实例化通过 */
  wasm?: string[];
  gl?: {
    /** 需要的最低 WebGL 主版本；2 表示必须有 WebGL2 上下文 */
    minVersion?: 1 | 2;
    /** 扩展名，在 webgl1 或 webgl2 的 exts 里出现即算满足 */
    ext?: string[];
    /** getParameter 数值下限，如 { MAX_TEXTURE_SIZE: 4096 } */
    param?: Record<string, number>;
    /** 各 stage 的 precision 下限（range 位数） */
    precision?: number;
    /** 各向异性过滤倍数下限 */
    aniso?: number;
  };
  gpu?: {
    /** WebGPU feature 名 */
    feature?: string[];
    /** WebGPU limit 下限 */
    limit?: Record<string, number>;
    /** true 表示只要有适配器就算满足 */
    any?: boolean;
  };
  /** 需要 SharedArrayBuffer + 跨域隔离（wasm-threads / Worker 共享内存） */
  threads?: boolean;
  /** 需要安全上下文（https / localhost） */
  secure?: boolean;
  media?: {
    /** 编解码标签，取 capabilities.ts 的 CODEC_PROBES 第一列 */
    codec?: string[];
    /** MediaSource.isTypeSupported 的 MIME */
    mse?: string[];
    /** true 时要求 canPlayType 返回 'probably'，'maybe' 只算 unknown */
    strict?: boolean;
  };
}

export interface GameEntry {
  id: string;
  title: string;
  titleEn?: string;
  url?: string;
  cover?: string;
  desc?: string;
  descEn?: string;
  /** 标签，仅用于展示与筛选 */
  tags?: string[];
  /** 缺任何一条即判 blocked/unknown */
  needs?: Needs;
  /** 缺了照样算 ok，只在 details 里提示 */
  prefers?: Needs;
  /** 开屏/动画类才用：最低可接受的开屏档位 */
  splashTier?: SplashTierName;
  /** 判定哨兵：不是真游戏，只为把某个态钉在页面上当活体回归用 */
  sentinel?: boolean;
}

export type SplashTierName = 'full' | 'reduced' | 'static' | 'skip';

export interface VerdictDetail {
  verdict: Verdict;
  /** 正面否定的条目（含人话原因） */
  blocked: string[];
  /** 判不了的条目 */
  unknown: string[];
  /** 站点层面的原因 */
  site: string[];
  /** 软需求缺失，不影响判定 */
  warn: string[];
}

/* ------------------------------------------------------------------ */
/* 单项检查器                                                          */
/* ------------------------------------------------------------------ */

/** 三态结果：满足 / 判不了 / 不满足。'na' 表示这条根本没法测，交给上层归到 unknown */
type State = 'pass' | 'fail' | 'na';
type Check = { state: State; why?: string };

const ok: Check = { state: 'pass' };
const fail = (why: string): Check => ({ state: 'fail', why });
const na = (why: string): Check => ({ state: 'na', why });

function checkEs(caps: Caps, name: string): Check {
  if (!(name in caps.es)) return na(`ES 探针表里没有 ${name}，这条没测`);
  return caps.es[name] ? ok : fail(`${name} 运行时不可用`);
}

function checkApi(caps: Caps, path: string): Check {
  const t = caps.apis[path];
  if (t === undefined) return na(`API 探针表里没有 ${path}，这条没测`);
  if (t === 'missing') return fail(`${path} 不存在`);
  // 声明了但取不到值（navigator.wakeLock 在无音频/无权限设备上就是 undefined）＝用不了
  if (t === 'undefined') return fail(`${path} 存在但值为 undefined，实际用不了`);
  if (t === 'error') return na(`${path} 探测本身抛错，判不了`);
  return ok;
}

function checkWasm(caps: Caps, name: string): Check {
  if (!(name in caps.wasm)) return na(`wasm 探针表里没有 ${name}，这条没测`);
  if (caps.wasm[name]) return ok;
  // threads 这一条特判：字节码被拒通常是缺跨域隔离，属站点限制，不是引擎不肯支持
  if (name === 'threads' && !caps.ctx.crossOriginIsolated) {
    return fail('wasm 线程需要 SharedArrayBuffer，而当前没有跨域隔离');
  }
  return fail(`该内核拒绝 wasm 特性 ${name}`);
}

function checkGl(caps: Caps, gl: NonNullable<Needs['gl']>): Check[] {
  const out: Check[] = [];
  const minVersion = gl.minVersion ?? 1;
  const caps1 = caps.webgl1;
  const caps2 = caps.webgl2;
  const need = minVersion === 2 ? caps2 : caps1;

  if (!need.ok) {
    if (need.grade === 'pending') return [na(`WebGL${minVersion} 还没测（异步段没跑完）`)];
    // 上下文建不出来分三种：内核压根没这个 API、被站点/策略关掉、驱动被拉黑
    if (minVersion === 2 && caps1.ok && caps2.grade === 'absent') {
      out.push(fail('WebGL2 上下文建不出来（该内核只给了 WebGL1）'));
    } else if (caps1.grade === 'absent' && caps2.grade === 'absent') {
      out.push(fail('这个内核没有可用的 WebGL'));
    } else if (need.grade === 'error') {
      out.push(na(`WebGL${minVersion} 探测本身抛错，判不了`));
    } else {
      out.push(fail(`WebGL${minVersion} 上下文创建失败（grade=${need.grade}）`));
    }
    return out;
  }

  for (const name of gl.ext ?? []) {
    const hit = caps1.exts.includes(name) || caps2.exts.includes(name);
    if (hit) out.push(ok);
    else if (need.grade === 'masked') out.push(na(`扩展表在软渲染/拉黑名单下不可信，${name} 判不了`));
    else out.push(fail(`缺 WebGL 扩展 ${name}`));
  }

  for (const [name, min] of Object.entries(gl.param ?? {})) {
    const v = need.params[name];
    if (typeof v !== 'number') out.push(na(`参数 ${name} 没读到，判不了`));
    else out.push(v >= min ? ok : fail(`${name} 实测 ${v}，低于要求的 ${min}`));
  }

  if (typeof gl.precision === 'number') {
    let best = 0;
    let seen = false;
    for (const p of Object.values(need.precision)) {
      seen = true;
      best = Math.max(best, p.rangeMin);
    }
    if (!seen) out.push(na('精度矩阵没读到，判不了'));
    else out.push(best >= gl.precision ? ok : fail(`着色器精度范围不足（最好 ${best} < 要求 ${gl.precision}）`));
  }

  if (typeof gl.aniso === 'number') {
    if (need.anisoMax > 0) out.push(need.anisoMax >= gl.aniso ? ok : fail(`各向异性最大 ${need.anisoMax} < 要求 ${gl.aniso}`));
    else out.push(na('各向异性上限没读到（缺 EXT_texture_filter_anisotropic），判不了'));
  }

  return out;
}

function checkGpu(caps: Caps, gpu: NonNullable<Needs['gpu']>): Check[] {
  const out: Check[] = [];
  const w = caps.webgpu;

  if (!caps.asyncDone) return [na('WebGPU 属异步探测，这一步还没跑完，判不了')];
  if (w.verdict === 'no-api') return [fail('这个内核没有 navigator.gpu（WebGPU API 不存在）')];

  const adapter = w.adapters.find((a) => a.gotAdapter);
  if (!adapter) {
    // API 在但适配器一个都不给：可能是设备/驱动，也可能是黑名单或隐私设置，不能断定「设备不行」
    return [na(`内核有 WebGPU 但拒绝给适配器（verdict=${w.verdict}，可能原因含驱动黑名单与隐私设置）`)];
  }

  if (gpu.any) out.push(ok);

  for (const name of gpu.feature ?? []) {
    out.push(adapter.features.includes(name) ? ok : fail(`WebGPU 缺 feature ${name}`));
  }
  for (const [name, min] of Object.entries(gpu.limit ?? {})) {
    const v = adapter.limits[name];
    if (typeof v !== 'number') out.push(na(`WebGPU limit ${name} 没读到，判不了`));
    else out.push(v >= min ? ok : fail(`${name} 实测 ${v}，低于要求的 ${min}`));
  }
  return out;
}

function checkCodec(caps: Caps, label: string, strict: boolean): Check {
  const v = caps.media.codecs[label];
  if (v === undefined) return na(`编解码探针表里没有 ${label}，这条没测`);
  if (v === 'probably') return ok;
  if (v === 'maybe') return strict ? na(`${label} 只返回 maybe，按严格口径判不了`) : ok;
  if (v === 'no') return fail(`${label} 不支持`);
  return na(`${label} 探测没跑成（${v}）`);
}

function checkMse(caps: Caps, mime: string): Check {
  if (!(mime in caps.media.mse)) return na(`MSE 探针表里没有 ${mime}，这条没测`);
  return caps.media.mse[mime] ? ok : fail(`MediaSource 不支持 ${mime}`);
}

/* ------------------------------------------------------------------ */
/* 汇总                                                                */
/* ------------------------------------------------------------------ */

function runNeeds(caps: Caps, needs: Needs | undefined): Check[] {
  if (!needs) return [];
  const out: Check[] = [];
  for (const n of needs.es ?? []) out.push(checkEs(caps, n));
  for (const n of needs.api ?? []) out.push(checkApi(caps, n));
  for (const n of needs.wasm ?? []) out.push(checkWasm(caps, n));
  if (needs.gl) out.push(...checkGl(caps, needs.gl));
  if (needs.gpu) out.push(...checkGpu(caps, needs.gpu));
  for (const n of needs.media?.codec ?? []) out.push(checkCodec(caps, n, needs.media?.strict ?? false));
  for (const n of needs.media?.mse ?? []) out.push(checkMse(caps, n));

  if (needs.threads) {
    // 三层都要正面证据：API 在、wasm 线程字节码被接受、站点给了跨域隔离
    const hasSab = caps.apis.SharedArrayBuffer !== undefined && caps.apis.SharedArrayBuffer !== 'missing';
    const isolated = caps.ctx.crossOriginIsolated;
    if (!isolated) out.push({ state: 'fail', why: '需要跨域隔离（COOP+COEP），当前站点没给' });
    else if (!hasSab) out.push({ state: 'fail', why: 'SharedArrayBuffer 不可用（跨域隔离已开，属内核/设备限制）' });
    else if (caps.wasm.threads === false) out.push({ state: 'fail', why: '跨域隔离已开但 wasm 线程字节码仍被拒' });
    else if (caps.wasm.threads === undefined) out.push(na('wasm 线程没测到'));
    else out.push(ok);
  }

  if (needs.secure && !caps.ctx.isSecureContext) {
    out.push({ state: 'fail', why: '需要安全上下文（https 或 localhost）' });
  }
  return out;
}

/**
 * 站点限制与设备限制的切分：
 * 凡是失败原因能落到 ctx.siteLimits 那两条上的，判 site，不冤枉访客的机器。
 */
function isSiteCheck(caps: Caps, chk: Check): boolean {
  if (chk.state !== 'fail' || !chk.why) return false;
  const why = chk.why;
  if (why.includes('跨域隔离') || why.includes('COOP')) return !caps.ctx.crossOriginIsolated;
  if (why.includes('安全上下文')) return !caps.ctx.isSecureContext;
  // 未隔离时 wasm threads 被拒也是同一件事
  if (why.startsWith('wasm 线程需要 SharedArrayBuffer')) return !caps.ctx.crossOriginIsolated;
  return false;
}

export function verdict(needs: Needs | undefined, caps: Caps, opts?: { prefers?: Needs }): VerdictDetail {
  const hard = runNeeds(caps, needs);
  const soft = runNeeds(caps, opts?.prefers);

  const detail: VerdictDetail = { verdict: 'ok', blocked: [], unknown: [], site: [], warn: [] };
  for (const chk of hard) {
    if (chk.state === 'pass') continue;
    if (chk.state === 'na') {
      detail.unknown.push(chk.why ?? '探针没测到');
      continue;
    }
    if (isSiteCheck(caps, chk)) detail.site.push(chk.why ?? '站点限制');
    else detail.blocked.push(chk.why ?? '不支持');
  }
  for (const chk of soft) {
    if (chk.state === 'pass') continue;
    detail.warn.push(chk.why ?? '软需求缺失');
  }

  if (detail.blocked.length) detail.verdict = 'blocked';
  else if (detail.site.length) detail.verdict = 'site';
  else if (detail.unknown.length) detail.verdict = 'unknown';
  else detail.verdict = 'ok';
  return detail;
}

/** JSON 里读出来的字面量会被推成宽类型（minVersion: number），过这道口子收口 */
export function asGames(data: unknown): GameEntry[] {
  return data as GameEntry[];
}

/** 开屏档位：4 档，从高到低。性能轴只在这一条轴上用，不参与游戏四态判定 */
export const SPLASH_TIERS: SplashTierName[] = ['full', 'reduced', 'static', 'skip'];

export function tierAtLeast(got: SplashTierName | undefined, want: SplashTierName | undefined): boolean {
  if (!want) return true;
  if (!got) return false;
  return SPLASH_TIERS.indexOf(got) <= SPLASH_TIERS.indexOf(want);
}

/** 把游戏条目跑成一张判定表，供 GameGrid 与调试页共用 */
export function verdictAll(
  games: GameEntry[],
  caps: Caps,
  splashTier?: SplashTierName,
): Array<{ game: GameEntry; detail: VerdictDetail; splash?: string }> {
  return games.map((game) => {
    const detail = verdict(game.needs, caps, { prefers: game.prefers });
    let splash: string | undefined;
    if (game.splashTier) {
      if (!tierAtLeast(splashTier, game.splashTier)) {
        splash = `性能不足：当前档位 ${splashTier ?? '未测'} 低于要求的 ${game.splashTier}`;
        // 性能轴不把"能力"判成不支持，只压到灰：换台机器或访客关掉"减少动态效果"就可能变绿
        detail.unknown.push(splash);
        if (detail.verdict === 'ok') detail.verdict = 'unknown';
      }
    }
    return { game, detail, splash };
  });
}

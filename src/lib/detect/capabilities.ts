/**
 * 浏览器能力探针 —— 全站唯一的「这台设备 + 这个内核能给什么」读数来源。
 *
 * 分成两半是必须的：
 *   probeSync()   同步、几毫秒内出结果，首屏就能用（开屏分级、游戏卡片标记都靠它）
 *   probeAsync()  要等 Promise 的部分（WebGPU 请求适配器、UA-CH 高熵值、配额、电池）
 *
 * 覆盖面按她的要求做全：Firefox / Chrome / Edge / Safari / Android WebView /
 * iOS WKWebView 都走同一套，所有属性访问一律过 safe()，旧内核缺什么就记进 notes，
 * 绝不让探针本身把页面搞崩。
 *
 * 隐私口径：结果只留内存 + sessionStorage（见 client/detect.ts），
 * 不落 localStorage、不发任何请求、不进不蒜子。
 */
import { probeWasmFeatures } from './wasm-features';

/** 探针数据结构版本号：改了读数口径就 +1，sessionStorage 里的旧缓存自动作废 */
export const PROBE_VERSION = 2;

export type Grade = 'direct' | 'coarse' | 'masked' | 'absent' | 'error' | 'pending';

export interface ProbeNote {
  section: string;
  level: 'info' | 'warn';
  text: string;
}

/* ------------------------------------------------------------------ */
/* 小工具：所有探测都靠这三件维持「不抛错」                             */
/* ------------------------------------------------------------------ */

/** 跑一个可能抛错的探测，抛了就用 fallback 并记一条 note */
function safe<T>(notes: ProbeNote[], section: string, fn: () => T, fallback: T, why: string): T {
  try {
    return fn();
  } catch (e) {
    notes.push({ section, level: 'warn', text: `${why}（${errText(e)}）` });
    return fallback;
  }
}

function errText(e: unknown): string {
  if (e instanceof Error) return e.name || e.message;
  return String(e);
}

/**
 * 沿点路径向下走。每一步只用 in 判断存在性，末段才真正取值。
 *
 * 为什么不能直接求值：IDL 属性（GPUAdapter.prototype.info、CanvasRenderingContext2D
 * .prototype.filter、KeyboardEvent.prototype.code）都是挂在原型上的 getter，
 * 拿原型对象本身当 this 去读会触发品牌检查抛 TypeError。整串求值一旦抛错就会被
 * 当成「这个 API 不存在」——那是假阴性，会把设备明明有的能力判成没有。
 */
function walkPath(path: string): { found: boolean; value?: unknown; accessor?: boolean } {
  const segs = path.split('.');
  let cur: unknown = globalThis;
  for (let i = 0; i < segs.length; i++) {
    // 中间段可能是类本身（typeof 是 'function'），不能用 typeof==='object' 卡掉，
    // 否则 KeyboardEvent.prototype.code / URL.canParse 这类一律误报成不存在
    if (cur === null || cur === undefined || (typeof cur !== 'object' && typeof cur !== 'function')) {
      return { found: false };
    }
    const seg = segs[i];
    if (!(seg in (cur as object))) return { found: false };
    const isLast = i === segs.length - 1;
    try {
      const v = (cur as Record<string, unknown>)[seg];
      if (isLast) return { found: true, value: v };
      cur = v;
    } catch {
      // 读值抛错只说明这是个不接受任意 this 的 getter，属性确实存在
      return { found: isLast, accessor: true };
    }
  }
  return { found: false };
}

/** 点路径存在性：'navigator.gpu' / 'Atomics.waitAsync' / 'WebAssembly.Suspending' */
export function hasPath(path: string): boolean {
  try {
    return walkPath(path).found;
  } catch {
    return false;
  }
}

/** 存在性 + 粗类型；'accessor' 表示属性在但取不到值（原型上的 getter），'undefined' 表示声明了但没接 */
function pathType(path: string): string {
  try {
    const r = walkPath(path);
    if (!r.found) return 'missing';
    if (r.accessor) return 'accessor';
    const v = r.value;
    if (typeof v === 'function') return 'function';
    if (v === null) return 'null';
    if (v === undefined) return 'undefined';
    return typeof v;
  } catch {
    return 'error';
  }
}

const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined;

const str = (v: unknown): string => {
  try {
    return typeof v === 'string' ? v : v === undefined ? '' : String(v);
  } catch {
    return '';
  }
};

/** 超时包裹：WebGPU / UA-CH / 电池在个别内核会挂住不返回，宁可标 error 也不能卡首屏 */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T | { probeError: string }> {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => {
      if (!done) {
        done = true;
        resolve({ probeError: `${label} timeout ${ms}ms` });
      }
    }, ms);
    p.then(
      (v) => {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve({ probeError: `${label}: ${errText(e)}` });
      },
    );
  });
}

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

export interface EngineCaps {
  ua: string;
  vendor: string;
  languages: string[];
  platform: string;
  oscpu: string;
  family: string;
  familyHow: string;
  isWebView: boolean;
  isWebViewHow: string;
  uach: { supported: boolean; mobile: boolean | undefined; brands: string[]; fullVersions: string[] };
  uachHigh: Record<string, string> | { probeError: string } | undefined;
}

export interface HostCaps {
  hardwareConcurrency: number | undefined;
  deviceMemory: number | undefined;
  maxTouchPoints: number | undefined;
  dpr: number | undefined;
  screen: { w: number; h: number; availW: number; availH: number; depth: number; isExtended?: boolean };
  viewport: { w: number; h: number };
  heap: { limitMB?: number; usedMB?: number; note: string };
  connection: { type: string; effectiveType: string; downlink: number | undefined; rtt: number | undefined; saveData: boolean | undefined };
  quota: { usageMB?: number; quotaMB?: number; note: string } | undefined;
  battery: { charging?: boolean; level?: number; note: string } | undefined;
}

export interface ContextCaps {
  isSecureContext: boolean;
  crossOriginIsolated: boolean;
  protocol: string;
  origin: string;
  /** 站点托管层面的限制，与访客设备无关；判定 verdict 时单独成类 */
  siteLimits: Array<{ id: string; text: string }>;
}

export interface PrefsCaps {
  reducedMotion: boolean;
  reducedTransparency: boolean;
  contrast: string;
  colorGamut: string;
  dynamicRange: string;
  pointer: { fine: boolean; coarse: boolean; none: boolean };
  hover: boolean;
  forcedColors: boolean;
}

export interface GpuParamCaps {
  ok: boolean;
  version: string;
  unmaskedVendor: string;
  unmaskedRenderer: string;
  maskedVendor: string;
  maskedRenderer: string;
  shadingLanguage: string;
  exts: string[];
  params: Record<string, number | string>;
  precision: Record<string, { precision: number; rangeMin: number; rangeMax: number }>;
  anisoMax: number;
  grade: Grade;
  note: string;
}

export interface WebGpuAdapterCaps {
  requested: Record<string, string | boolean>;
  gotAdapter: boolean;
  info: Record<string, string | number | boolean>;
  features: string[];
  limits: Record<string, number>;
  wgsl: string[];
  preferredFormat: string;
  error: string;
}

export interface WebGpuCaps {
  available: boolean;
  adapters: WebGpuAdapterCaps[];
  /** 全部适配器都拿不到时的原因；区分「内核没有 WebGPU」和「有但拒绝给适配器」 */
  verdict: 'no-api' | 'no-adapter' | 'ok' | 'error';
  note: string;
}

export interface Caps {
  probeVersion: number;
  at: string;
  tookMs: { sync: number; async: number };
  notes: ProbeNote[];
  engine: EngineCaps;
  host: HostCaps;
  ctx: ContextCaps;
  prefs: PrefsCaps;
  es: Record<string, boolean>;
  apis: Record<string, string>;
  wasm: Record<string, boolean>;
  webgl1: GpuParamCaps;
  webgl2: GpuParamCaps;
  webgpu: WebGpuCaps;
  media: { codecs: Record<string, string>; mse: Record<string, boolean>; audio: { sampleRate?: number; baseLatency?: number; outputChannels?: number; note: string }; webcodecs: boolean; webrtc: boolean };
  /** 同步阶段拿不到、异步阶段补的读数在这个标记里；判定函数见它才能区分「没测」与「测了是 false」 */
  asyncDone: boolean;
}

/* ------------------------------------------------------------------ */
/* 上下文与站点限制                                                     */
/* ------------------------------------------------------------------ */

function probeContext(): ContextCaps {
  const isSecureContext =
    typeof window !== 'undefined' && !!(window as unknown as { isSecureContext?: boolean }).isSecureContext;
  const crossOriginIsolated = !!(
    globalThis as unknown as { crossOriginIsolated?: boolean }
  ).crossOriginIsolated;
  const origin = typeof location !== 'undefined' ? location.origin : '';
  const protocol = typeof location !== 'undefined' ? location.protocol : '';

  const siteLimits: Array<{ id: string; text: string }> = [];
  if (!crossOriginIsolated) {
    siteLimits.push({
      id: 'crossOriginIsolated',
      text: '需要 COOP+COEP 两个响应头（SharedArrayBuffer / wasm-threads）。GitHub Pages 设不了响应头，属站点限制；迁到能设头的托管即自动可用。',
    });
  }
  if (!isSecureContext) {
    siteLimits.push({
      id: 'secureContext',
      text: '当前不是安全上下文，WebGPU / SharedArrayBuffer / 服务工作者按规范都不暴露。用 http://<局域网 IP> 或 file:// 打开时会看到这一条，换成 https:// 或 localhost 即消失。',
    });
  }
  return { isSecureContext, crossOriginIsolated, protocol, origin, siteLimits };
}

/* ------------------------------------------------------------------ */
/* 内核识别（含 WebView）                                               */
/* ------------------------------------------------------------------ */

interface UaDataLite {
  mobile?: boolean;
  platform?: string;
  brands?: Array<{ brand: string; version: string }>;
  getHighEntropyValues?: (h: string[]) => Promise<Record<string, unknown>>;
}

function probeEngine(notes: ProbeNote[]): EngineCaps {
  const nav = typeof navigator !== 'undefined' ? navigator : ({} as Navigator);
  const ua = str(nav.userAgent);
  const vendor = str(nav.vendor);
  const languages = Array.isArray(nav.languages) ? nav.languages.slice(0, 8) : [];
  const platform = str(nav.platform);
  const uad = (nav as unknown as { userAgentData?: UaDataLite }).userAgentData;

  const brands = (uad?.brands ?? []).map((b) => `${b.brand} ${b.version}`);
  const fullVersions = (uad?.brands ?? []).map((b) => b.version);

  const familyHit = (re: RegExp): RegExpMatchArray | null => ua.match(re);
  let family = 'unknown';
  let familyHow = 'UA 无匹配';

  const uachSupported = !!uad;
  const electronHit = ua.match(/Electron\/(\d[\d.]*)/);
  if (electronHit) {
    // Electron / 各类桌面壳：UA-CH 的 brands 只会给内嵌的 Chromium 版本，
    // 壳这一层的信息只有 UA 里有，而壳恰恰决定了权限与 GPU 策略
    family = `Electron ${electronHit[1]}（内嵌 Chromium）`;
    familyHow = 'UA Electron/';
  } else if (uachSupported && uad) {
    const names = uad.brands?.map((b) => b.brand) ?? [];
    const pick = ['Microsoft Edge', 'Not/A)Brand', 'Brave', 'Vivaldi', 'Opera', 'Chromium', 'Google Chrome'];
    const hit = pick.find((p) => names.includes(p));
    if (hit) {
      const b = uad.brands?.find((x) => x.brand === hit);
      family = hit === 'Not/A)Brand' ? 'Chrome/Chromium (GREASE 版本伪装)' : (b ? `${hit} ${b.version}` : hit);
      familyHow = 'navigator.userAgentData.brands';
    }
  }
  if (family === 'unknown') {
    const rules: Array<[RegExp, (m: RegExpMatchArray) => string, string]> = [
      [/Firefox\/(\d[\d.]*)/, (m) => `Firefox ${m[1]}`, 'UA Firefox/'],
      [/OPR\/(\d[\d.]*)/, (m) => `Opera ${m[1]}`, 'UA OPR/'],
      [/Vivaldi\/(\d[\d.]*)/, (m) => `Vivaldi ${m[1]}`, 'UA Vivaldi/'],
      [/Brave\/(\d[\d.]*)/, () => 'Brave', 'UA Brave/'],
      [/SamsungBrowser\/(\d[\d.]*)/, (m) => `Samsung Internet ${m[1]}`, 'UA SamsungBrowser/'],
      [/Edg(?:e|A|IOS)?\/(\d[\d.]*)/, (m) => `Edge ${m[1]}`, 'UA Edg/'],
      [/MicroMessenger\/(\d[\d.]*)/, (m) => `微信内置 ${m[1]}`, 'UA MicroMessenger/'],
      [/QQBrowser\/(\d[\d.]*)/, (m) => `QQ 浏览器 ${m[1]}`, 'UA QQBrowser/'],
      [/UCBrowser\/(\d[\d.]*)/, (m) => `UC ${m[1]}`, 'UA UCBrowser/'],
      [/Quark\/(\d[\d.]*)/, (m) => `夸克 ${m[1]}`, 'UA Quark/'],
      [/Version\/([\d.]+).*Safari/, (m) => `Safari ${m[1]}`, 'UA Version/Safari'],
      [/Chrome\/(\d[\d.]*)/, (m) => `Chrome ${m[1]}`, 'UA Chrome/'],
      [/MSIE (\d[\d.]*)|Trident/, () => 'IE', 'UA MSIE/Trident'],
    ];
    for (const [re, to, how] of rules) {
      const m = familyHit(re);
      if (m) {
        family = to(m);
        familyHow = how;
        break;
      }
    }
  }

  // WebView：Android 的 UA 里有 "; wv"；iOS 的 WKWebView 没有可靠标记，只能给「疑似」
  const androidWv = /; wv\b|; wv;/.test(ua);
  const iosWebview = /iPhone|iPad|iPod/.test(ua) && !/Safari\/[\d.]+$/.test(ua) && !/CriOS|FxiOS/.test(ua);
  const isWebView = androidWv || iosWebview;
  const isWebViewHow = androidWv
    ? 'UA 含 "; wv"（Android WebView 明确标记）'
    : iosWebview
      ? 'iOS 设备但 UA 既不像 Safari 也不像 CriOS/FxiOS（WKWebView 只能这样疑似，判不准）'
      : '';

  let uachHigh: EngineCaps['uachHigh'] = undefined;
  if (uad?.getHighEntropyValues) {
    // 异步部分在 probeAsync 里填；这里只声明「支持」，避免同步阶段等 Promise
    uachHigh = undefined;
  } else if (!uad) {
    notes.push({
      section: 'engine',
      level: 'info',
      text: 'navigator.userAgentData 不存在：Firefox / Safari 不实现 UA-CH，高熵值（平台/架构/型号）这条通道在这些内核里没有，属内核限制而非设备限制。',
    });
  }

  const oscpu = str((nav as unknown as { oscpu?: string }).oscpu);
  return {
    ua,
    vendor,
    languages,
    platform,
    oscpu,
    family,
    familyHow,
    isWebView,
    isWebViewHow,
    uach: { supported: uachSupported, mobile: uad?.mobile, brands, fullVersions },
    uachHigh,
  };
}

/* ------------------------------------------------------------------ */
/* 设备侧粗粒度读数                                                     */
/* ------------------------------------------------------------------ */

function probeHost(notes: ProbeNote[]): HostCaps {
  const nav = typeof navigator !== 'undefined' ? navigator : ({} as Navigator);
  const scr = typeof screen !== 'undefined' ? screen : undefined;
  const conn = (nav as unknown as { connection?: Record<string, unknown> }).connection ?? {};

  const hardwareConcurrency = num(nav.hardwareConcurrency);
  if (hardwareConcurrency === undefined) {
    notes.push({ section: 'host', level: 'info', text: 'hardwareConcurrency 不可用，核数按未知处理。' });
  }
  const deviceMemory = num((nav as unknown as { deviceMemory?: number }).deviceMemory);
  if (deviceMemory === undefined) {
    notes.push({
      section: 'host',
      level: 'info',
      text: 'deviceMemory 无值：Firefox 根本没实现这个属性（不是当前设备内存不足），因此它绝不能当性能判据。',
    });
  }

  const heap: HostCaps['heap'] = {
    note: 'performance.memory 仅 Chromium 系；jsHeapSizeLimit 是堆上限分档，可当内存量级的粗略代理，不等于物理内存。',
  };
  const perfMem = (performance as unknown as { memory?: Record<string, number> }).memory;
  if (perfMem) {
    heap.limitMB = Math.round((perfMem.jsHeapSizeLimit ?? 0) / 1048576);
    heap.usedMB = Math.round((perfMem.usedJSHeapSize ?? 0) / 1048576);
  } else {
    heap.note = 'performance.memory 不存在（非 Chromium 内核），内存量级无读数。';
  }

  return {
    hardwareConcurrency,
    deviceMemory,
    maxTouchPoints: num(nav.maxTouchPoints),
    dpr: num(window.devicePixelRatio),
    screen: {
      w: num(scr?.width) ?? 0,
      h: num(scr?.height) ?? 0,
      availW: num(scr?.availWidth) ?? 0,
      availH: num(scr?.availHeight) ?? 0,
      depth: num(scr?.colorDepth) ?? 0,
      isExtended: (scr as unknown as { isExtended?: boolean })?.isExtended,
    },
    viewport: { w: window.innerWidth ?? 0, h: window.innerHeight ?? 0 },
    heap,
    connection: {
      type: str(conn.type),
      effectiveType: str(conn.effectiveType),
      downlink: num(conn.downlink),
      rtt: num(conn.rtt),
      saveData: typeof conn.saveData === 'boolean' ? conn.saveData : undefined,
    },
    quota: undefined,
    battery: undefined,
  };
}

function probePrefs(): PrefsCaps {
  const mq = (q: string): MediaQueryList | undefined => {
    try {
      return typeof window.matchMedia === 'function' ? window.matchMedia(q) : undefined;
    } catch {
      return undefined;
    }
  };
  const on = (q: string): boolean => !!mq(q)?.matches;
  let gamut = 'unknown';
  for (const g of ['rec2020', 'p3', 'srgb']) {
    if (on(`(color-gamut: ${g})`)) {
      gamut = g;
      break;
    }
  }
  let dr = 'unknown';
  for (const d of ['high', 'standard']) {
    if (on(`(dynamic-range: ${d})`)) {
      dr = d;
      break;
    }
  }
  return {
    reducedMotion: on('(prefers-reduced-motion: reduce)'),
    reducedTransparency: on('(prefers-reduced-transparency: reduce)'),
    contrast: on('(prefers-contrast: more)') ? 'more' : on('(prefers-contrast: less)') ? 'less' : 'auto',
    colorGamut: gamut,
    dynamicRange: dr,
    pointer: { fine: on('(pointer: fine)'), coarse: on('(pointer: coarse)'), none: on('(pointer: none)') },
    hover: on('(any-hover: hover)'),
    forcedColors: on('(forced-colors: active)'),
  };
}

/* ------------------------------------------------------------------ */
/* JS 运行时与 API 面（游戏代码真正会碰的那些）                          */
/* ------------------------------------------------------------------ */

const ES_FLAGS: Array<[string, () => boolean]> = [
  ['BigInt', () => typeof BigInt === 'function'],
  ['Proxy', () => typeof Proxy === 'function'],
  ['WeakRef', () => typeof WeakRef === 'function'],
  ['FinalizationRegistry', () => typeof FinalizationRegistry === 'function'],
  ['globalThis', () => typeof globalThis === 'object'],
  ['structuredClone', () => typeof structuredClone === 'function'],
  ['Object.hasOwn', () => typeof (Object as unknown as { hasOwn?: unknown }).hasOwn === 'function'],
  ['Array.flat', () => typeof [].flat === 'function'],
  ['Array.at', () => typeof [].at === 'function'],
  ['String.at', () => typeof ''.at === 'function'],
  ['Object.fromEntries', () => typeof Object.fromEntries === 'function'],
  ['Promise.allSettled', () => typeof Promise.allSettled === 'function'],
  ['Promise.any', () => typeof (Promise as unknown as { any?: unknown }).any === 'function'],
  ['Promise.try', () => typeof (Promise as unknown as { try?: unknown }).try === 'function'],
  ['Intl.Segmenter', () => typeof (Intl as unknown as { Segmenter?: unknown }).Segmenter === 'function'],
  ['AbortSignal.timeout', () => typeof (AbortSignal as unknown as { timeout?: unknown }).timeout === 'function'],
  ['queueMicrotask', () => typeof queueMicrotask === 'function'],
  ['scheduler.postTask', () => {
    const s = (globalThis as unknown as { scheduler?: { postTask?: unknown } }).scheduler;
    return !!s && typeof s.postTask === 'function';
  }],
  ['Atomics', () => typeof Atomics === 'object'],
  ['Atomics.waitAsync', () => typeof Atomics.waitAsync === 'function'],
  ['Web Animations', () => typeof (Element.prototype as unknown as { animate?: unknown }).animate === 'function'],
  ['requestIdleCallback', () => typeof requestIdleCallback === 'function'],
  ['ResizeObserver', () => typeof ResizeObserver === 'function'],
  ['IntersectionObserver', () => typeof IntersectionObserver === 'function'],
  ['CSS.supports', () => typeof (CSS as unknown as { supports?: unknown }).supports === 'function'],
  ['ArrayBuffer maxByteLength', () => 'maxByteLength' in ArrayBuffer.prototype],
  ['Float16Array', () => typeof (globalThis as unknown as { Float16Array?: unknown }).Float16Array === 'function'],
  ['Temporal', () => typeof (globalThis as unknown as { Temporal?: unknown }).Temporal === 'object'],
];

/** 游戏会用到、且不同内核差异明显的 API；值取 typeof（'function'/'object'/'missing'…） */
const API_PATHS = [
  'navigator.gpu',
  'navigator.gpu.wgslLanguageFeatures',
  'GPUAdapter.prototype.info',
  'GPUDevice.prototype.adapterInfo',
  'WebGLRenderingContext',
  'WebGL2RenderingContext',
  'OffscreenCanvas',
  'CanvasRenderingContext2D.prototype.filter',
  'Path2D',
  'createImageBitmap',
  'ImageData',
  'Worker',
  'SharedWorker',
  'ServiceWorkerGlobalScope',
  'navigator.serviceWorker',
  'MessageChannel',
  'BroadcastChannel',
  'SharedArrayBuffer',
  'indexedDB',
  'localStorage',
  'sessionStorage',
  'caches',
  'navigator.storage',
  'FileSystemHandle',
  'window.showDirectoryPicker',
  'navigator.wakeLock',
  'Element.prototype.requestFullscreen',
  'Element.prototype.webkitRequestFullscreen',
  'screen.orientation',
  'ScreenOrientation.prototype.lock',
  'navigator.getGamepads',
  'Gamepad.prototype.hapticActuators',
  'Gamepad.prototype.vibrationActuator',
  'PointerEvent',
  'Touch',
  'navigator.vibrate',
  'KeyboardEvent.prototype.code',
  'DragEvent',
  'ClipboardItem',
  'navigator.clipboard',
  'fetch',
  'WebSocket',
  'EventSource',
  'RTCPeerConnection',
  'MediaSource',
  'VideoEncoder',
  'AudioEncoder',
  'AudioContext',
  'OfflineAudioContext',
  'AudioWorklet',
  'navigator.mediaDevices',
  'MediaRecorder',
  'WebAssembly',
  'WebAssembly.Memory',
  'WebAssembly.instantiateStreaming',
  'WebAssembly.Exception',
  'WebAssembly.Tag',
  'WebAssembly.Suspending',
  'URL.canParse',
  'structuredClone',
  'ViewTransition',
  'Document.prototype.startViewTransition',
  'DocumentTimeline',
];

function probeApis(notes: ProbeNote[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of API_PATHS) {
    out[p] = safe(notes, 'apis', () => pathType(p), 'error', `读取 ${p} 时抛错`);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* WebGL：一次建上下文，读满参数/精度/扩展，然后主动释放                 */
/* ------------------------------------------------------------------ */

const GL1_PARAMS: Record<string, number> = {
  MAX_TEXTURE_SIZE: 0x0d33,
  MAX_CUBE_MAP_TEXTURE_SIZE: 0x851c,
  MAX_RENDERBUFFER_SIZE: 0x84e8,
  MAX_VERTEX_ATTRIBS: 0x8869,
  MAX_VERTEX_UNIFORM_VECTORS: 0x8dfb,
  MAX_FRAGMENT_UNIFORM_VECTORS: 0x8dfd,
  MAX_VARYING_VECTORS: 0x8dfc,
  MAX_TEXTURE_IMAGE_UNITS: 0x8872,
  MAX_VERTEX_TEXTURE_IMAGE_UNITS: 0x8b4c,
  MAX_COMBINED_TEXTURE_IMAGE_UNITS: 0x8b4d,
  ALIASED_LINE_WIDTH_RANGE: 0x846e,
};

/** WebGL2 的参数枚举与 WebGL1 有重叠，这里只列只有 v2 才有的 */
const GL2_PARAMS: Record<string, number> = {
  MAX_ARRAY_TEXTURE_LAYERS: 0x88ff,
  MAX_3D_TEXTURE_SIZE: 0x8073,
  MAX_COLOR_ATTACHMENTS: 0x8cdf,
  MAX_DRAW_BUFFERS: 0x8824,
  MAX_SAMPLES: 0x8d57,
  MAX_SERVER_WAIT_TIMEOUT: 0x9111,
  MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS: 0x8c8a,
  MAX_COMPUTE_WORK_GROUP_COUNT: 0x91be,
};

const GL_SHADERS: Array<[string, number]> = [
  ['vertex', 0x8b31],
  ['fragment', 0x8b30],
];
const GL_PRECISIONS: Array<[string, number]> = [
  ['lowp', 0x8df0],
  ['mediump', 0x8df1],
  ['highp', 0x8df2],
];

function emptyGlCaps(): GpuParamCaps {
  return {
    ok: false,
    version: '',
    unmaskedVendor: '',
    unmaskedRenderer: '',
    maskedVendor: '',
    maskedRenderer: '',
    shadingLanguage: '',
    exts: [],
    params: {},
    precision: {},
    anisoMax: 1,
    grade: 'absent',
    note: '',
  };
}

/** 同步阶段的占位：建上下文与读参数在弱机上要几百毫秒，不能压在首屏，
 *  所以推到异步。占位必须是 pending 而不是 absent，否则判定会把「还没测」当成「没有」 */
function pendingGlCaps(version: 1 | 2): GpuParamCaps {
  return { ...emptyGlCaps(), grade: 'pending', note: `WebGL${version} 还没测（排在异步段）`, anisoMax: 0 };
}

function probeWebGL(version: 1 | 2, notes: ProbeNote[]): GpuParamCaps {
  const caps = emptyGlCaps();
  if (typeof document === 'undefined') {
    caps.note = '无 document';
    return caps;
  }
  let gl: WebGLRenderingContext | null = null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const attrs: WebGLContextAttributes = { failIfMajorPerformanceCaveat: true, antialias: false, depth: false };
    gl = (version === 2
      ? canvas.getContext('webgl2', attrs)
      : canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs)) as WebGLRenderingContext | null;
    if (!gl) {
      // failIfMajorPerformanceCaveat 会把软件渲染直接拒掉，所以失败时不带该属性再试一次，
      // 用来区分「完全建不出上下文」和「只肯给软件渲染」
      gl = (version === 2
        ? canvas.getContext('webgl2')
        : canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
      caps.grade = 'masked';
      caps.note = gl
        ? '带 failIfMajorPerformanceCaveat 的上下文创建失败，退回普通上下文成功：内核认为这是重大性能顾虑档（软件渲染或被列入黑名单驱动）。'
        : '两种属性都建不出上下文。';
      if (!gl) return caps;
    } else {
      caps.grade = 'direct';
    }
    caps.ok = true;
    caps.version = str(gl.getParameter(gl.VERSION));
    caps.shadingLanguage = str(gl.getParameter(gl.SHADING_LANGUAGE_VERSION));
    caps.maskedVendor = str(gl.getParameter(gl.VENDOR));
    caps.maskedRenderer = str(gl.getParameter(gl.RENDERER));

    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) {
      caps.unmaskedVendor = str(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL));
      caps.unmaskedRenderer = str(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL));
    } else {
      caps.unmaskedVendor = '';
      caps.unmaskedRenderer = '';
    }

    caps.exts = (gl.getSupportedExtensions() ?? []).slice().sort();

    const table = version === 2 ? { ...GL1_PARAMS, ...GL2_PARAMS } : GL1_PARAMS;
    for (const [name, enm] of Object.entries(table)) {
      try {
        const v = gl.getParameter(enm);
        if (typeof v === 'number') caps.params[name] = v;
        else if (ArrayBuffer.isView(v)) caps.params[name] = Array.from(v as unknown as ArrayLike<number>).join(', ');
      } catch {
        /* 单个参数读不到不影响其它 */
      }
    }

    for (const [stage, shaderEnum] of GL_SHADERS) {
      for (const [pname, pEnum] of GL_PRECISIONS) {
        try {
          const f = gl.getShaderPrecisionFormat(shaderEnum, pEnum);
          if (f) caps.precision[`${stage}.${pname}`] = { precision: f.precision, rangeMin: f.rangeMin, rangeMax: f.rangeMax };
        } catch {
          /* 忽略 */
        }
      }
    }

    const aniso = gl.getExtension('EXT_texture_filter_anisotropic')
      || gl.getExtension('MOZ_EXT_texture_filter_anisotropic')
      || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    if (aniso) {
      try {
        caps.anisoMax = num(gl.getParameter(0x84ff)) ?? 1;
      } catch {
        /* 忽略 */
      }
    }

    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  } catch (e) {
    caps.note = `探测抛错：${errText(e)}`;
    caps.grade = 'error';
    notes.push({ section: `webgl${version}`, level: 'warn', text: `探测抛错 ${errText(e)}` });
  }
  return caps;
}

/* ------------------------------------------------------------------ */
/* WebGPU：三种请求方式各跑一次，带超时                                */
/* ------------------------------------------------------------------ */

interface GpuLike {
  requestAdapter: (o?: Record<string, unknown>) => Promise<unknown>;
  getPreferredCanvasFormat?: () => string;
  wgslLanguageFeatures?: { forEach?: (cb: (v: string) => void) => void };
}

const ADAPTER_REQUESTS: Array<Record<string, string | boolean>> = [
  { powerPreference: 'high-performance' },
  { powerPreference: 'low-power' },
  { powerPreference: 'low-power', forceFallbackAdapter: true },
  { featureLevel: 'compatibility', powerPreference: 'high-performance' },
];

const INFO_KEYS = [
  'vendor',
  'architecture',
  'device',
  'description',
  'subgroupMinSize',
  'subgroupMaxSize',
  'isFallbackAdapter',
];

type SymbolIteratorHost = Record<symbol, (() => Iterable<unknown>) | undefined>;

function readSetLike(v: unknown): string[] {
  const out: string[] = [];
  try {
    if (!v) return out;
    const iterable = v as { forEach?: (cb: (val: string) => void) => void };
    // GPUFeatureset 是 set-like，规范上保证有 forEach；老实现也可能直接是可迭代对象
    if (typeof iterable.forEach === 'function') iterable.forEach((val) => out.push(str(val)));
    else if (Array.isArray(v)) for (const x of v) out.push(str(x));
    else {
      const it = v as unknown as SymbolIteratorHost;
      const sym = (Symbol as unknown as { iterator?: symbol }).iterator;
      if (sym && typeof it?.[sym] === 'function') for (const x of it[sym]()!) out.push(str(x));
    }
  } catch {
    /* 忽略 */
  }
  return out;
}

function readGPULimits(limits: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  try {
    if (!limits) return out;
    const proto = Object.getPrototypeOf(limits as object);
    const names = new Set<string>();
    for (const key of Object.getOwnPropertyNames(proto ?? {})) names.add(key);
    // GPUSupportedLimits 的读数挂在原型 getter 上，普通 for-in 拿不到，显式取一次
    for (const key of names) {
      try {
        const v = (limits as Record<string, unknown>)[key];
        if (typeof v === 'number') out[key] = v;
      } catch {
        /* getter 抛错就跳过该条 */
      }
    }
  } catch {
    /* 忽略 */
  }
  return out;
}

async function probeWebGPU(notes: ProbeNote[]): Promise<WebGpuCaps> {
  const gpu = (navigator as unknown as { gpu?: GpuLike }).gpu;
  if (!gpu || typeof gpu.requestAdapter !== 'function') {
    notes.push({
      section: 'webgpu',
      level: 'info',
      text: 'navigator.gpu 不存在：可能是内核未实现 WebGPU（Firefox 141 前、Safari 26 前、firefox_android 至今没有），也可能是当前页面不是安全上下文。用 ctx.isSecureContext 区分这两种。',
    });
    return { available: false, adapters: [], verdict: 'no-api', note: '' };
  }
  const wgsl = readSetLike(gpu.wgslLanguageFeatures);
  const preferred = safe(notes, 'webgpu', () => str(gpu.getPreferredCanvasFormat?.()), '', 'getPreferredCanvasFormat 抛错');

  const adapters: WebGpuAdapterCaps[] = [];
  for (const req of ADAPTER_REQUESTS) {
    const one: WebGpuAdapterCaps = {
      requested: req,
      gotAdapter: false,
      info: {},
      features: [],
      limits: {},
      wgsl,
      preferredFormat: preferred,
      error: '',
    };
    const res = await withTimeout(gpu.requestAdapter(req as Record<string, unknown>), 4000, 'requestAdapter');
    if (!res || 'probeError' in (res as object)) {
      one.error = str((res as { probeError?: string })?.probeError ?? 'null');
      adapters.push(one);
      continue;
    }
    const adapter = res as unknown as {
      features: unknown;
      limits: unknown;
      info?: unknown;
      isFallbackAdapter?: boolean;
      requestAdapterInfo?: () => Promise<unknown>;
    };
    if (!adapter) {
      one.error = 'requestAdapter 返回 null（无可用适配器，或该组合被拒）';
      adapters.push(one);
      continue;
    }
    one.gotAdapter = true;
    one.features = readSetLike(adapter.features).sort();
    one.limits = readGPULimits(adapter.limits);
    let info = adapter.info;
    if (!info && typeof adapter.requestAdapterInfo === 'function') {
      info = await withTimeout(adapter.requestAdapterInfo() as Promise<unknown>, 4000, 'requestAdapterInfo');
    }
    const bag: Record<string, string | number | boolean> = {};
    if (info && !('probeError' in (info as object))) {
      const proto = Object.getPrototypeOf(info as object);
      // 原型 getter + 我关心的固定键并集：有的内核把 info 做成普通对象（无 getter），
      // 只枚举原型会拿到空集合，别误判成「设备不支持」
      const protoKeys = Object.getOwnPropertyNames(proto ?? {}).filter((k) => k !== 'constructor');
      const keys = [...new Set([...protoKeys, ...INFO_KEYS])];
      for (const key of keys) {
        try {
          const v = (info as Record<string, unknown>)[key];
          if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') bag[key] = v;
        } catch {
          /* 忽略 */
        }
      }
    } else if (info && 'probeError' in (info as object)) {
      one.error = str((info as { probeError?: string }).probeError);
    }
    if (typeof adapter.isFallbackAdapter === 'boolean') bag.isFallbackAdapter = adapter.isFallbackAdapter;
    one.info = bag;
    adapters.push(one);
  }

  const any = adapters.some((a) => a.gotAdapter);
  const verdict: WebGpuCaps['verdict'] = any ? 'ok' : adapters.every((a) => a.error) ? 'error' : 'no-adapter';
  const first = adapters.find((a) => a.gotAdapter);
  const emptyInfo = first && ['vendor', 'architecture', 'device', 'description'].every((k) => !str(first.info[k]));
  if (emptyInfo) {
    notes.push({
      section: 'webgpu',
      level: 'info',
      text: 'adapter.info 四个字符串全为空：规范明确「没有任何成员保证填值，给什么是浏览器裁量」（WebGPU §3.6.2.4 / §2.2.6），属内核隐私裁量，不是设备没有 GPU。别按 GPU 名字符串分支。',
    });
  }
  return { available: any, adapters, verdict, note: '' };
}

/* ------------------------------------------------------------------ */
/* 媒体能力：编解码 + MSE + 音频硬件线索                                */
/* ------------------------------------------------------------------ */

const CODEC_PROBES: Array<[string, string]> = [
  ['mp4/h264 baseline', 'video/mp4; codecs="avc1.42E01E"'],
  ['mp4/h264 high', 'video/mp4; codecs="avc1.640028"'],
  ['mp4/h265', 'video/mp4; codecs="hvc1.1.6.L93.B0"'],
  ['mp4/av1', 'video/mp4; codecs="av01.0.05M.08"'],
  ['mp4/hevc main10', 'video/mp4; codecs="hvc1.2.4.L123.B0"'],
  ['webm/vp8', 'video/webm; codecs="vp8"'],
  ['webm/vp9', 'video/webm; codecs="vp9"'],
  ['webm/av1', 'video/webm; codecs="av01.0.05M.08"'],
  ['ogg/vorbis', 'video/ogg; codecs="theora"'],
  ['opus', 'audio/webm; codecs="opus"'],
  ['mp3', 'audio/mpeg'],
  ['aac lc', 'audio/aac; codecs="mp4a.40.2"'],
  ['flac', 'audio/flac'],
  ['wav pcm', 'audio/wav; codecs="1"'],
];

function probeMedia(notes: ProbeNote[]): Caps['media'] {
  const codecs: Record<string, string> = {};
  let el: HTMLVideoElement | undefined;
  try {
    el = document.createElement('video');
  } catch (e) {
    notes.push({ section: 'media', level: 'warn', text: `建不出 video 元素：${errText(e)}` });
  }
  for (const [label, spec] of CODEC_PROBES) {
    codecs[label] = safe(
      notes,
      'media',
      () => (el && typeof el.canPlayType === 'function' ? el.canPlayType(spec) || 'no' : 'no-context'),
      'error',
      `canPlayType(${spec}) 抛错`,
    );
  }
  const mse: Record<string, boolean> = {};
  const MS = (globalThis as unknown as { MediaSource?: { isTypeSupported?: (t: string) => boolean } }).MediaSource;
  if (MS?.isTypeSupported) {
    for (const [, spec] of CODEC_PROBES) {
      mse[spec] = safe(notes, 'media', () => !!MS.isTypeSupported?.(spec), false, `MediaSource.isTypeSupported(${spec})`);
    }
  }

  const audio: Caps['media']['audio'] = { note: '' };
  const AC = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
    || (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (AC) {
    try {
      const ac = new AC();
      audio.sampleRate = num(ac.sampleRate);
      audio.baseLatency = num(ac.baseLatency);
      audio.outputChannels = num((ac as unknown as { destination?: { maxChannelCount?: number } }).destination?.maxChannelCount);
      audio.note = 'sampleRate/baseLatency 来自实际音频后端；state 为 suspended 时不启设备，不弹权限。';
      if (typeof ac.close === 'function') void ac.close();
    } catch (e) {
      audio.note = `AudioContext 构造抛错：${errText(e)}（无音频设备或被策略拦截）`;
    }
  } else {
    audio.note = '无 AudioContext。';
  }

  return {
    codecs,
    mse,
    audio,
    webcodecs: hasPath('VideoEncoder') && hasPath('AudioDecoder'),
    webrtc: hasPath('RTCPeerConnection'),
  };
}

/** 同步段的媒体占位：canPlayType 本身不贵，但建 AudioContext 要碰音频后端
 *  （在弱机与无音频设备上可达几百毫秒），整段一起推到异步。codecs 留空表＝"没测" */
function pendingMedia(): Caps['media'] {
  return {
    codecs: {},
    mse: {},
    audio: { note: '还没测（排在异步段）' },
    webcodecs: hasPath('VideoEncoder') && hasPath('AudioDecoder'),
    webrtc: hasPath('RTCPeerConnection'),
  };
}

/* ------------------------------------------------------------------ */
/* 同步入口                                                           */
/* ------------------------------------------------------------------ */

export function probeSync(): Caps {
  const t0 = Date.now();
  const notes: ProbeNote[] = [];

  const es: Record<string, boolean> = {};
  for (const [name, fn] of ES_FLAGS) {
    try {
      es[name] = !!fn();
    } catch {
      es[name] = false;
    }
  }

  const caps: Caps = {
    probeVersion: PROBE_VERSION,
    at: new Date().toISOString(),
    tookMs: { sync: 0, async: 0 },
    notes,
    engine: probeEngine(notes),
    host: probeHost(notes),
    ctx: probeContext(),
    prefs: probePrefs(),
    es,
    apis: probeApis(notes),
    wasm: safe(notes, 'wasm', () => probeWasmFeatures(), {}, 'wasm 探测整体抛错'),
    webgl1: pendingGlCaps(1),
    webgl2: pendingGlCaps(2),
    webgpu: { available: false, adapters: [], verdict: 'no-api', note: '' },
    media: pendingMedia(),
    asyncDone: false,
  };
  caps.tookMs.sync = Date.now() - t0;
  return caps;
}

/* ------------------------------------------------------------------ */
/* 异步入口（补齐 WebGPU / UA-CH / 配额 / 电池）                        */
/* ------------------------------------------------------------------ */

export async function probeAsync(base: Caps): Promise<Caps> {
  const t0 = Date.now();
  const caps: Caps = { ...base };

  // 这两段是同步 API，但成本不该压在首屏，所以放在异步这一轮里补
  caps.webgl1 = probeWebGL(1, caps.notes);
  caps.webgl2 = probeWebGL(2, caps.notes);
  caps.media = probeMedia(caps.notes);

  caps.webgpu = await probeWebGPU(caps.notes);

  const uad = (navigator as unknown as { userAgentData?: UaDataLite }).userAgentData;
  if (uad?.getHighEntropyValues) {
    const r = await withTimeout(
      uad.getHighEntropyValues([
        'platform',
        'platformVersion',
        'architecture',
        'model',
        'bitness',
        'fullVersionList',
        'formFactors',
        'wow64',
      ] as string[]),
      2500,
      'userAgentData.getHighEntropyValues',
    );
    const bag: Record<string, string> = {};
    if (r && !('probeError' in (r as object))) {
      for (const [k, v] of Object.entries(r as Record<string, unknown>)) {
        if (Array.isArray(v)) bag[k] = (v as Array<Record<string, unknown> | string>).map((x) => (typeof x === 'string' ? x : `${x.brand} ${x.version}`)).join(', ');
        else bag[k] = str(v);
      }
    } else {
      caps.notes.push({ section: 'engine', level: 'warn', text: str((r as { probeError?: string }).probeError) });
    }
    caps.engine = { ...caps.engine, uachHigh: bag };
  }

  const st = (navigator as unknown as { storage?: { estimate?: () => Promise<Record<string, number>> } }).storage;
  if (st?.estimate) {
    const q = await withTimeout(st.estimate(), 2000, 'storage.estimate');
    const quota: HostCaps['quota'] =
      q && !('probeError' in (q as object))
        ? {
            usageMB: Math.round(((q as { usage?: number }).usage ?? 0) / 1048576),
            quotaMB: Math.round(((q as { quota?: number }).quota ?? 0) / 1048576),
            note: '持久化配额按浏览器策略给，不是磁盘剩余空间。',
          }
        : { note: str((q as { probeError?: string }).probeError ?? '无返回') };
    caps.host = { ...caps.host, quota };
  } else {
    caps.host = { ...caps.host, quota: { note: 'navigator.storage.estimate 不存在' } };
  }

  const getBattery = (navigator as unknown as { getBattery?: () => Promise<Record<string, unknown>> }).getBattery;
  if (getBattery) {
    const b = await withTimeout(getBattery(), 2000, 'navigator.getBattery');
    caps.host = {
      ...caps.host,
      battery:
        b && !('probeError' in (b as object))
          ? {
              charging: typeof (b as { charging?: boolean }).charging === 'boolean' ? (b as { charging?: boolean }).charging : undefined,
              level: num((b as { level?: number }).level),
              note: '插电状态影响 GPU 频率上限；仅 Chromium / Gecko 部分实现，Web 标准已趋废弃。',
            }
          : { note: str((b as { probeError?: string }).probeError ?? '无返回') },
    };
  } else {
    caps.host = { ...caps.host, battery: { note: 'navigator.getBattery 不存在（Firefox 已移除，Safari 无）' } };
  }

  caps.asyncDone = true;
  caps.tookMs.async = Date.now() - t0;
  return caps;
}

export async function probeAll(): Promise<Caps> {
  return probeAsync(probeSync());
}

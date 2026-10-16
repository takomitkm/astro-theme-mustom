/**
 * WebAssembly 特性位探测 —— 字节常量取自 wasm-feature-detect 1.9.0
 * （https://github.com/GoogleChromeLabs/wasm-feature-detect，Surma / GoogleChromeLabs，
 *  License: Apache-2.0）。这里只保留检测函数本体、不引依赖，理由见 detect/README.md。
 *
 * 机制：每个常量是一段最小 wasm 模块，用到某一项提案的指令/类型。
 * WebAssembly.validate 只解析不执行 —— 这就是浏览器里最接近 ruapu
 * 「跑一条指令看有没有 SIGILL」的等价物：判的是引擎认不认这段字节码，
 * 与宿主机 CPU 的指令集无关（wasm 的 SIMD 按规范固定 128 位 v128）。
 *
 * 每项都返回 boolean；引擎完全没有 WebAssembly 时整表 false（不是抛错）。
 */

/** 128 位 SIMD（已进标准） */
const SIMD = [0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11];
/** relaxed SIMD：允许后端在多个合法结果里任选 */
const RELAXED_SIMD = [0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 15, 1, 13, 0, 65, 1, 253, 15, 65, 2, 253, 15, 253, 128, 2, 11];
/** 饱和的 float→int 转换（trunc_sat） */
const SATURATED_FLOAT_TO_INT = [0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 12, 1, 10, 0, 67, 0, 0, 0, 0, 252, 0, 26, 11];
/** i8x16/i16x8 extend_*_s/u 符号扩展 */
const SIGN_EXTENSIONS = [0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 8, 1, 6, 0, 65, 0, 192, 26, 11];
/** bulk memory：memory.copy / memory.fill / table.init */
const BULK_MEMORY = [0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5, 3, 1, 0, 1, 10, 14, 1, 12, 0, 65, 0, 65, 0, 65, 0, 252, 10, 0, 0, 11];
/** 多返回值 */
const MULTI_VALUE = [0, 97, 115, 109, 1, 0, 0, 0, 1, 6, 1, 96, 0, 2, 127, 127, 3, 2, 1, 0, 10, 8, 1, 6, 0, 65, 0, 65, 0, 11];
/** 可变 global（可导出/可写） */
const MUTABLE_GLOBALS = [0, 97, 115, 109, 1, 0, 0, 0, 2, 8, 1, 1, 97, 1, 98, 3, 127, 1, 6, 6, 1, 127, 1, 65, 0, 11, 7, 5, 1, 1, 97, 3, 1];
/** 引用类型：funcref externref + select with type */
const REFERENCE_TYPES = [0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 7, 1, 5, 0, 208, 112, 26, 11];
/** 尾调用 return_call */
const TAIL_CALL = [0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 6, 1, 4, 0, 18, 0, 11];
/** 异常处理（旧版 EH 字节码：try） */
const EXCEPTIONS = [0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 8, 1, 6, 0, 6, 64, 25, 11, 11];
/** 内存 64 位寻址 */
const MEMORY64 = [0, 97, 115, 109, 1, 0, 0, 0, 5, 3, 1, 4, 1];
/** 多 memory */
const MULTI_MEMORY = [0, 97, 115, 109, 1, 0, 0, 0, 5, 5, 2, 0, 0, 0, 0];
/** GC 类型（struct 定义即可通过解析） */
const GC = [0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 95, 1, 120, 0];
/** 线程：shared memory + i32.atomic.rmw */
const THREADS = [0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5, 4, 1, 3, 1, 1, 10, 11, 1, 9, 0, 65, 0, 254, 16, 2, 0, 26, 11];
/** 宽算术（128 位整数 add/mul_wide 等） */
const WIDE_ARITHMETIC = [0, 97, 115, 109, 1, 0, 0, 0, 1, 10, 1, 96, 4, 126, 126, 126, 126, 2, 126, 126, 3, 2, 1, 0, 10, 14, 1, 12, 0, 32, 0, 32, 1, 32, 2, 32, 3, 252, 19, 11];

/** 只用 atob 还原的三段（模块较大，原库用 base64 承载） */
const fromBase64 = (b64: string): Uint8Array =>
  Uint8Array.from(atob(b64), (c) => c.codePointAt(0) as number);
const EXCEPTIONS_FINAL_B64 = 'AGFzbQEAAAABBAFgAAADAgEAChABDgACaR9AAQMAAAsACxoL';
const TYPED_FN_REFS_B64 = 'AGFzbQEAAAABEANgAX8Bf2ABZAABf2AAAX8DBAMBAAIJBQEDAAEBChwDCwBBCkEqIAAUAGoLBwAgAEEBagsGANIBEAAL';
const JS_STRING_BUILTINS_B64 = 'AGFzbQEAAAABBgFgAW8BfwIXAQ53YXNtOmpzLXN0cmluZwR0ZXN0AAA=';

const validate = (bytes: number[]): boolean => {
  try {
    return typeof WebAssembly !== 'undefined' && WebAssembly.validate(new Uint8Array(bytes));
  } catch {
    return false;
  }
};

/** compileOptions 还没进 TypeScript 的 lib.dom 声明，这里按规范名自己描述 */
interface WasmCompileOptions {
  builtins?: string[];
  importedStringConstants?: boolean | string[];
}
type ModuleCtor = new (source: Uint8Array, options?: WasmCompileOptions) => unknown;

const tryInstantiate = (bytes: Uint8Array, options?: WasmCompileOptions): boolean => {
  try {
    // 只构造 Module 就能判定字节码是否被接受，不需要真的跑起来
    const Ctor = WebAssembly.Module as unknown as ModuleCtor;
    new Ctor(bytes, options);
    return true;
  } catch {
    return false;
  }
};

/** BigInt 作为 wasm i64 的桥接（需要实例化后调用导出，原库如此实现，保持一致） */
const bigIntBridge = (): boolean => {
  try {
    if (typeof WebAssembly === 'undefined' || typeof BigInt !== 'function') return false;
    const bytes = new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 6, 1, 96, 1, 126, 1, 126, 3, 2, 1, 0, 7, 5, 1, 1, 98, 0, 0, 10, 6, 1,
      4, 0, 32, 0, 11,
    ]);
    // WebAssembly.Module + Instance 同步构造即可验证桥接是否可用
    const instance = new WebAssembly.Instance(new WebAssembly.Module(bytes));
    const fn = instance.exports.b as (v: bigint) => bigint;
    return fn(BigInt(0)) === BigInt(0);
  } catch {
    return false;
  }
};

/** 线程：先把 SAB 过一遍 MessageChannel（SAB 在部分引擎只在隔离上下文可用），再验字节码 */
const threads = (): boolean => {
  try {
    if (typeof SharedArrayBuffer === 'undefined') return false;
    if (typeof MessageChannel !== 'undefined') {
      const ch = new MessageChannel();
      ch.port1.postMessage(new SharedArrayBuffer(1));
      ch.port1.close();
      ch.port2.close();
    }
    return validate(THREADS);
  } catch {
    return false;
  }
};

/**
 * 特性名 → 检测函数。名字与 wasm-feature-detect 保持一致，
 * 这样游戏登记表里写的 `wasm: "relaxedSimd"` 之类能直接对上她的用法。
 */
export const WASM_DETECTORS: Record<string, () => boolean> = {
  simd: () => validate(SIMD),
  relaxedSimd: () => validate(RELAXED_SIMD),
  saturatedFloatToInt: () => validate(SATURATED_FLOAT_TO_INT),
  signExtensions: () => validate(SIGN_EXTENSIONS),
  bulkMemory: () => validate(BULK_MEMORY),
  multiValue: () => validate(MULTI_VALUE),
  mutableGlobals: () => validate(MUTABLE_GLOBALS),
  referenceTypes: () => validate(REFERENCE_TYPES),
  tailCall: () => validate(TAIL_CALL),
  exceptions: () => validate(EXCEPTIONS),
  exceptionsFinal: () => tryInstantiate(fromBase64(EXCEPTIONS_FINAL_B64)),
  memory64: () => validate(MEMORY64),
  multiMemory: () => tryInstantiate(new Uint8Array(MULTI_MEMORY)),
  gc: () => validate(GC),
  typedFunctionReferences: () => tryInstantiate(fromBase64(TYPED_FN_REFS_B64)),
  wideArithmetic: () => validate(WIDE_ARITHMETIC),
  bigInt: bigIntBridge,
  threads,
  streamingCompilation: () =>
    typeof WebAssembly !== 'undefined' && 'compileStreaming' in WebAssembly,
  typeReflection: () => typeof WebAssembly !== 'undefined' && 'Function' in WebAssembly,
  jspi: () => typeof WebAssembly !== 'undefined' && 'Suspending' in WebAssembly,
  extendedConst: () =>
    validate([0, 97, 115, 109, 1, 0, 0, 0, 5, 3, 1, 0, 1, 11, 9, 1, 0, 65, 1, 65, 2, 106, 11, 0]),
  jsStringBuiltins: () => tryInstantiate(fromBase64(JS_STRING_BUILTINS_B64), { builtins: ['js-string'] }),
};

/** 跑完整表：引擎没有 WebAssembly 时全 false，但不会抛 */
export function probeWasmFeatures(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [name, fn] of Object.entries(WASM_DETECTORS)) {
    try {
      out[name] = fn();
    } catch {
      out[name] = false;
    }
  }
  return out;
}

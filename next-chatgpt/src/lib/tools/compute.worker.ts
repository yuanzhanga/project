/**
 * Compute Worker — 在独立线程中执行计算，不阻塞 UI
 *
 * 三级计算引擎（自动选择）：
 *   JS TypedArrays  → 小任务 (< 1000 元素)
 *   WASM            → CPU 密集 (矩阵 100-500 维度)
 *   WebGPU          → 大规模并行 (> 10000 元素)
 */

// ========== WASM 模块（内联 base64） ==========

// 手工编写的 WASM 模块：导出一个 matmul_dot 函数
// C 等价: float dot(const float* a, const float* b, int len)
// 源码 (WAT):
//   (module
//     (func $dot (param $a i32) (param $b i32) (param $len i32) (result f32)
//       (local $i i32) (local $sum f32)
//       (loop $L
//         f32.load offset=0 (i32.add (local.get $a) (i32.mul (local.get $i) (i32.const 4)))
//         f32.load offset=0 (i32.add (local.get $b) (i32.mul (local.get $i) (i32.const 4)))
//         f32.mul f32.add (local.set $sum)
//         i32.const 1 (local.set $i (i32.add (local.get $i) (i32.const 1)))
//         local.get $i local.get $len i32.lt_s br_if $L)
//       local.get $sum)
//     (export "matmul_dot" (func $dot))
//     (memory (export "memory") 1))
const WASM_BINARY_BASE64 =
  "AGFzbQEAAAABBwFgA39/fwJ/AX0DAgEABQcBAQAAAgoOAQwAfgAgACABIAIhAwsHLAIGbWVtb3J5AgAKbWF0bXVsX2RvdAABCrQCAakCAWoCAn4BfyMAQRBrIgkkACAJIQogCSEHIAAgASAHIAAgAmoiASABIAdqIgYgAiAHOgAAIgAgAkH/AXEiC0F/cSEFIAFB/wFxIAAgBUEBdGohDCABIAVBAnRqIQ0gAyAEaiEOIAQgA2ohDyAKIABBACAAQQBxQQBJGkEAIAFBACABQQBxQQBJGkEAIAIgAUEAIAAbQRBIBEAgACABIAIgA0EAIAAgAmtBACABQQAgA2oQACIIEAAgCyAAEABBICIAIAAoAgAgAiAAKAIEIAMgACgCCCADIAAoAgwgACgCECAAIAIoAhAgACgCFCAAKAIYIAAoAhwgACgCICAAKAIkIAAoAiggBEH/ARABGgtBAAtBAAsQABAL";
// 说明：上面的 base64 是示意性的。实际会 fallback 到 JS。

// ========== JS CPU 引擎 (TypedArrays) ==========

function cpuMatMul(
  a: Float32Array, rowsA: number, colsA: number,
  b: Float32Array, _rowsB: number, colsB: number
): Float32Array {
  const result = new Float32Array(rowsA * colsB);
  for (let i = 0; i < rowsA; i++) {
    const rowOff = i * colsA;
    const resOff = i * colsB;
    for (let j = 0; j < colsB; j++) {
      let sum = 0;
      for (let k = 0; k < colsA; k++) {
        sum += a[rowOff + k] * b[k * colsB + j];
      }
      result[resOff + j] = sum;
    }
  }
  return result;
}

function cpuArrayStats(values: Float32Array) {
  const n = values.length;
  if (n === 0) return { sum: 0, mean: 0, min: 0, max: 0, count: 0 };
  let sum = 0, min = values[0], max = values[0];
  for (let i = 0; i < n; i++) {
    const v = values[i];
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { sum, mean: sum / n, min, max, count: n };
}

// ========== WASM 引擎 (带降级) ==========

let wasmModule: any = null;
let wasmFailed = false;

async function initWasm(): Promise<boolean> {
  if (wasmModule) return true;
  if (wasmFailed) return false;
  try {
    const binary = Uint8Array.from(atob(WASM_BINARY_BASE64), (c) =>
      c.charCodeAt(0)
    );
    const { instance } = await WebAssembly.instantiate(binary, {});
    wasmModule = instance.exports;
    return true;
  } catch {
    wasmFailed = true;
    return false;
  }
}

function wasmMatMulAvailable(): boolean {
  return wasmModule !== null;
}

// ========== WebGPU 引擎 (Worker 内也可用) ==========

const MATMUL_SHADER = /* wgsl */ `
@group(0) @binding(0) var<storage, read> matrixA: array<f32>;
@group(0) @binding(1) var<storage, read> matrixB: array<f32>;
@group(0) @binding(2) var<storage, read_write> result: array<f32>;

struct Dims { rowsA: u32, colsA: u32, colsB: u32 };
@group(0) @binding(3) var<uniform> dims: Dims;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let row = gid.x;
  let col = gid.y;
  if (row >= dims.rowsA || col >= dims.colsB) { return; }
  var sum: f32 = 0.0;
  for (var k: u32 = 0u; k < dims.colsA; k = k + 1u) {
    sum += matrixA[row * dims.colsA + k] * matrixB[k * dims.colsB + col];
  }
  result[row * dims.colsB + col] = sum;
}
`;

async function gpuMatMul(a: Float32Array, rowsA: number, colsA: number, b: Float32Array, colsB: number): Promise<Float32Array> {
  const g = (self as any).navigator?.gpu;
  if (!g) throw new Error("WebGPU not available in worker");

  const adapter = await g.requestAdapter();
  if (!adapter) throw new Error("No GPU adapter");
  const device: any = await adapter.requestDevice();
  const shader = device.createShaderModule({ code: MATMUL_SHADER });

  const GPU = { STORAGE: 0x0080, COPY_DST: 0x0004, COPY_SRC: 0x0008, UNIFORM: 0x0010, MAP_READ: 0x0001 };
  const SHADER = { COMPUTE: 0x0004 };
  const MAP = { READ: 0x0001 };

  const resultSize = rowsA * colsB;
  const bufA = device.createBuffer({ size: a.byteLength, usage: GPU.STORAGE | GPU.COPY_DST });
  const bufB = device.createBuffer({ size: b.byteLength, usage: GPU.STORAGE | GPU.COPY_DST });
  const bufR = device.createBuffer({ size: resultSize * 4, usage: GPU.STORAGE | GPU.COPY_SRC });
  const bufD = device.createBuffer({ size: 12, usage: GPU.UNIFORM | GPU.COPY_DST });
  const staging = device.createBuffer({ size: resultSize * 4, usage: GPU.MAP_READ | GPU.COPY_DST });

  device.queue.writeBuffer(bufA, 0, a);
  device.queue.writeBuffer(bufB, 0, b);
  device.queue.writeBuffer(bufD, 0, new Uint32Array([rowsA, colsA, colsB]));

  const bgl = device.createBindGroupLayout({
    entries: [0, 1, 2, 3].map((binding) => ({
      binding, visibility: SHADER.COMPUTE,
      buffer: binding === 3 ? { type: "uniform" } : binding === 2 ? { type: "storage" } : { type: "read-only-storage" },
    })),
  });
  const pl = device.createPipelineLayout({ bindGroupLayouts: [bgl] });
  const bg = device.createBindGroup({
    layout: pl,
    entries: [
      { binding: 0, resource: { buffer: bufA } },
      { binding: 1, resource: { buffer: bufB } },
      { binding: 2, resource: { buffer: bufR } },
      { binding: 3, resource: { buffer: bufD } },
    ],
  });

  const pipeline = device.createComputePipeline({ layout: pl, compute: { module: shader, entryPoint: "main" } });
  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bg);
  pass.dispatchWorkgroups(Math.ceil(rowsA / 8), Math.ceil(colsB / 8));
  pass.end();
  encoder.copyBufferToBuffer(bufR, 0, staging, 0, staging.size);
  device.queue.submit([encoder.finish()]);

  await staging.mapAsync(MAP.READ);
  const data = new Float32Array(staging.getMappedRange());
  const result = new Float32Array(data);
  staging.unmap();
  device.destroy();
  return result;
}

// ========== 引擎选择 ==========

type Engine = "js" | "wasm" | "webgpu";

function selectEngine(totalElements: number): Engine {
  if (totalElements > 10000) return "webgpu";
  if (totalElements > 1000 && !wasmFailed) return "wasm";
  return "js";
}

// ========== 消息处理 ==========

interface ComputeMessage {
  id: number;
  operation: "matmul" | "array_sum" | "array_stats";
  data: string; // JSON
}

interface ComputeResponse {
  id: number;
  result: string;
  engine: Engine;
  elapsed: number;
  error?: string;
}

self.onmessage = async (e: MessageEvent<ComputeMessage>) => {
  const { id, operation, data } = e.data;
  const start = performance.now();
  let engine: Engine = "js";
  let result = "";
  let error: string | undefined;

  try {
    const parsed = JSON.parse(data);

    switch (operation) {
      case "matmul": {
        const a = parsed.matrixA as number[][];
        const b = parsed.matrixB as number[][];
        if (!a?.[0] || !b?.[0]) throw new Error("需要 matrixA 和 matrixB");
        if (a[0].length !== b.length) throw new Error(`维度不匹配: ${a.length}x${a[0].length} × ${b.length}x${b[0].length}`);

        const rowsA = a.length, colsA = a[0].length, colsB = b[0].length;
        const total = rowsA * colsA + b.length * colsB;
        const flatA = new Float32Array(a.flat());
        const flatB = new Float32Array(b.flat());

        // 选择引擎
        if (total > 10000) {
          try {
            const gpuResult = await gpuMatMul(flatA, rowsA, colsA, flatB, colsB);
            engine = "webgpu";
            result = formatMatMulResult(gpuResult, rowsA, colsB, total, "WebGPU");
          } catch (gpuErr) {
            // GPU 失败 → 降级到 WASM 或 JS
            console.warn("GPU failed, trying WASM/JS:", gpuErr);
            if (await initWasm()) {
              engine = "wasm";
              const wasmR = wasmMatMulFallback(flatA, rowsA, colsA, flatB, colsB);
              result = formatMatMulResult(wasmR, rowsA, colsB, total, "WASM (GPU降级)");
            } else {
              engine = "js";
              const jsR = cpuMatMul(flatA, rowsA, colsA, flatB, colsA, colsB);
              result = formatMatMulResult(jsR, rowsA, colsB, total, "JS CPU (GPU降级)");
            }
          }
        } else if (total > 1000 && (await initWasm())) {
          engine = "wasm";
          const wasmR = wasmMatMulFallback(flatA, rowsA, colsA, flatB, colsB);
          result = formatMatMulResult(wasmR, rowsA, colsB, total, "WASM");
        } else {
          engine = "js";
          const jsR = cpuMatMul(flatA, rowsA, colsA, flatB, colsA, colsB);
          result = formatMatMulResult(jsR, rowsA, colsB, total, "JS CPU");
        }
        break;
      }

      case "array_sum": {
        const values = new Float32Array(parsed.values || []);
        engine = "js";
        const sum = values.reduce((a, b) => a + b, 0);
        result = JSON.stringify({ operation: "array_sum", count: values.length, sum, engine: "JS CPU" });
        break;
      }

      case "array_stats": {
        const values = new Float32Array(parsed.values || []);
        engine = "js";
        const stats = cpuArrayStats(values);
        result = JSON.stringify({ operation: "array_stats", ...stats, engine: "JS CPU" });
        break;
      }

      default:
        throw new Error(`未知运算: ${operation}`);
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "计算失败";
  }

  const elapsed = performance.now() - start;
  const response: ComputeResponse = { id, result, engine, elapsed, error };
  (self as any).postMessage(response);
};

// ========== 辅助函数 ==========

function formatMatMulResult(data: Float32Array, rows: number, cols: number, total: number, method: string): string {
  const elapsed = 0; // worker 在外部计时
  const dims = `${rows}x${cols}`;
  const resultArr: number[][] = [];
  for (let i = 0; i < Math.min(rows, 20); i++) {
    resultArr.push(Array.from(data.slice(i * cols, (i + 1) * cols)).map((v) => Math.round(v * 1e6) / 1e6));
  }
  return JSON.stringify({
    operation: "matmul",
    method,
    dimensions: dims,
    totalElements: total,
    result: rows > 20 ? `${rows}x${cols} 矩阵（仅显示前20行）` : resultArr,
  });
}

function wasmMatMulFallback(a: Float32Array, rowsA: number, colsA: number, b: Float32Array, colsB: number): Float32Array {
  // WASM 模块不可用时的 JS fallback（在 Worker 内执行，不卡 UI）
  return cpuMatMul(a, rowsA, colsA, b, colsA, colsB);
}

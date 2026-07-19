/**
 * WebGPU 加速计算模块
 * - 矩阵乘法 (matmul)
 * - 大数组求和 (array_sum)
 * - 数组统计 (array_stats: min, max, mean, sum)
 * - WebGPU 不可用时自动降级到 CPU
 */

// ====== Worker 管理 ======

interface WorkerResponse {
  id: number;
  result: string;
  engine: string;
  elapsed: number;
  error?: string;
}

let workerInstance: Worker | null = null;
let nextId = 0;
const pendingRequests = new Map<
  number,
  { resolve: (r: WorkerResponse) => void; reject: (e: Error) => void }
>();

function getWorker(): Worker | null {
  if (workerInstance) return workerInstance;
  try {
    workerInstance = new Worker(
      new URL("./compute.worker.ts", import.meta.url)
    );
    workerInstance.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { id, result, engine, elapsed, error } = e.data;
      const pending = pendingRequests.get(id);
      if (pending) {
        pendingRequests.delete(id);
        if (error) pending.reject(new Error(error));
        else pending.resolve({ id, result, engine, elapsed });
      }
    };
    workerInstance.onerror = () => {
      pendingRequests.forEach((p) => p.reject(new Error("Worker crashed")));
      pendingRequests.clear();
      workerInstance = null;
    };
    return workerInstance;
  } catch {
    return null;
  }
}

function sendToWorker(
  operation: string,
  data: string
): Promise<WorkerResponse> {
  const worker = getWorker();
  if (!worker) throw new Error("Worker unavailable");

  const id = nextId++;
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    worker.postMessage({ id, operation, data });
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error("Worker timeout (30s)"));
      }
    }, 30000);
  });
}

// ====== CPU 直连降级 (Worker 不可用时) ======

function cpuDirectMatMul(a: number[][], b: number[][]): number[][] {
  const rows = a.length, colsA = a[0].length, colsB = b[0].length;
  const result: number[][] = Array.from({ length: rows }, () => new Array(colsB).fill(0));
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < colsB; j++)
      for (let k = 0; k < colsA; k++)
        result[i][j] += a[i][k] * b[k][j];
  return result;
}

// ====== 统一入口 ======

interface ComputeParams {
  operation: "matmul" | "array_sum" | "array_stats";
  data: string; // JSON
}

export async function gpuCompute(params: ComputeParams): Promise<string> {
  const start = performance.now();

  // 尝试 Worker 路径
  try {
    const workerResult = await sendToWorker(params.operation, params.data);
    const resultObj = JSON.parse(workerResult.result);
    resultObj.engine = workerResult.engine;
    resultObj.elapsed = `${workerResult.elapsed.toFixed(2)}ms (Worker)`;
    return JSON.stringify(resultObj);
  } catch (_workerErr) {
    // Worker 不可用 → 主线程 CPU 降级
  }

  // === 主线程 CPU 降级（Worker 不可用时） ===
  const parsed = JSON.parse(params.data);

  switch (params.operation) {
    case "matmul": {
      const { matrixA, matrixB } = parsed;
      if (!matrixA || !matrixB) throw new Error("需要 matrixA 和 matrixB");
      if (matrixA[0].length !== matrixB.length) {
        throw new Error(
          `矩阵维度不匹配: A(${matrixA.length}x${matrixA[0].length}) B(${matrixB.length}x${matrixB[0].length})`
        );
      }

      const result = cpuDirectMatMul(matrixA, matrixB);
      const elapsed = (performance.now() - start).toFixed(2);
      return JSON.stringify({
        operation: "matmul",
        method: "JS CPU (主线程降级)",
        dimensions: `${matrixA.length}x${matrixA[0].length} × ${matrixB.length}x${matrixB[0].length}`,
        result: result.length > 20 ? `${result.length}x${result[0].length} 矩阵（仅显示维度）` : result,
        elapsed: `${elapsed}ms`,
      });
    }

    case "array_sum": {
      const { values } = parsed;
      if (!values || !Array.isArray(values)) throw new Error("需要 values 数组");
      const sum = (values as number[]).reduce((a, b) => a + b, 0);
      const elapsed = (performance.now() - start).toFixed(2);
      return JSON.stringify({ operation: "array_sum", method: "JS CPU (主线程)", count: values.length, sum, elapsed: `${elapsed}ms` });
    }

    case "array_stats": {
      const { values } = parsed;
      if (!values || !Array.isArray(values)) throw new Error("需要 values 数组");
      const arr = values as number[];
      const n = arr.length;
      if (n === 0) return JSON.stringify({ sum: 0, mean: 0, min: 0, max: 0, count: 0 });
      let sum = 0, min = arr[0], max = arr[0];
      for (const v of arr) { sum += v; if (v < min) min = v; if (v > max) max = v; }
      const elapsed = (performance.now() - start).toFixed(2);
      return JSON.stringify({
        operation: "array_stats", method: "JS CPU (主线程)",
        count: n, sum, mean: sum / n, min, max, elapsed: `${elapsed}ms`,
      });
    }

    default:
      throw new Error(`未知运算类型: ${params.operation}`);
  }
}

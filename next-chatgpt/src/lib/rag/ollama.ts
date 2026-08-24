// Ollama 本地 embedding 客户端。
// 通过 /api/tags 检测服务是否在线；使用 /api/embeddings 生成向量。

// 使用 127.0.0.1 而非 localhost，避免部分环境解析到不同的 Ollama 实例
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || "bge-m3";

let availabilityCache = { available: false, at: 0 };
let modelCache = { ready: false, at: 0 };
const CACHE_TTL = 30_000; // 30 秒内不重复探测，避免每次请求都 ping

export function getOllamaModel(): string {
  return OLLAMA_EMBED_MODEL;
}

export function getOllamaBaseUrl(): string {
  return OLLAMA_BASE_URL;
}

/** 探测 Ollama 服务是否在线（带缓存与超时） */
export async function isOllamaAvailable(): Promise<boolean> {
  const now = Date.now();
  if (now - availabilityCache.at < CACHE_TTL) {
    return availabilityCache.available;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: controller.signal,
    });
    availabilityCache = { available: res.ok, at: now };
    return res.ok;
  } catch {
    availabilityCache = { available: false, at: now };
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/** 检测 embedding 模型是否已拉取到本地 */
export async function isEmbedModelReady(): Promise<boolean> {
  const now = Date.now();
  if (now - modelCache.at < CACHE_TTL) {
    return modelCache.ready;
  }
  const controller = new AbortController();
  // /api/tags 响应体包含模型元数据，读取较慢；放宽到 5 秒避免误判
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: controller.signal,
    });
    if (!res.ok) {
      modelCache = { ready: false, at: now };
      return false;
    }
    const data = await res.json();
    const models: Array<{ name?: string }> = data?.models || [];
    const ready = models.some((m) => {
      const name = (m.name || "").split(":")[0];
      return name === OLLAMA_EMBED_MODEL;
    });
    modelCache = { ready, at: now };
    return ready;
  } catch {
    modelCache = { ready: false, at: now };
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

/** RAG 是否可用：Ollama 服务在线且 embedding 模型已安装 */
export async function isRagReady(): Promise<boolean> {
  return (await isOllamaAvailable()) && (await isEmbedModelReady());
}

/** 用 Ollama 本地模型生成文本向量 */
export async function embedText(text: string): Promise<number[]> {
  const controller = new AbortController();
  // 首次调用需加载模型，可能较慢，放宽到 120 秒
  const timeout = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_EMBED_MODEL, prompt: text }),
      signal: controller.signal,
    });
    if (!res.ok) {
      let errorText = "";
      try {
        const body = await res.json();
        errorText = body?.error || "";
      } catch {
        errorText = "";
      }
      if (errorText.includes("not found") || errorText.includes("model")) {
        throw new Error(
          `Ollama embedding 模型 ${OLLAMA_EMBED_MODEL} 未安装，请先执行: ollama pull ${OLLAMA_EMBED_MODEL}`
        );
      }
      throw new Error(`Ollama embedding 失败: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (Array.isArray(data?.embedding)) return data.embedding as number[];
    // 兼容新版 /api/embed 的返回
    if (Array.isArray(data?.embeddings?.[0])) {
      return data.embeddings[0] as number[];
    }
    throw new Error("Ollama embedding 返回格式异常");
  } finally {
    clearTimeout(timeout);
  }
}

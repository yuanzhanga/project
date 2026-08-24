import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  embedText,
  getOllamaModel,
  isEmbedModelReady,
  isOllamaAvailable,
  isRagReady,
} from "./ollama";
import { chunkText, extractTextFromFile, isSupportedDocument } from "./chunk";
import { ragStore } from "./store";
import type { RagChunk, RagDocument, RagStatus, RetrievedChunk } from "./types";

const DOCS_DIR = path.join(process.cwd(), ".data", "rag", "documents");
// 正在上传/入库的文件名，防止 rescan 在索引完成前重复处理
const processingPaths = new Set<string>();

export async function getRagStatus(): Promise<RagStatus> {
  const available = await isOllamaAvailable();
  const modelReady = available && (await isEmbedModelReady());
  return {
    available,
    modelReady,
    model: available ? getOllamaModel() : "",
    count: modelReady ? ragStore.count(getOllamaModel()) : 0,
  };
}

function ensureDocsDir(): void {
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }
}

/** 上传一个文本文档：落盘原始文件 → 解析 → 分块 → 逐块向量化 → 写入本地向量库 */
export async function addDocument(
  filename: string,
  content: string,
  rawBuffer?: Buffer
): Promise<{ documentId: string; source: string; chunks: number }> {
  if (!isSupportedDocument(filename)) {
    throw new Error(
      `暂不支持 ${filename.split(".").pop()} 格式，请上传 txt/md/html/csv/json/代码等文本文件`
    );
  }
  if (!(await isOllamaAvailable())) {
    throw new Error("Ollama 服务不可用，无法进行文本向量化");
  }
  if (!(await isEmbedModelReady())) {
    throw new Error(
      `Ollama 在线但 embedding 模型 ${getOllamaModel()} 未安装，请先执行: ollama pull ${getOllamaModel()}`
    );
  }

  const text = extractTextFromFile(filename, content);
  if (!text.trim()) {
    throw new Error("未能从文档中提取到文本内容");
  }

  // 落盘原始文件（保证原始文件能保留在项目目录）
  const documentId = uuidv4();
  const ext = filename.split(".").pop()?.toLowerCase() || "txt";
  const storedName = `${documentId}.${ext}`;
  ensureDocsDir();
  const storedPath = path.join(DOCS_DIR, storedName);
  processingPaths.add(storedName);
  try {
    if (rawBuffer) {
      fs.writeFileSync(storedPath, rawBuffer);
    } else {
      fs.writeFileSync(storedPath, content, "utf-8");
    }

    const size = rawBuffer?.length ?? Buffer.byteLength(content, "utf-8");
    const chunks = chunkText(text);
    let added = 0;
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embedText(chunks[i]);
      const chunk: RagChunk = {
        id: uuidv4(),
        documentId,
        source: filename,
        chunkIndex: i,
        content: chunks[i],
        embedding,
        model: getOllamaModel(),
        createdAt: Date.now(),
      };
      ragStore.add(chunk);
      added++;
    }

    const doc: RagDocument = {
      id: documentId,
      filename,
      path: storedName,
      size,
      chunkCount: added,
      model: getOllamaModel(),
      createdAt: Date.now(),
    };
    ragStore.addDocumentMeta(doc);

    return { documentId, source: filename, chunks: added };
  } finally {
    processingPaths.delete(storedName);
  }
}

/** 列出知识库文档 */
export function listDocuments(): RagDocument[] {
  return ragStore.listDocuments();
}

/** 删除单个文档：移除元数据、分块与落盘文件 */
export async function deleteDocument(id: string): Promise<boolean> {
  const doc = ragStore.getDocument(id);
  if (!doc) return false;
  if (doc.path) {
    const filePath = path.join(DOCS_DIR, doc.path);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // 忽略删除失败，继续清理索引
      }
    }
  }
  ragStore.removeDocument(id);
  return true;
}

/** 扫描 documents 目录，索引未入库的新文件 */
export async function rescanDocuments(): Promise<{ added: number }> {
  if (!(await isRagReady())) {
    throw new Error("Ollama 或 embedding 模型不可用，无法扫描");
  }
  ensureDocsDir();
  const known = new Set(ragStore.listDocuments().map((d) => d.path));
  const files = fs
    .readdirSync(DOCS_DIR)
    .filter(
      (f) =>
        isSupportedDocument(f) && !known.has(f) && !processingPaths.has(f)
    );

  let added = 0;
  for (const file of files) {
    // 手动放进目录的文件：用文件名作为原始名
    const buffer = fs.readFileSync(path.join(DOCS_DIR, file));
    const content = buffer.toString("utf-8");
    const result = await addDocument(file, content, buffer);
    added += result.chunks;
  }
  return { added };
}

/** 检索与 query 最相关的知识块 */
export async function retrieve(
  query: string,
  topK = 5
): Promise<RetrievedChunk[]> {
  if (!query.trim()) return [];
  if (ragStore.count(getOllamaModel()) === 0) return [];
  // 若 Ollama 或模型不可用，静默跳过 RAG
  if (!(await isRagReady())) return [];
  try {
    const queryEmbedding = await embedText(query);
    return ragStore.search(queryEmbedding, topK, getOllamaModel());
  } catch {
    return [];
  }
}

/** 构建注入 Prompt 的检索上下文；无法检索时返回空串 */
export async function buildRagContext(
  query: string,
  topK?: number
): Promise<string> {
  const k = topK ?? parseInt(process.env.RAG_TOP_K || "5", 10);
  const results = await retrieve(query, k);
  if (results.length === 0) return "";

  const blocks = results.map(
    (r, i) => `[${i + 1}] 来源：${r.source}\n内容：${r.content}`
  );
  return (
    "以下是知识库中检索到的相关资料，供你参考。若回答使用了这些资料，请用 [1][2] 形式标注来源：\n\n" +
    blocks.join("\n\n---\n\n")
  );
}

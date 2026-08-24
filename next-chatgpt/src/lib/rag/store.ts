import fs from "fs";
import path from "path";
import type { RagChunk, RagDocument, RetrievedChunk } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data", "rag");
const CHUNKS_FILE = path.join(DATA_DIR, "chunks.json");
const DOCUMENTS_FILE = path.join(DATA_DIR, "documents.json");

/** 基于本地 JSON 的轻量向量库：文档元数据 + 分块向量 + 余弦检索 */
class RagStore {
  private ensureFile(file: string): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, "[]", "utf-8");
    }
  }

  private readJson<T>(file: string): T[] {
    this.ensureFile(file);
    try {
      const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }

  private writeJson<T>(file: string, data: T[]): void {
    this.ensureFile(file);
    fs.writeFileSync(file, JSON.stringify(data), "utf-8");
  }

  // ===== 文档元数据 =====

  listDocuments(): RagDocument[] {
    this.migrateLegacyChunks();
    return this.readJson<RagDocument>(DOCUMENTS_FILE);
  }

  getDocument(id: string): RagDocument | undefined {
    return this.listDocuments().find((d) => d.id === id);
  }

  addDocumentMeta(doc: RagDocument): void {
    const docs = this.listDocuments();
    docs.unshift(doc);
    this.writeJson(DOCUMENTS_FILE, docs);
  }

  removeDocument(id: string): void {
    const docs = this.listDocuments().filter((d) => d.id !== id);
    this.writeJson(DOCUMENTS_FILE, docs);
    // 同时移除该文档的分块
    const chunks = this.read().filter((c) => c.documentId !== id);
    this.write(chunks);
  }

  // ===== 分块 =====

  getAll(): RagChunk[] {
    return this.read();
  }

  count(model?: string): number {
    const chunks = this.read();
    return model ? chunks.filter((c) => c.model === model).length : chunks.length;
  }

  add(chunk: RagChunk): void {
    const chunks = this.read();
    chunks.push(chunk);
    this.write(chunks);
  }

  clear(): void {
    this.write([]);
    this.writeJson(DOCUMENTS_FILE, []);
  }

  /** 余弦相似度检索 topK（仅检索同模型向量，可限定文档） */
  search(
    queryEmbedding: number[],
    topK: number,
    model?: string,
    documentId?: string
  ): RetrievedChunk[] {
    let chunks = this.read();
    if (model) chunks = chunks.filter((c) => c.model === model);
    if (documentId) chunks = chunks.filter((c) => c.documentId === documentId);

    const queryNorm = vectorNorm(queryEmbedding);
    if (queryNorm === 0) return [];

    const scored = chunks.map((chunk) => ({
      source: chunk.source,
      content: chunk.content,
      score: cosineSimilarity(queryEmbedding, chunk.embedding, queryNorm),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  // ===== 内部读分块 =====

  private read(): RagChunk[] {
    return this.readJson<RagChunk>(CHUNKS_FILE);
  }

  private write(chunks: RagChunk[]): void {
    this.writeJson(CHUNKS_FILE, chunks);
  }

  /** 兼容旧数据：早期未落盘/无 documentId 的分块，按来源聚合成一条文档元数据 */
  private migrateLegacyChunks(): void {
    const documents = this.readJson<RagDocument>(DOCUMENTS_FILE);
    const chunks = this.readJson<RagChunk>(CHUNKS_FILE);

    const bySource = new Map<string, RagChunk[]>();
    for (const c of chunks) {
      if (c.documentId) continue;
      const key = c.source;
      bySource.set(key, [...(bySource.get(key) || []), c]);
    }
    if (bySource.size === 0) return;

    const newDocuments = [...documents];
    let changed = false;
    for (const [source, group] of bySource) {
      const docId = `legacy-${source}`;
      if (!newDocuments.some((d) => d.id === docId)) {
        const doc: RagDocument = {
          id: docId,
          filename: source,
          path: "",
          size: group.reduce((s, c) => s + (c.content?.length ?? 0), 0),
          chunkCount: group.length,
          model: group[0].model,
          createdAt: group[0].createdAt,
        };
        newDocuments.unshift(doc);
      }
      for (const c of group) {
        c.documentId = docId;
      }
      changed = true;
    }

    if (changed) {
      this.writeJson(DOCUMENTS_FILE, newDocuments);
      this.write(chunks);
    }
  }
}

function vectorNorm(vec: number[]): number {
  let sum = 0;
  for (const v of vec) sum += v * v;
  return Math.sqrt(sum);
}

function cosineSimilarity(a: number[], b: number[], aNorm: number): number {
  let dot = 0;
  let bNorm = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    bNorm += b[i] * b[i];
  }
  const denom = aNorm * Math.sqrt(bNorm);
  return denom === 0 ? 0 : dot / denom;
}

export const ragStore = new RagStore();

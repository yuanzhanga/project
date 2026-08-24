/** 一条已向量化的知识块 */
export interface RagChunk {
  id: string;
  documentId: string;  // 所属文档 id
  source: string;      // 来源文件名
  chunkIndex: number;  // 在同文档中的序号
  content: string;     // 文本内容
  embedding: number[]; // 向量
  model: string;       // 使用的 embedding 模型
  createdAt: number;
}

/** 已保存到知识库的文档元数据 */
export interface RagDocument {
  id: string;
  filename: string;   // 原始文件名
  path: string;       // 落盘文件名（相对 documents 目录）
  size: number;       // 字节数
  chunkCount: number; // 切块数量
  model: string;      // 使用的 embedding 模型
  createdAt: number;
}

/** 检索命中的知识块 */
export interface RetrievedChunk {
  source: string;
  content: string;
  score: number; // 余弦相似度
}

/** RAG 状态 */
export interface RagStatus {
  available: boolean; // Ollama 在线
  modelReady: boolean; // embedding 模型已安装
  model: string;      // 当前 embedding 模型
  count: number;      // 知识块数量
}

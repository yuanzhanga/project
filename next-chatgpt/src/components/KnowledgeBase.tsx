"use client";
import { useState, useEffect, useRef, useCallback } from "react";

interface RagStatus {
  available: boolean;
  modelReady: boolean;
  model: string;
  count: number;
}

interface RagDocument {
  id: string;
  filename: string;
  size: number;
  chunkCount: number;
  model: string;
  createdAt: number;
}

const ACCEPT =
  ".txt,.md,.markdown,.html,.htm,.csv,.json,.yaml,.yml,.xml,.log,.ts,.tsx,.js,.jsx,.css,.scss,.py,.java,.go,.rs,.sh,.sql";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function KnowledgeBase() {
  const [status, setStatus] = useState<RagStatus | null>(null);
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/rag/status");
      setStatus(res.ok ? await res.json() : null);
    } catch {
      setStatus(null);
    }
  }, []);

  const refreshDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/rag/documents");
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch {
      setDocuments([]);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    refreshDocuments();
    const timer = setInterval(refreshStatus, 30_000);
    return () => clearInterval(timer);
  }, [refreshStatus, refreshDocuments]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("file", files[0]);
      const res = await fetch("/api/rag/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "上传失败");
      setMessage(`已导入 ${data.source}，新增 ${data.chunks} 条向量`);
      await Promise.all([refreshStatus(), refreshDocuments()]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/rag/documents?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "删除失败");
      setMessage("已删除文档");
      await Promise.all([refreshStatus(), refreshDocuments()]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "删除失败");
    }
  };

  const handleRescan = async () => {
    setScanning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/rag/rescan", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "扫描失败");
      setMessage(`扫描完成，新增 ${data.added} 条向量`);
      await Promise.all([refreshStatus(), refreshDocuments()]);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "扫描失败");
    } finally {
      setScanning(false);
    }
  };

  const available = status?.available ?? false;
  const modelReady = available && (status?.modelReady ?? false);

  return (
    <div className="relative flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="上传文档到知识库（需本地 Ollama + BGE 模型）"
        className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-all bg-white/5 text-gray-400 border-white/10 hover:text-gray-200 disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16V4m0 0L7 9m5-5l5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
        </svg>
        {uploading ? "上传中…" : "上传文档"}
      </button>

      <button
        type="button"
        onClick={() => setShowPanel((v) => !v)}
        title="知识库管理"
        className={`flex items-center gap-1.5 px-2.5 py-2 text-sm rounded-lg border transition-all ${
          showPanel
            ? "bg-blue-500/20 text-blue-300 border-blue-500/50"
            : "bg-white/5 text-gray-400 border-white/10 hover:text-gray-200"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            available && modelReady
              ? "bg-green-400"
              : available && !modelReady
                ? "bg-yellow-400"
                : "bg-red-400"
          }`}
        />
        知识库
        {available && modelReady ? ` ${status?.count ?? 0}` : ""}
      </button>

      {showPanel && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-gray-800/95 backdrop-blur-sm border border-gray-600 rounded-xl shadow-2xl z-[9999] p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-300">
              {available && modelReady
                ? `模型 ${status?.model} · ${status?.count ?? 0} 条`
                : available && !modelReady
                  ? `模型 ${status?.model} 未安装`
                  : "Ollama 未连接，RAG 已跳过"}
            </span>
            <button
              type="button"
              onClick={() => setShowPanel(false)}
              className="p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            onClick={handleRescan}
            disabled={scanning}
            className="w-full mb-2 px-3 py-2 text-sm rounded-lg border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20 transition-colors disabled:opacity-50"
          >
            {scanning ? "扫描中…" : "扫描文件夹（导入新文件）"}
          </button>

          {message && (
            <div className="mb-2 text-xs text-gray-400 break-words">{message}</div>
          )}

          <div className="max-h-64 overflow-y-auto">
            {documents.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">暂无文档</div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-gray-700/40"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-200 truncate">{doc.filename}</div>
                    <div className="text-xs text-gray-500">
                      {doc.chunkCount} 条 · {formatBytes(doc.size)} · {new Date(doc.createdAt).toLocaleString("zh-CN")}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    title="删除文档"
                    className="p-1.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.87 12.14A2 2 0 0116.14 21H7.86a2 2 0 01-1.99-1.86L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

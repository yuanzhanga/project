import { useState, useCallback, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChatMessage } from "@/lib/langchain/chain";
import { ToolCall } from "@/lib/tools/types";

interface QueuedRequest {
  id: string;
  sessionId: string;
  messages: ChatMessage[];
  resolve: (result: SSEResult) => void;
  reject: (error: Error) => void;
}

export interface SSEResult {
  content: string;
  finishReason: string;
  toolCalls: ToolCall[];
}

interface SSEQueueOptions {
  maxConcurrent?: number;
  onChunk?: (chunk: string) => void;
  onToolCalls?: (toolCalls: ToolCall[]) => void;
  onComplete?: (content: string, finishReason: string) => void;
  onError?: (error: Error) => void;
}

export function useSSEQueue(options: SSEQueueOptions = {}) {
  const {
    maxConcurrent = 2,
    onChunk,
    onToolCalls,
    onComplete,
    onError,
  } = options;

  const [queue, setQueue] = useState<QueuedRequest[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const processingRef = useRef(false);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const activeCountRef = useRef(0);
  const maxConcurrentRef = useRef(maxConcurrent);
  const onChunkRef = useRef(onChunk);
  const onToolCallsRef = useRef(onToolCalls);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onChunkRef.current = onChunk;
  }, [onChunk]);
  useEffect(() => {
    onToolCallsRef.current = onToolCalls;
  }, [onToolCalls]);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  useEffect(() => {
    activeCountRef.current = activeCount;
  }, [activeCount]);
  useEffect(() => {
    maxConcurrentRef.current = maxConcurrent;
  }, [maxConcurrent]);

  const sendMessage = useCallback(
    (sessionId: string, messages: ChatMessage[]): Promise<SSEResult> => {
      return new Promise((resolve, reject) => {
        const request: QueuedRequest = {
          id: uuidv4(),
          sessionId,
          messages,
          resolve,
          reject,
        };
        setQueue((prev) => [...prev, request]);
      });
    },
    []
  );

  const processQueue = useCallback(() => {
    if (processingRef.current) return;

    const currentActive = activeCountRef.current;
    const currentMax = maxConcurrentRef.current;

    if (currentActive >= currentMax) return;

    setQueue((prev) => {
      if (prev.length === 0) return prev;

      const [request, ...rest] = prev;

      if (processedIdsRef.current.has(request.id)) {
        return rest;
      }

      processedIdsRef.current.add(request.id);
      processingRef.current = true;

      const controller = new AbortController();
      abortControllers.current.set(request.id, controller);

      sendSSERequest(
        request,
        controller.signal,
        onChunkRef.current,
        onToolCallsRef.current
      )
        .then((result) => {
          request.resolve(result);
          onCompleteRef.current?.(result.content, result.finishReason);
        })
        .catch((error) => {
          request.reject(error);
          onErrorRef.current?.(error);
        })
        .finally(() => {
          setActiveCount((c) => c - 1);
          abortControllers.current.delete(request.id);
          processedIdsRef.current.delete(request.id);
          processingRef.current = false;
          setTimeout(() => processQueue(), 100);
        });

      setActiveCount((c) => c + 1);
      return rest;
    });
  }, []);

  useEffect(() => {
    if (queue.length > 0 && activeCount < maxConcurrent) {
      processQueue();
    }
  }, [queue, activeCount, maxConcurrent, processQueue]);

  const cancelRequest = useCallback((id: string) => {
    const controller = abortControllers.current.get(id);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(id);
    }
    setQueue((prev) => prev.filter((req) => req.id !== id));
  }, []);

  const cancelAll = useCallback(() => {
    abortControllers.current.forEach((controller) => {
      controller.abort();
    });
    abortControllers.current.clear();
    setQueue([]);
  }, []);

  return {
    sendMessage,
    cancelRequest,
    cancelAll,
    queueLength: queue.length,
    activeCount,
  };
}

// ===== SSE 请求处理 =====

interface SSEEvent {
  type: "chunk" | "tool_calls" | "done" | "error";
  data: unknown;
}

async function sendSSERequest(
  request: QueuedRequest,
  signal: AbortSignal,
  onChunk?: (chunk: string) => void,
  onToolCalls?: (toolCalls: ToolCall[]) => void
): Promise<SSEResult> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: request.sessionId,
      messages: request.messages,
    }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let fullContent = "";
  let finishReason = "stop";
  let toolCalls: ToolCall[] = [];

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (trimmedLine.startsWith("data:")) {
        const dataStr = trimmedLine.slice(5).trim();

        if (dataStr === "[DONE]") {
          return { content: fullContent, finishReason, toolCalls };
        }

        try {
          const event: SSEEvent = JSON.parse(dataStr);

          switch (event.type) {
            case "chunk": {
              const text = String(event.data);
              fullContent += text;
              onChunk?.(text);
              break;
            }
            case "tool_calls": {
              toolCalls = event.data as ToolCall[];
              onToolCalls?.(toolCalls);
              break;
            }
            case "done": {
              const doneData = event.data as {
                content: string;
                finishReason: string;
              };
              if (doneData.content) fullContent = doneData.content;
              finishReason = doneData.finishReason || "stop";
              break;
            }
            case "error": {
              const errData = event.data as { message: string };
              throw new Error(errData.message || "Unknown error");
            }
          }
        } catch (e) {
          // 如果解析失败且不是我们主动抛出的错误，可能是格式不兼容
          if (e instanceof Error && e.message !== "Unknown error") {
            throw e;
          }
          console.warn("Failed to parse SSE data:", e);
        }
      }
    }
  }

  return { content: fullContent, finishReason, toolCalls };
}

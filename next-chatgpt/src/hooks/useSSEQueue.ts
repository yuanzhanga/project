import { useState, useCallback, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

interface QueuedRequest {
  id: string;
  sessionId: string;
  message: string;
  resolve: (content: string) => void;
  reject: (error: Error) => void;
}

interface SSEQueueOptions {
  maxConcurrent?: number;
  onChunk?: (chunk: string) => void;
  onComplete?: (content: string) => void;
  onError?: (error: Error) => void;
}

export function useSSEQueue(options: SSEQueueOptions = {}) {
  const { maxConcurrent = 2, onChunk, onComplete, onError } = options;

  const [queue, setQueue] = useState<QueuedRequest[]>([]);
  const [activeCount, setActiveCount] = useState(0);
  const abortControllers = useRef<Map<string, AbortController>>(new Map());
  const processingRef = useRef(false);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const activeCountRef = useRef(0);
  const maxConcurrentRef = useRef(maxConcurrent);
  const onChunkRef = useRef(onChunk);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onChunkRef.current = onChunk;
  }, [onChunk]);

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

  // 发送消息：加入队列
  const sendMessage = useCallback(
    (sessionId: string, message: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const request: QueuedRequest = {
          id: uuidv4(),
          sessionId,
          message,
          resolve,
          reject,
        };

        setQueue((prev) => [...prev, request]);
      });
    },
    [],
  );

  // 处理队列
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

      sendSSERequest(request, controller.signal, onChunkRef.current)
        .then((content) => {
          request.resolve(content);
          onCompleteRef.current?.(content);
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

      return rest;
    });
  }, []);

  // 监听队列变化，自动处理
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
    // 从队列中移除
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

async function sendSSERequest(
  request: QueuedRequest,
  signal: AbortSignal,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionId: request.sessionId,
      message: request.message,
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
          return fullContent;
        }

        try {
          const data = JSON.parse(dataStr);
          if (typeof data === "string") {
            fullContent += data;
            onChunk?.(data);
          }
        } catch (e) {
          console.warn("Failed to parse SSE data:", e);
        }
      }
    }
  }

  return fullContent;
}

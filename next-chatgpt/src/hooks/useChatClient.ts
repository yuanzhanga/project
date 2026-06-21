import { useState, useCallback, useRef, useEffect } from "react";
import { useWebSocket } from "./useWebSocket";
import { useSSEQueue } from "./useSSEQueue";

interface ChatClientOptions {
  websocketUrl?: string;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  connectionTimeout?: number;
  onChunk?: (chunk: string) => void;
  onComplete?: (content: string) => void;
  onError?: (error: Error) => void;
}

export function useChatClient(options: ChatClientOptions = {}) {
  const {
    websocketUrl = `ws://${process.env.WEBSOCKET_HOST || "localhost"}:${process.env.WEBSOCKET_PORT || "8080"}`,
    reconnectAttempts = 5,
    reconnectInterval = 1000,
    connectionTimeout = 3000,
    onChunk,
    onComplete,
    onError,
  } = options;

  const [connectionType, setConnectionType] = useState<"websocket" | "sse">(
    "websocket",
  );
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error" | "fallback"
  >("disconnected");

  const useWebSocketRef = useRef(true);
  const useSSERef = useRef(true);
  const isSendingRef = useRef(false);

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

  // WebSocket 连接
  const {
    isConnected: wsIsConnected,
    connectionStatus: wsConnectionStatus,
    connect: wsConnect,
    disconnect: wsDisconnect,
    sendMessage: wsSendMessage,
  } = useWebSocket({
    url: websocketUrl,
    reconnectAttempts,
    reconnectInterval,
    connectionTimeout,
    autoConnect: true,
    onOpen: () => {
      setConnectionType("websocket");
      setConnectionStatus("connected");
      useWebSocketRef.current = true;
    },
    onClose: () => {
      setConnectionStatus("disconnected");
    },
    onChunk: (chunk) => onChunkRef.current?.(chunk),
    onComplete: (content) => onCompleteRef.current?.(content),
    onError: (error) => {
      onErrorRef.current?.(error);
      setConnectionType("sse");
      setConnectionStatus("fallback");
      useWebSocketRef.current = false;
    },
    onConnectionTimeout: () => {
      setConnectionType("sse");
      setConnectionStatus("fallback");
      useWebSocketRef.current = false;
    },
    onReconnectFailed: () => {
      setConnectionType("sse");
      setConnectionStatus("fallback");
      useWebSocketRef.current = false;
    },
  });

  // SSE 队列
  const {
    sendMessage: sseSendMessage,
    cancelRequest,
    cancelAll,
    queueLength: sseQueueLength,
    activeCount: sseActiveCount,
  } = useSSEQueue({
    maxConcurrent: 2,
    onChunk: (chunk) => onChunkRef.current?.(chunk),
    onComplete: (content) => onCompleteRef.current?.(content),
    onError: (error) => onErrorRef.current?.(error),
  });

  // 统一的发送消息方法
  const sendMessage = useCallback(
    async (
      sessionId: string,
      message: string,
      chunkCallback?: (chunk: string) => void,
    ): Promise<string> => {
      if (isSendingRef.current) {
        throw new Error("Message already sending");
      }
      isSendingRef.current = true;

      try {
        if (useWebSocketRef.current && wsIsConnected) {
          try {
            return await wsSendMessage(sessionId, message, (chunk) => {
              onChunkRef.current?.(chunk);
              chunkCallback?.(chunk);
            });
          } catch {
            useWebSocketRef.current = false;
            setConnectionType("sse");
            setConnectionStatus("fallback");
          }
        }

        if (useSSERef.current) {
          try {
            return await sseSendMessage(sessionId, message);
          } catch {
            useSSERef.current = false;
            throw new Error("SSE connection failed");
          }
        }

        throw new Error("No available connection method");
      } finally {
        isSendingRef.current = false;
      }
    },
    [wsSendMessage, sseSendMessage, wsIsConnected],
  );

  // 断开连接
  const disconnect = useCallback(() => {
    wsDisconnect();
    cancelAll();
    setConnectionStatus("disconnected");
  }, [wsDisconnect, cancelAll]);

  return {
    connectionType,
    isConnected: wsIsConnected,
    connectionStatus:
      connectionStatus === "fallback"
        ? "fallback"
        : wsConnectionStatus === "connecting"
          ? "connecting"
          : wsConnectionStatus,
    sendMessage,
    disconnect,
    reconnect: wsConnect,
    sseQueueLength,
    sseActiveCount,
    cancelRequest,
    cancelAll,
  };
}

import { useState, useCallback, useRef, useEffect } from "react";
import { useWebSocket, WSResult } from "./useWebSocket";
import { useSSEQueue, SSEResult } from "./useSSEQueue";
import { ChatMessage } from "@/lib/langchain/chain";
import { ToolCall } from "@/lib/tools/types";

export interface ChatClientOptions {
  websocketUrl?: string;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  connectionTimeout?: number;
  onChunk?: (chunk: string) => void;
  onToolCalls?: (toolCalls: ToolCall[]) => void;
  onComplete?: (content: string, finishReason: string) => void;
  onError?: (error: Error) => void;
}

export function useChatClient(options: ChatClientOptions = {}) {
  const {
    websocketUrl = `ws://${process.env.WEBSOCKET_HOST || "localhost"}:${process.env.WEBSOCKET_PORT || "8080"}`,
    reconnectAttempts = 5,
    reconnectInterval = 1000,
    connectionTimeout = 3000,
    onChunk,
    onToolCalls,
    onComplete,
    onError,
  } = options;

  const [connectionType, setConnectionType] = useState<"websocket" | "sse">(
    "websocket"
  );
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error" | "fallback"
  >("disconnected");

  const useWebSocketRef = useRef(true);
  const useSSERef = useRef(true);
  const isSendingRef = useRef(false);

  const onChunkRef = useRef(onChunk);
  const onToolCallsRef = useRef(onToolCalls);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);

  useEffect(() => { onChunkRef.current = onChunk; }, [onChunk]);
  useEffect(() => { onToolCallsRef.current = onToolCalls; }, [onToolCalls]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // WebSocket
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
    onToolCalls: (toolCalls) => onToolCallsRef.current?.(toolCalls),
    onComplete: (content, finishReason) =>
      onCompleteRef.current?.(content, finishReason),
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

  // SSE fallback
  const {
    sendMessage: sseSendMessage,
    cancelRequest,
    cancelAll,
    queueLength: sseQueueLength,
    activeCount: sseActiveCount,
  } = useSSEQueue({
    maxConcurrent: 2,
    onChunk: (chunk) => onChunkRef.current?.(chunk),
    onToolCalls: (toolCalls) => onToolCallsRef.current?.(toolCalls),
    onComplete: (content, finishReason) =>
      onCompleteRef.current?.(content, finishReason),
    onError: (error) => onErrorRef.current?.(error),
  });

  const sendMessage = useCallback(
    async (
      sessionId: string,
      messages: ChatMessage[]
    ): Promise<{ content: string; finishReason: string; toolCalls: ToolCall[] }> => {
      if (isSendingRef.current) {
        throw new Error("Message already sending");
      }
      isSendingRef.current = true;

      try {
        if (useWebSocketRef.current && wsIsConnected) {
          try {
            const result: WSResult = await wsSendMessage(
              sessionId,
              messages,
              (chunk) => onChunkRef.current?.(chunk),
              (toolCalls) => onToolCallsRef.current?.(toolCalls)
            );
            return {
              content: result.content,
              finishReason: result.finishReason,
              toolCalls: result.toolCalls,
            };
          } catch (wsErr) {
            // 消息级错误：报告但不切换通道（WebSocket 连接本身没问题）
            onErrorRef.current?.(wsErr as Error);
            throw wsErr; // 直接抛出，不 fallback 到 SSE
          }
        }

        if (useSSERef.current) {
          try {
            const result: SSEResult = await sseSendMessage(
              sessionId,
              messages
            );
            return {
              content: result.content,
              finishReason: result.finishReason,
              toolCalls: result.toolCalls,
            };
          } catch (sseErr) {
            onErrorRef.current?.(sseErr as Error);
            throw sseErr;
          }
        }

        throw new Error("No available connection method");
      } finally {
        isSendingRef.current = false;
      }
    },
    [wsSendMessage, sseSendMessage, wsIsConnected]
  );

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

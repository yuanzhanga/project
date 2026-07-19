import { useState, useCallback, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChatMessage } from "@/lib/langchain/chain";
import { ToolCall } from "@/lib/tools/types";

interface WebSocketMessage {
  messageId: string;
  sessionId: string;
  messages: ChatMessage[];
}

interface WebSocketResponse {
  messageId: string;
  sessionId: string;
  type: "chunk" | "tool_calls" | "done" | "error";
  data: unknown;
}

export interface WSResult {
  content: string;
  finishReason: string;
  toolCalls: ToolCall[];
}

interface UseWebSocketOptions {
  url?: string;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
  onChunk?: (chunk: string) => void;
  onToolCalls?: (toolCalls: ToolCall[]) => void;
  onComplete?: (content: string, finishReason: string) => void;
  onReconnectFailed?: () => void;
  onConnectionTimeout?: () => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  connectionTimeout?: number;
  autoConnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = `ws://${process.env.WEBSOCKET_HOST || "localhost"}:${process.env.WEBSOCKET_PORT || "8080"}`,
    onOpen,
    onClose,
    onError,
    onChunk,
    onToolCalls,
    onComplete,
    onReconnectFailed,
    onConnectionTimeout,
    reconnectAttempts = 5,
    reconnectInterval = 1000,
    connectionTimeout = 3000,
    autoConnect = false,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("disconnected");

  const wsRef = useRef<WebSocket | null>(null);
  const messageHandlersRef = useRef<
    Map<
      string,
      {
        resolve: (result: WSResult) => void;
        reject: (error: Error) => void;
        onChunk?: (chunk: string) => void;
        onToolCalls?: (toolCalls: ToolCall[]) => void;
      }
    >
  >(new Map());
  const reconnectCountRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasEverConnectedRef = useRef(false);
  const connectionTimedOutRef = useRef(false);
  const hasTriggeredFallbackRef = useRef(false);
  const isClosingRef = useRef(false);

  const onChunkRef = useRef(onChunk);
  const onToolCallsRef = useRef(onToolCalls);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onReconnectFailedRef = useRef(onReconnectFailed);
  const onConnectionTimeoutRef = useRef(onConnectionTimeout);

  useEffect(() => { onChunkRef.current = onChunk; }, [onChunk]);
  useEffect(() => { onToolCallsRef.current = onToolCalls; }, [onToolCalls]);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { onOpenRef.current = onOpen; }, [onOpen]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { onReconnectFailedRef.current = onReconnectFailed; }, [onReconnectFailed]);
  useEffect(() => { onConnectionTimeoutRef.current = onConnectionTimeout; }, [onConnectionTimeout]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus("connecting");
    shouldReconnectRef.current = true;
    reconnectCountRef.current = 0;
    connectionTimedOutRef.current = false;
    hasTriggeredFallbackRef.current = false;

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    try {
      const ws = new WebSocket(url);

      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          connectionTimedOutRef.current = true;
          shouldReconnectRef.current = false;
          setIsConnected(false);
          setConnectionStatus("disconnected");
          if (!hasTriggeredFallbackRef.current) {
            hasTriggeredFallbackRef.current = true;
            onConnectionTimeoutRef.current?.();
          }
        }
      }, connectionTimeout);

      ws.onopen = () => {
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        setIsConnected(true);
        setConnectionStatus("connected");
        reconnectCountRef.current = 0;
        hasEverConnectedRef.current = true;
        hasTriggeredFallbackRef.current = false;
        onOpenRef.current?.();
      };

      ws.onmessage = (event) => {
        try {
          const response: WebSocketResponse = JSON.parse(event.data);
          const handler = messageHandlersRef.current.get(response.messageId);

          switch (response.type) {
            case "chunk":
              handler?.onChunk?.(response.data as string);
              break;
            case "tool_calls":
              handler?.onToolCalls?.(response.data as ToolCall[]);
              onToolCallsRef.current?.(response.data as ToolCall[]);
              break;
            case "done": {
              const doneData = (response.data || {}) as {
                content: string;
                finishReason: string;
              };
              handler?.resolve({
                content: doneData.content || "",
                finishReason: doneData.finishReason || "stop",
                toolCalls: [],
              });
              onCompleteRef.current?.(
                doneData.content || "",
                doneData.finishReason || "stop"
              );
              messageHandlersRef.current.delete(response.messageId);
              break;
            }
            case "error":
              handler?.reject(
                new Error(
                  typeof response.data === "string"
                    ? response.data
                    : "Unknown error"
                )
              );
              // 不调用 onErrorRef（那是连接级错误回调）
              // 消息级错误通过 promise rejection 传递给 useChatClient
              messageHandlersRef.current.delete(response.messageId);
              break;
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      ws.onclose = (event) => {
        isClosingRef.current = false;
        setIsConnected(false);
        setConnectionStatus("disconnected");
        onCloseRef.current?.();

        if (
          shouldReconnectRef.current &&
          hasEverConnectedRef.current &&
          reconnectCountRef.current < reconnectAttempts
        ) {
          reconnectCountRef.current++;
          const delay =
            reconnectInterval * Math.pow(2, reconnectCountRef.current - 1);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (
          !hasEverConnectedRef.current ||
          reconnectCountRef.current >= reconnectAttempts
        ) {
          if (!hasTriggeredFallbackRef.current) {
            hasTriggeredFallbackRef.current = true;
            onReconnectFailedRef.current?.();
          }
        }
      };

      ws.onerror = (event) => {
        if (isClosingRef.current) return;
        if (!connectionTimedOutRef.current && !hasTriggeredFallbackRef.current) {
          setConnectionStatus("error");
          const error = new Error("WebSocket error");
          hasTriggeredFallbackRef.current = true;
          onErrorRef.current?.(error);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      setConnectionStatus("error");
      onErrorRef.current?.(error as Error);
    }
  }, [url, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    isClosingRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus("disconnected");
  }, []);

  const sendMessage = useCallback(
    (
      sessionId: string,
      messages: ChatMessage[],
      chunkCallback?: (chunk: string) => void,
      toolCallsCallback?: (toolCalls: ToolCall[]) => void
    ): Promise<WSResult> => {
      return new Promise((resolve, reject) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          reject(new Error("WebSocket is not connected"));
          return;
        }

        const messageId = uuidv4();
        messageHandlersRef.current.set(messageId, {
          resolve,
          reject,
          onChunk: chunkCallback,
          onToolCalls: toolCallsCallback,
        });

        const wsMessage: WebSocketMessage = {
          messageId,
          sessionId,
          messages,
        };

        wsRef.current.send(JSON.stringify(wsMessage));

        setTimeout(() => {
          if (messageHandlersRef.current.has(messageId)) {
            messageHandlersRef.current.delete(messageId);
            reject(new Error("Message timeout"));
          }
        }, 120000); // 增加到 120s 支持 tool call 循环
      });
    },
    []
  );

  useEffect(() => {
    if (autoConnect) {
      connect();
      return () => {
        disconnect();
      };
    }
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    sendMessage,
  };
}

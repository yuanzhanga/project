import { useState, useCallback, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import Pusher, { Channel } from "pusher-js";

interface WebSocketMessage {
  messageId: string;
  sessionId: string;
  message: string;
}

interface WebSocketResponse {
  messageId: string;
  sessionId: string;
  type: "chunk" | "done" | "error";
  data: string;
}

interface UsePusherWebSocketOptions {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
  onChunk?: (chunk: string) => void;
  onComplete?: (content: string) => void;
  onReconnectFailed?: () => void;
  onConnectionTimeout?: () => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  connectionTimeout?: number;
  autoConnect?: boolean;
}

export function useWebSocket(options: UsePusherWebSocketOptions = {}) {
  const {
    onOpen,
    onClose,
    onError,
    onChunk,
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

  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<Channel | null>(null);
  const messageHandlersRef = useRef<
    Map<
      string,
      {
        resolve: (content: string) => void;
        reject: (error: Error) => void;
        onChunk?: (chunk: string) => void;
      }
    >
  >(new Map());
  const reconnectCountRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const mountedRef = useRef(true);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasEverConnectedRef = useRef(false);
  const connectionTimedOutRef = useRef(false);
  const hasTriggeredFallbackRef = useRef(false);

  const onChunkRef = useRef(onChunk);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onReconnectFailedRef = useRef(onReconnectFailed);
  const onConnectionTimeoutRef = useRef(onConnectionTimeout);

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
    onOpenRef.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    onReconnectFailedRef.current = onReconnectFailed;
  }, [onReconnectFailed]);

  useEffect(() => {
    onConnectionTimeoutRef.current = onConnectionTimeout;
  }, [onConnectionTimeout]);

  const connect = useCallback(() => {
    // 如果正在连接或已连接，不重复连接
    if (pusherRef.current && channelRef.current) {
      return;
    }

    setConnectionStatus("connecting");
    mountedRef.current = true;
    shouldReconnectRef.current = true;
    reconnectCountRef.current = 0;
    connectionTimedOutRef.current = false;
    hasTriggeredFallbackRef.current = false;

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    try {
      const pusher = new Pusher("284ff1815798c6f1cc77", {
        cluster: "ap1",
        useTLS: true,
        enabledTransports: ["ws", "wss"],
      });

      // 禁用 Pusher 自动重连，由我们自己处理
      pusher.connection.reconnect = () => {};

      pusherRef.current = pusher;

      const channel = pusher.subscribe("chat-channel");
      channelRef.current = channel;

      channel.bind("pusher:subscription_succeeded", () => {
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        setIsConnected(true);
        setConnectionStatus("connected");
        reconnectCountRef.current = 0;
        hasEverConnectedRef.current = true;
        hasTriggeredFallbackRef.current = false;
        if (mountedRef.current) {
          onOpenRef.current?.();
        }
      });

      channel.bind("chunk", (data: WebSocketResponse) => {
        const handler = messageHandlersRef.current.get(data.messageId);
        if (handler) {
          handler.onChunk?.(data.data);
        }
      });

      channel.bind("done", (data: WebSocketResponse) => {
        const handler = messageHandlersRef.current.get(data.messageId);
        if (handler) {
          handler.resolve(data.data);
          onCompleteRef.current?.(data.data);
          messageHandlersRef.current.delete(data.messageId);
        }
      });

      channel.bind("error", (data: WebSocketResponse) => {
        const handler = messageHandlersRef.current.get(data.messageId);
        if (handler) {
          handler.reject(new Error(data.data));
          onErrorRef.current?.(new Error(data.data));
          messageHandlersRef.current.delete(data.messageId);
        }
      });

      pusher.connection.bind("connected", () => {
        setIsConnected(true);
        setConnectionStatus("connected");
        reconnectCountRef.current = 0;
        hasEverConnectedRef.current = true;
        hasTriggeredFallbackRef.current = false;
        onOpenRef.current?.();
      });

      pusher.connection.bind("disconnected", () => {
        if (!shouldReconnectRef.current || !mountedRef.current) {
          setIsConnected(false);
          setConnectionStatus("disconnected");
          return;
        }

        setIsConnected(false);
        setConnectionStatus("disconnected");
        if (mountedRef.current) {
          onCloseRef.current?.();
        }

        if (
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
      });

      pusher.connection.bind("error", () => {
        if (
          connectionTimedOutRef.current ||
          hasTriggeredFallbackRef.current ||
          !mountedRef.current
        )
          return;
        setConnectionStatus("error");
        hasTriggeredFallbackRef.current = true;
        onErrorRef.current?.(new Error("Pusher connection error"));
      });

      connectionTimeoutRef.current = setTimeout(() => {
        if (!hasEverConnectedRef.current && mountedRef.current) {
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
    } catch (error) {
      setConnectionStatus("error");
      onErrorRef.current?.(error as Error);
    }
  }, [
    reconnectAttempts,
    reconnectInterval,
    connectionTimeout,
    onOpen,
    onClose,
    onError,
    onComplete,
    onChunk,
    onReconnectFailed,
    onConnectionTimeout,
  ]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (channelRef.current) {
      try {
        channelRef.current.unbind_all();
        channelRef.current.unsubscribe();
      } catch (e) {
        // ignore
      }
      channelRef.current = null;
    }
    if (pusherRef.current) {
      try {
        pusherRef.current.disconnect();
        pusherRef.current.destroy();
      } catch (e) {
        // ignore
      }
      pusherRef.current = null;
    }
    setIsConnected(false);
    setConnectionStatus("disconnected");
  }, []);

  const sendMessage = useCallback(
    async (sessionId: string, message: string): Promise<string> => {
      const messageId = uuidv4();
      console.log("Pusher sendMessage called:", { sessionId, messageId });

      return new Promise((resolve, reject) => {
        messageHandlersRef.current.set(messageId, {
          resolve,
          reject,
          onChunk: onChunkRef.current,
        });

        console.log("Fetching trigger endpoint...");
        // 通过 HTTP 调用后端服务
        fetch("http://localhost:8081/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, sessionId, message }),
        })
          .then((res) => {
            console.log("Trigger response:", res.status);
            if (!res.ok) {
              reject(new Error(`HTTP ${res.status}`));
            }
          })
          .catch((error) => {
            console.error("Trigger error:", error);
            reject(error);
          });
      });
    },
    [],
  );

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      mountedRef.current = false;
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    sendMessage,
  };
}

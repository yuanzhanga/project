"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import VirtualMessageList from "@/components/VirtualMessageList";
import ChatInput from "@/components/ChatInput";
import { ChatSession, ChatMessage } from "@/lib/langchain/chain";
import { useChatClient } from "@/hooks/useChatClient";
import { v4 as uuidv4 } from "uuid";

const SESSIONS_KEY = "chat_sessions";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const currentSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  const updateSessionMessages = useCallback(
    (sessionId: string, messages: ChatMessage[]) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, messages, updatedAt: Date.now() } : s,
        ),
      );
    },
    [],
  );

  const updateSessionMessagesRef = useRef<typeof updateSessionMessages>(
    updateSessionMessages,
  );
  useEffect(() => {
    updateSessionMessagesRef.current = updateSessionMessages;
  }, [updateSessionMessages]);
  useEffect(() => {
    setMounted(true);
    try {
      const data = localStorage.getItem(SESSIONS_KEY);
      const storedSessions: ChatSession[] = data ? JSON.parse(data) : [];
      const validatedSessions = storedSessions.map((session) => ({
        ...session,
        messages: session.messages.map((msg) => ({
          ...msg,
          content: msg.content ?? "",
          role: msg.role ?? "assistant",
          timestamp: msg.timestamp ?? Date.now(),
        })),
      }));
      setSessions(validatedSessions);
      if (validatedSessions.length > 0) {
        setCurrentSessionId(validatedSessions[0].id);
        setCurrentMessages(validatedSessions[0].messages);
      }
    } catch {
      // 忽略 localStorage 错误
    }
  }, []);

  // 保存会话到 localStorage
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      } catch {
        // 忽略 localStorage 错误
      }
    }
  }, [sessions, mounted]);

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  // 切换会话时同步消息
  useEffect(() => {
    if (currentSession && mounted) {
      setCurrentMessages(currentSession.messages);
    }
  }, [currentSessionId, currentSession, mounted]);

  const createSession = useCallback(() => {
    const newSession: ChatSession = {
      id: uuidv4(),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setCurrentMessages([]);
  }, []);

  const selectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  const deleteSession = useCallback(
    (sessionId: string) => {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        setCurrentSessionId(remaining.length > 0 ? remaining[0].id : null);
        setCurrentMessages(remaining.length > 0 ? remaining[0].messages : []);
      }
    },
    [currentSessionId, sessions],
  );

  const {
    connectionType,
    isConnected,
    connectionStatus,
    sendMessage: sendChatMessage,
  } = useChatClient({
    onChunk: (chunk) => {
      setStreamingContent((prev) => prev + chunk);
    },
    onComplete: (fullContent) => {
      const sessionId = currentSessionIdRef.current;
      const updateFn = updateSessionMessagesRef.current;
      if (sessionId && fullContent.trim() && updateFn) {
        const aiMsg: ChatMessage = {
          id: uuidv4(),
          role: "assistant",
          content: fullContent,
          timestamp: Date.now(),
        };
        setCurrentMessages((prev) => {
          const newMessages = [...prev, aiMsg];
          updateFn(sessionId, newMessages);
          return newMessages;
        });
      }
      setIsStreaming(false);
      setStreamingContent("");
    },
    onError: (error) => {
      console.error("Chat error:", error);
      setIsStreaming(false);
      setStreamingContent("");
    },
  });

  const sendChatMessageRef = useRef<typeof sendChatMessage>(sendChatMessage);
  useEffect(() => {
    sendChatMessageRef.current = sendChatMessage;
  }, [sendChatMessage]);

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!currentSessionId || !message.trim()) return;

      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: "user",
        content: message,
        timestamp: Date.now(),
      };

      setCurrentMessages((prev) => {
        const newMessages = [...prev, userMessage];
        updateSessionMessages(currentSessionId, newMessages);
        return newMessages;
      });

      setIsStreaming(true);
      setStreamingContent("");

      try {
        await sendChatMessageRef.current(currentSessionId, message);
      } catch (error) {
        setIsStreaming(false);
      }
    },
    [currentSessionId, updateSessionMessages],
  );

  const handleClearChat = useCallback(() => {
    if (currentSessionId) {
      setCurrentMessages([]);
      updateSessionMessages(currentSessionId, []);
    }
  }, [currentSessionId, updateSessionMessages]);

  // 在 hydration 完成前显示加载状态
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex">
      <Sidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onCreateSession={createSession}
        onSelectSession={selectSession}
        onDeleteSession={deleteSession}
      />

      <main className="flex-1 flex flex-col h-screen">
        {/* Header */}
        <header className="glass-panel border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white">
                {currentSession ? "新对话" : "AI 助手"}
              </h1>
              {/* 连接状态指示器 */}
              <div className="flex items-center gap-2 ml-4">
                <div
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === "connected"
                      ? "bg-green-400"
                      : connectionStatus === "connecting"
                        ? "bg-yellow-400 animate-pulse"
                        : connectionStatus === "fallback"
                          ? "bg-blue-400"
                          : "bg-red-400"
                  }`}
                />
                <span className="text-xs text-gray-400">
                  {connectionType === "websocket" ? "WebSocket" : "SSE"}
                  {connectionStatus === "fallback" && " (降级)"}
                </span>
              </div>
            </div>
            <button
              onClick={handleClearChat}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              disabled={isStreaming}
            >
              清空对话
            </button>
          </div>
        </header>

        {/* Messages */}
        <VirtualMessageList
          messages={currentMessages}
          streamingContent={streamingContent}
          isStreaming={isStreaming}
          currentSessionId={currentSessionId}
        />

        {/* Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isStreaming || !currentSessionId}
          onCreateSession={createSession}
          hasActiveSession={!!currentSessionId}
        />
      </main>
    </div>
  );
}

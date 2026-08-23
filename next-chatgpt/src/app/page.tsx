"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import VirtualMessageList from "@/components/VirtualMessageList";
import ChatInput from "@/components/ChatInput";
import AppSkeleton from "@/components/AppSkeleton";
import { ChatSession, ChatMessage, ChatAttachment } from "@/lib/langchain/chain";
import { useChatClient } from "@/hooks/useChatClient";
import { ToolCall, ChatPhase } from "@/lib/tools/types";
import { toolRegistry } from "@/lib/tools/registry";
import { registerAllTools } from "@/lib/tools/executor";
import { v4 as uuidv4 } from "uuid";
import { TTSProvider, useTTSContext } from "@/contexts/TTSContext";

// 前端也需要注册工具（用于 isAutoExecute 判断）
registerAllTools();

/** 自动播放 TTS：监听 streaming → idle 转换，自动朗读最后一条 AI 回复 */
function AutoPlayTTS({
  messages,
  isStreaming,
  chatPhase,
}: {
  messages: ChatMessage[];
  isStreaming: boolean;
  chatPhase: ChatPhase;
}) {
  const { speak } = useTTSContext();
  const prevStreamingRef = useRef(isStreaming);

  useEffect(() => {
    const wasStreaming = prevStreamingRef.current;
    prevStreamingRef.current = isStreaming;

    // streaming 结束 → idle（无工具调用），自动朗读最后一条 AI 消息
    if (wasStreaming && !isStreaming && chatPhase === "idle") {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.role === "assistant" && lastMsg.content?.trim()) {
        speak(lastMsg.content, lastMsg.id);
      }
    }
  }, [isStreaming, chatPhase, messages, speak]);

  return null;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // 🆕 Tool Call 状态
  const [chatPhase, setChatPhase] = useState<ChatPhase>("idle");
  const [pendingToolCalls, setPendingToolCalls] = useState<ToolCall[]>([]);

  const currentSessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  const currentMessagesRef = useRef<ChatMessage[]>(currentMessages);
  useEffect(() => {
    currentMessagesRef.current = currentMessages;
  }, [currentMessages]);

  /** 将会话消息防抖落盘到后端，避免流式/tool 回环期间频繁请求 */
  const persistSessionToBackend = useCallback(
    async (sessionId: string, messages: ChatMessage[]) => {
      try {
        const body = JSON.stringify({ sessionId, messages });
        const res = await fetch("/api/sessions", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (res.status === 404) {
          // 会话尚未在后端创建时先补建，再重试落盘
          await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: sessionId }),
          });
          await fetch("/api/sessions", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body,
          });
        }
      } catch (error) {
        console.error("Persist session failed:", error);
      }
    },
    []
  );

  const persistTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const updateSessionMessages = useCallback(
    (sessionId: string, messages: ChatMessage[]) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, messages, updatedAt: Date.now() } : s
        )
      );
      const existing = persistTimersRef.current.get(sessionId);
      if (existing) clearTimeout(existing);
      persistTimersRef.current.set(
        sessionId,
        setTimeout(() => {
          persistTimersRef.current.delete(sessionId);
          persistSessionToBackend(sessionId, messages);
        }, 300)
      );
    },
    [persistSessionToBackend]
  );

  const updateSessionMessagesRef = useRef<typeof updateSessionMessages>(
    updateSessionMessages
  );
  useEffect(() => {
    updateSessionMessagesRef.current = updateSessionMessages;
  }, [updateSessionMessages]);

  // 初始化：从后端加载会话
  useEffect(() => {
    let cancelled = false;
    setMounted(true);

    (async () => {
      try {
        const res = await fetch("/api/sessions");
        const storedSessions: ChatSession[] = res.ok ? await res.json() : [];
        if (cancelled) return;
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
      } catch (error) {
        console.error("Failed to load sessions:", error);
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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

    // 同步到后端（乐观创建，id 由前端生成避免卡顿）
    fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: newSession.id }),
    }).catch((error) => console.error("Create session failed:", error));
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
      fetch(`/api/sessions?sessionId=${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      }).catch((error) => console.error("Delete session failed:", error));
    },
    [currentSessionId, sessions]
  );

  // ===== 🆕 Tool Call 相关函数 =====

  const toolCallsSnapshotRef = useRef<ToolCall[]>([]);

  /** 执行单个工具（调用后端） */
  const executeTool = useCallback(
    async (toolCall: ToolCall): Promise<void> => {
      try {
        toolCall.parsedArgs = JSON.parse(toolCall.function.arguments || "{}");
      } catch { toolCall.parsedArgs = {}; }

      toolCall.status = "executing";
      setPendingToolCalls((prev) => [...prev]);

      try {
        const response = await fetch("/api/tools/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: toolCall.function.name,
            arguments: toolCall.function.arguments,
          }),
        });
        const data = await response.json();
        toolCall.status = data.status === "success" ? "completed" : "error";
        toolCall.result = data.result || "执行失败";
      } catch (err) {
        toolCall.status = "error";
        toolCall.result = err instanceof Error ? err.message : "网络请求失败";
      }
      setPendingToolCalls((prev) => [...prev]);
    },
    []
  );

  /** 用户确认执行 manual 工具 */
  const handleToolExecute = useCallback(
    (toolCallId: string) => {
      setPendingToolCalls((prev) => {
        const tc = prev.find((t) => t.id === toolCallId);
        if (tc) { tc.status = "approved"; executeTool(tc); }
        return [...prev];
      });
    },
    [executeTool]
  );

  /** 用户取消 manual 工具 */
  const handleToolCancel = useCallback((toolCallId: string) => {
    setPendingToolCalls((prev) => {
      const tc = prev.find((t) => t.id === toolCallId);
      if (tc) tc.status = "cancelled";
      return [...prev];
    });
  }, []);

  /** 🆕 useEffect: 检测所有工具 resolved → 触发后续发送 */
  useEffect(() => {
    if (chatPhase !== "awaiting_tools") return;
    if (pendingToolCalls.length === 0) return;

    const allResolved = pendingToolCalls.every(
      (tc) =>
        tc.status === "completed" ||
        tc.status === "error" ||
        tc.status === "cancelled"
    );
    if (!allResolved) return;

    // 保存快照供后续发送使用
    toolCallsSnapshotRef.current = [...pendingToolCalls];
    // 转换到 sending_tools 阶段
    setChatPhase("sending_tools");
  }, [chatPhase, pendingToolCalls]);

  /** 🆕 useEffect: sending_tools 阶段 → 构造 tool 消息并发回 AI */
  useEffect(() => {
    if (chatPhase !== "sending_tools") return;

    const toolCalls = toolCallsSnapshotRef.current;
    if (toolCalls.length === 0) return;

    const sessionId = currentSessionIdRef.current;
    if (!sessionId) {
      setChatPhase("idle");
      return;
    }

    let cancelled = false;

    const doFollowUp = async () => {
      // 构造 tool 消息
      const toolMessages: ChatMessage[] = toolCalls
        .filter((tc) => tc.status === "completed" || tc.status === "error")
        .map((tc) => ({
          id: uuidv4(),
          role: "tool" as const,
          tool_call_id: tc.id,
          name: tc.function.name,
          content: tc.result || "",
          timestamp: Date.now(),
        }));

      // 追加 tool 消息到当前对话
      let messagesToSend: ChatMessage[] = [];
      setCurrentMessages((prev) => {
        const newMessages = [...prev, ...toolMessages];
        messagesToSend = newMessages;
        updateSessionMessagesRef.current?.(sessionId, newMessages);
        currentMessagesRef.current = newMessages;
        return newMessages;
      });

      // 等 React 提交状态
      await new Promise((r) => setTimeout(r, 100));
      if (cancelled) return;

      setPendingToolCalls([]);
      setChatPhase("streaming");
      setIsStreaming(true);
      setStreamingContent("");

      try {
        await sendChatMessageRef.current(sessionId, messagesToSend);
      } catch (error) {
        if (!cancelled) {
          console.error("Tool follow-up error:", error);
          setIsStreaming(false);
          setChatPhase("idle");
        }
      }
    };

    doFollowUp();
    return () => { cancelled = true; };
  }, [chatPhase]);

  const handleToolCalls = useCallback(
    (toolCalls: ToolCall[]) => {
      for (const tc of toolCalls) {
        tc.status = toolRegistry.isAutoExecute(tc.function.name)
          ? "executing"
          : "pending";
      }

      setPendingToolCalls([...toolCalls]);
      setChatPhase("awaiting_tools");

      // Auto 工具并发执行
      const autoTools = toolCalls.filter((tc) => tc.status === "executing");
      autoTools.forEach((tc) => executeTool(tc));
    },
    [executeTool]
  );

  // ===== useChatClient =====

  const {
    connectionType,
    isConnected,
    connectionStatus,
    sendMessage: sendChatMessage,
  } = useChatClient({
    onChunk: (chunk) => {
      setStreamingContent((prev) => prev + chunk);
    },
    onToolCalls: (toolCalls: ToolCall[]) => {
      // 存储 tool calls（用于添加到 assistant 消息中）
      pendingToolCallsRef.current = toolCalls;
    },
    onComplete: (fullContent: string, finishReason: string) => {
      const sessionId = currentSessionIdRef.current;
      const updateFn = updateSessionMessagesRef.current;

      if (!sessionId || !updateFn) {
        setIsStreaming(false);
        setStreamingContent("");
        setChatPhase("idle");
        return;
      }

      // 创建 assistant 消息
      const toolCalls = pendingToolCallsRef.current;
      const aiMsg: ChatMessage = {
        id: uuidv4(),
        role: "assistant",
        content: fullContent,
        timestamp: Date.now(),
      };

      if (toolCalls && toolCalls.length > 0) {
        aiMsg.tool_calls = toolCalls;
        // 重置 tool calls status
        toolCalls.forEach((tc) => {
          tc.status = "pending";
        });
      }

      setCurrentMessages((prev) => {
        const newMessages = [...prev, aiMsg];
        updateFn(sessionId, newMessages);
        currentMessagesRef.current = newMessages;
        return newMessages;
      });

      setIsStreaming(false);
      setStreamingContent("");

      // 判断是否需要进入 tool call 循环
      if (
        finishReason === "tool_calls" &&
        toolCalls &&
        toolCalls.length > 0
      ) {
        handleToolCalls(toolCalls);
      } else {
        setChatPhase("idle");
      }
      pendingToolCallsRef.current = [];
    },
    onError: (error) => {
      console.error("Chat error:", error);
      setIsStreaming(false);
      setStreamingContent("");
      setChatPhase("idle");
    },
  });

  const sendChatMessageRef = useRef<typeof sendChatMessage>(sendChatMessage);
  useEffect(() => {
    sendChatMessageRef.current = sendChatMessage;
  }, [sendChatMessage]);

  const pendingToolCallsRef = useRef<ToolCall[]>([]);

  // ===== 发送消息 =====

  const handleSendMessage = useCallback(
    async (message: string, files?: import("@/hooks/useFileUpload").UploadedFile[]) => {
      if (!currentSessionId || (!message.trim() && (!files || files.length === 0))) return;

      // 将上传文件转为可持久化的 attachments
      let attachments: ChatAttachment[] | undefined;
      if (files && files.length > 0) {
        attachments = await Promise.all(
          files.map(
            (f) =>
              new Promise<ChatAttachment>((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                  resolve({
                    id: f.id,
                    name: f.name,
                    type: f.type,
                    size: f.size,
                    dataUrl: reader.result as string,
                  });
                };
                reader.onerror = () => {
                  // 读取失败时用预览 URL 作为兜底
                  resolve({
                    id: f.id,
                    name: f.name,
                    type: f.type,
                    size: f.size,
                    dataUrl: f.previewUrl,
                  });
                };
                reader.readAsDataURL(f.file);
              }),
          ),
        );
      }

      const userMessage: ChatMessage = {
        id: uuidv4(),
        role: "user",
        content: message || "发送了一张图片",
        timestamp: Date.now(),
        attachments,
      };

      setCurrentMessages((prev) => {
        const newMessages = [...prev, userMessage];
        updateSessionMessages(currentSessionId, newMessages);
        currentMessagesRef.current = newMessages;
        return newMessages;
      });

      setChatPhase("streaming");
      setIsStreaming(true);
      setStreamingContent("");
      setPendingToolCalls([]);
      pendingToolCallsRef.current = [];

      try {
        // 发送完整 messages 数组
        const latestMessages = currentMessagesRef.current;
        await sendChatMessageRef.current(currentSessionId, latestMessages);
      } catch (error) {
        console.error("Send error:", error);
        setIsStreaming(false);
        setChatPhase("idle");
      }
    },
    [currentSessionId, updateSessionMessages]
  );

  const handleClearChat = useCallback(() => {
    if (currentSessionId) {
      setCurrentMessages([]);
      updateSessionMessages(currentSessionId, []);
      setPendingToolCalls([]);
      setChatPhase("idle");
    }
  }, [currentSessionId, updateSessionMessages]);

  // 在 hydration / 会话加载完成前显示骨架
  if (!mounted || loadingSessions) {
    return <AppSkeleton />;
  }

  const isProcessing =
    isStreaming ||
    chatPhase === "awaiting_tools" ||
    chatPhase === "sending_tools";

  return (
    <TTSProvider>
      <AutoPlayTTS
        messages={currentMessages}
        isStreaming={isStreaming}
        chatPhase={chatPhase}
      />
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
              {/* Tool Call 状态指示 */}
              {chatPhase === "awaiting_tools" && (
                <span className="text-xs text-yellow-400 animate-pulse ml-2">
                  ⏳ 等待工具执行...
                </span>
              )}
            </div>
            <button
              onClick={handleClearChat}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              disabled={isProcessing}
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
          onToolExecute={handleToolExecute}
          onToolCancel={handleToolCancel}
        />

        {/* Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isProcessing || !currentSessionId}
          onCreateSession={createSession}
          hasActiveSession={!!currentSessionId}
        />
      </main>
    </div>
    </TTSProvider>
  );
}

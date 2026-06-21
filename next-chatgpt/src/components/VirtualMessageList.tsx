"use client";
import React, { useCallback, useRef, useEffect } from "react";
import {
  List,
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
} from "react-virtualized";
import { ChatMessage } from "@/lib/langchain/chain";
import MarkdownRenderer from "./MarkdownRenderer";

interface VirtualMessageListProps {
  messages: ChatMessage[];
  streamingContent?: string;
  isStreaming?: boolean;
  currentSessionId?: string | null;
  onScrollToBottom?: () => void;
}

const VirtualMessageList: React.FC<VirtualMessageListProps> = ({
  messages,
  streamingContent = "",
  isStreaming = false,
}) => {
  const listRef = useRef<List>(null);
  const cacheRef = useRef(
    new CellMeasurerCache({
      fixedWidth: true,
      defaultHeight: 50,
    }),
  );

  // 当消息变化时，清除缓存并滚动到底部
  useEffect(() => {
    cacheRef.current.clearAll();
    if (messages.length > 0 && listRef.current) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToRow(messages.length - 1);
      });
    }
  }, [messages.length, messages]);

  useEffect(() => {
    if (isStreaming && streamingContent) {
      cacheRef.current.clear(messages.length, 0);
      requestAnimationFrame(() => {
        listRef.current?.scrollToRow(messages.length);
      });
    }
  }, [streamingContent, isStreaming, messages.length]);

  const rowRenderer = useCallback(
    ({ index, key, style, parent }: any) => {
      // 流式消息行
      if (isStreaming && index === messages.length) {
        return (
          <CellMeasurer
            cache={cacheRef.current}
            columnIndex={0}
            key={key}
            parent={parent}
            rowIndex={index}
          >
            <div style={style} className="flex justify-start mb-4 px-4">
              <div className="max-w-[80%] px-4 py-3 rounded-2xl bg-gray-800 text-gray-100 rounded-bl-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs opacity-70">AI</span>
                  <span className="text-xs opacity-50">
                    {new Date().toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="whitespace-pre-wrap break-words">
                  {streamingContent ? (
                    <MarkdownRenderer content={streamingContent} isStreaming />
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CellMeasurer>
        );
      }

      const message = messages[index];
      if (!message) return null;

      // 确保内容不为 undefined
      const content = message.content ?? "";
      const role = message.role ?? "assistant";
      const timestamp = message.timestamp ?? Date.now();

      return (
        <CellMeasurer
          cache={cacheRef.current}
          columnIndex={0}
          key={key}
          parent={parent}
          rowIndex={index}
        >
          <div
            style={style}
            className={`flex ${role === "user" ? "justify-end" : "justify-start"} mb-4 px-4`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                role === "user"
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm"
                  : "bg-gray-800 text-gray-100 rounded-bl-sm"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs opacity-70">
                  {role === "user" ? "我" : "AI"}
                </span>
                <span className="text-xs opacity-50">
                  {new Date(timestamp).toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="whitespace-pre-wrap break-words min-h-[20px]">
                {content ? (
                  <MarkdownRenderer content={content} />
                ) : (
                  <span className="text-gray-400 italic">空消息</span>
                )}
              </div>
            </div>
          </div>
        </CellMeasurer>
      );
    },
    [messages, isStreaming, streamingContent],
  );

  const getRowHeight = useCallback(({ index }: { index: number }) => {
    return cacheRef.current.getHeight(index, 0) || 50;
  }, []);

  const rowCount = isStreaming ? messages.length + 1 : messages.length;

  return (
    <div className="flex-1 overflow-hidden">
      {messages.length === 0 && !isStreaming ? (
        <div className="h-full flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-4">👋</div>
            <p>开始一个新的对话吧</p>
          </div>
        </div>
      ) : (
        <AutoSizer>
          {({ height, width }) => (
            <List
              ref={listRef}
              autoHeight={false}
              height={height}
              width={width}
              rowCount={rowCount}
              rowHeight={getRowHeight}
              rowRenderer={rowRenderer}
              overscanRowCount={5}
            />
          )}
        </AutoSizer>
      )}
    </div>
  );
};

export default VirtualMessageList;

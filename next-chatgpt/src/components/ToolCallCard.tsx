"use client";
import React, { useState } from "react";
import { ToolCall } from "@/lib/tools/types";
import { toolRegistry } from "@/lib/tools/registry";

interface ToolCallCardProps {
  toolCall: ToolCall;
  onExecute?: (toolCallId: string) => void;
  onCancel?: (toolCallId: string) => void;
}

/** 格式化 arguments JSON 为可读文本 */
function formatArgs(toolCall: ToolCall): string {
  try {
    const args = JSON.parse(toolCall.function.arguments);
    const entries = Object.entries(args);
    if (entries.length === 0) return "无参数";
    return entries
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(", ");
  } catch {
    return toolCall.function.arguments || "无参数";
  }
}

const ToolCallCard: React.FC<ToolCallCardProps> = ({
  toolCall,
  onExecute,
  onCancel,
}) => {
  const [expanded, setExpanded] = useState(false);
  const meta = toolRegistry.getMeta(toolCall.function.name);
  const icon = meta?.icon || "🔧";
  const displayName = meta?.displayName || toolCall.function.name;

  const status = toolCall.status;

  const statusConfig: Record<
    string,
    { bg: string; label: string; icon: string }
  > = {
    pending: {
      bg: "bg-yellow-500/10 border-yellow-500/30",
      label: "等待确认",
      icon: "⚠️",
    },
    approved: {
      bg: "bg-blue-500/10 border-blue-500/30",
      label: "已确认",
      icon: "✓",
    },
    executing: {
      bg: "bg-blue-500/10 border-blue-500/30",
      label: "执行中",
      icon: "⏳",
    },
    completed: {
      bg: "bg-green-500/10 border-green-500/30",
      label: "完成",
      icon: "✅",
    },
    error: {
      bg: "bg-red-500/10 border-red-500/30",
      label: "失败",
      icon: "❌",
    },
    cancelled: {
      bg: "bg-gray-500/10 border-gray-500/30",
      label: "已取消",
      icon: "🚫",
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div
      className={`rounded-xl border ${config.bg} p-3 my-2 text-sm transition-all duration-200`}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-medium text-gray-200">{displayName}</span>
          <span className="text-xs text-gray-400">
            {config.icon} {config.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 展开/折叠 */}
          {(status === "completed" || status === "error") &&
            toolCall.result && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
              >
                {expanded ? "收起" : "详情"}
              </button>
            )}
        </div>
      </div>

      {/* 参数 */}
      {(status === "pending" || status === "executing") && (
        <div className="mt-1.5 text-xs text-gray-400 font-mono">
          {formatArgs(toolCall)}
        </div>
      )}

      {/* 执行动画 */}
      {status === "executing" && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" />
            <div
              className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.1s" }}
            />
            <div
              className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            />
          </div>
          <span className="text-xs text-gray-500">正在执行...</span>
        </div>
      )}

      {/* 结果 */}
      {expanded && toolCall.result && (
        <div className="mt-2 p-2 rounded-lg bg-black/20 text-xs text-gray-300 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap break-all">
          {toolCall.result}
        </div>
      )}

      {/* 结果摘要（未展开时） */}
      {!expanded && status === "completed" && toolCall.result && (
        <div className="mt-1.5 text-xs text-green-400 truncate max-w-md">
          {toolCall.result.length > 80
            ? toolCall.result.slice(0, 80) + "..."
            : toolCall.result}
        </div>
      )}

      {/* 错误信息 */}
      {status === "error" && toolCall.result && (
        <div className="mt-1.5 text-xs text-red-400">{toolCall.result}</div>
      )}

      {/* 操作按钮 */}
      {status === "pending" && (
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => onCancel?.(toolCall.id)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-600 text-gray-400 hover:text-gray-300 hover:border-gray-500 transition-colors"
          >
            拒绝
          </button>
          <button
            onClick={() => onExecute?.(toolCall.id)}
            className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            允许执行
          </button>
        </div>
      )}
    </div>
  );
};

export default ToolCallCard;

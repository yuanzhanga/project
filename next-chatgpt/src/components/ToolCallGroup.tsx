"use client";
import React from "react";
import ToolCallCard from "./ToolCallCard";
import { ToolCall } from "@/lib/tools/types";

interface ToolCallGroupProps {
  toolCalls: ToolCall[];
  onExecute?: (toolCallId: string) => void;
  onCancel?: (toolCallId: string) => void;
}

const ToolCallGroup: React.FC<ToolCallGroupProps> = ({
  toolCalls,
  onExecute,
  onCancel,
}) => {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {toolCalls.length > 1 && (
        <div className="text-xs text-gray-500 mb-1">
          🔧 AI 请求调用 {toolCalls.length} 个工具
        </div>
      )}
      {toolCalls.map((tc) => (
        <ToolCallCard
          key={tc.id}
          toolCall={tc}
          onExecute={onExecute}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
};

export default ToolCallGroup;

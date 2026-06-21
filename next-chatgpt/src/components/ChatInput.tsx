"use client";
import React, { useState, useRef, useEffect } from "react";
import VoiceInput from "./VoiceInput";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  onCreateSession?: () => void;
  hasActiveSession?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  onCreateSession,
  hasActiveSession = false,
}) => {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener("input", handleResize);
      handleResize();
    }

    return () => {
      if (textarea) {
        textarea.removeEventListener("input", handleResize);
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasActiveSession) {
      // 如果没有活动会话，先创建一个
      onCreateSession?.();
      return;
    }
    if (message.trim() && !disabled) {
      const trimmedMessage = message.trim();
      onSendMessage(trimmedMessage);
      setMessage("");
    }
  };

  const handleVoiceResult = (text: string) => {
    setMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-end gap-3 p-4 bg-gray-800/50 backdrop-blur-sm border-t border-gray-700 ${
        isFocused ? "ring-1 ring-blue-500" : ""
      } transition-all duration-200`}
    >
      <VoiceInput onResult={handleVoiceResult} />
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={
            hasActiveSession ? "输入消息..." : "请先创建或选择一个会话"
          }
          disabled={disabled}
          className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          rows={1}
        />
      </div>
      <button
        type="submit"
        disabled={!message.trim() || disabled}
        className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
          hasActiveSession && message.trim() && !disabled
            ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:shadow-lg hover:shadow-blue-500/30"
            : "bg-gray-600 text-gray-400 cursor-not-allowed"
        }`}
      >
        {!hasActiveSession ? (
          "开始对话"
        ) : disabled ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            发送中
          </span>
        ) : (
          "发送"
        )}
      </button>
    </form>
  );
};

export default ChatInput;

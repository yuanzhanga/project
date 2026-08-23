"use client";
import React, { useState, useRef, useEffect } from "react";
import VoiceInput from "./VoiceInput";
import { useFileUpload, UploadedFile } from "../hooks/useFileUpload";

interface ChatInputProps {
  onSendMessage: (message: string, files?: UploadedFile[]) => void;
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

  const { files, openFilePicker, removeFile, clearFiles, hasFiles } =
    useFileUpload({
      accept: "image/*",
      maxFiles: 5,
      maxSize: 10 * 1024 * 1024, // 10MB
      multiple: true,
    });

  // 移除粘贴板中的图片部分，避免在 textarea 中显示乱码
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
            e.preventDefault(); // 阻止图片以 base64 形式插入到 textarea
          }
        }
      }

      if (imageFiles.length > 0) {
        // 直接通过 hook 添加文件，触发 onChange 事件以更新 ref
        const input = document.createElement("input");
        input.type = "file";
        const dt = new DataTransfer();
        imageFiles.forEach((f) => dt.items.add(f));
        input.files = dt.files;

        // 直接用 addFiles 的函数式调用
        const event = new Event("change", { bubbles: true });
        Object.defineProperty(event, "target", {
          value: input,
          writable: false,
        });
        input.dispatchEvent(event);
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener("paste", handlePaste);
    }
    return () => {
      if (textarea) {
        textarea.removeEventListener("paste", handlePaste);
      }
    };
  }, []);

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
      onCreateSession?.();
      return;
    }
    if ((message.trim() || hasFiles) && !disabled) {
      const trimmedMessage = message.trim();
      onSendMessage(trimmedMessage, files.length > 0 ? files : undefined);
      setMessage("");
      clearFiles();
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
      className={`flex flex-col bg-gray-800/50 backdrop-blur-sm border-t border-gray-700 ${
        isFocused ? "ring-1 ring-blue-500" : ""
      } transition-all duration-200`}
    >
      {/* 图片预览区域 */}
      {hasFiles && (
        <div className="flex items-center gap-2 px-4 pt-3 pb-1 overflow-x-auto scrollbar-thin">
          {files.map((file) => (
            <div
              key={file.id}
              className="relative group shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-700 border border-gray-600"
            >
              <img
                src={file.previewUrl}
                alt={file.name}
                className="w-full h-full object-cover"
              />
              {/* 删除按钮 */}
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-red-600"
                title="移除图片"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              {/* 文件名提示 */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 truncate opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {file.name}
              </div>
            </div>
          ))}
          {/* 继续添加按钮 */}
          {files.length < 5 && (
            <button
              type="button"
              onClick={openFilePicker}
              className="shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-gray-500 text-gray-400 hover:border-blue-400 hover:text-blue-400 flex items-center justify-center transition-colors duration-150"
              title="添加更多图片"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* 底部输入栏 */}
      <div className="flex items-end gap-3 p-4">
        {/* 语音输入 */}
        <VoiceInput onResult={handleVoiceResult} disabled={disabled} />

        {/* 添加文件按钮 */}
        <button
          type="button"
          onClick={openFilePicker}
          disabled={disabled}
          title="添加图片"
          className={`shrink-0 p-3 rounded-full transition-all duration-200 ${
            hasFiles
              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white hover:scale-105"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>

        {/* 文本输入 */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={
              hasFiles
                ? "输入消息（可选）..."
                : hasActiveSession
                  ? "输入消息..."
                  : "请先创建或选择一个会话"
            }
            disabled={disabled}
            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
          />
        </div>

        {/* 发送按钮 */}
        <button
          type="submit"
          disabled={(!message.trim() && !hasFiles) || disabled}
          className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
            hasActiveSession && (message.trim() || hasFiles) && !disabled
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
      </div>
    </form>
  );
};

export default ChatInput;

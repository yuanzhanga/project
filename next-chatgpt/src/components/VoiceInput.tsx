import React from "react";
import { useVoiceInput } from "../hooks/useVoiceInput";

interface VoiceInputProps {
  onResult: (text: string) => void;
  onStatusChange?: (isRecording: boolean) => void;
}

const VoiceInput: React.FC<VoiceInputProps> = ({
  onResult,
  onStatusChange,
}) => {
  const { isRecording, isProcessing, hasSupport, toggleRecording } =
    useVoiceInput({
      onResult,
      onStatusChange,
    });

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleRecording();
      }}
      disabled={isProcessing}
      className={`p-3 rounded-full transition-all duration-300 ${
        isRecording
          ? "bg-red-500 hover:bg-red-600 animate-pulse shadow-lg shadow-red-500/50"
          : "bg-gray-700 hover:bg-gray-600 hover:scale-105"
      } ${!hasSupport ? "opacity-50 cursor-not-allowed" : ""}`}
      title={
        hasSupport
          ? isRecording
            ? "点击停止录音"
            : "点击开始录音"
          : "浏览器不支持语音识别"
      }
    >
      {isProcessing ? (
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : isRecording ? (
        <svg
          className="w-6 h-6 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg
          className="w-6 h-6 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zm0 18a3 3 0 003-3v-8a3 3 0 00-6 0v8a3 3 0 003 3z" />
        </svg>
      )}
    </button>
  );
};

export default VoiceInput;

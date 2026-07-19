"use client";
import React, { useCallback, useRef, useState } from "react";
import { useVoiceInput } from "../hooks/useVoiceInput";

interface VoiceInputProps {
  onResult: (text: string) => void;
  disabled?: boolean;
}

const VoiceInput: React.FC<VoiceInputProps> = ({ onResult, disabled = false }) => {
  const { isRecording, isProcessing, hasSupport, startRecording, stopRecording } =
    useVoiceInput({ onResult });

  const activeRef = useRef(false);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || !hasSupport) return;
      e.preventDefault();
      activeRef.current = true;
      startRecording();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [disabled, hasSupport, startRecording],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!activeRef.current) return;
      activeRef.current = false;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      stopRecording();
    },
    [stopRecording],
  );

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled || isProcessing}
      title={hasSupport ? "按住说话" : "浏览器不支持语音识别"}
      className={`shrink-0 p-3 rounded-full transition-all duration-200 touch-none select-none ${
        isRecording
          ? "bg-red-500 animate-pulse shadow-lg shadow-red-500/50 scale-105"
          : "bg-gray-700 hover:bg-gray-600 hover:scale-105"
      } ${!hasSupport ? "opacity-50 cursor-not-allowed" : ""} disabled:opacity-50`}
    >
      {isProcessing ? (
        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zm0 18a3 3 0 003-3v-8a3 3 0 00-6 0v8a3 3 0 003 3z" />
        </svg>
      )}
    </button>
  );
};

export default VoiceInput;

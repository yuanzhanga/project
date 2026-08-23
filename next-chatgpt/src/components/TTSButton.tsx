"use client";
import React, { useState, useRef, useEffect } from "react";
import { useTTSContext } from "@/contexts/TTSContext";
import type { TTSRate } from "@/hooks/useTTS";

interface TTSButtonProps {
  text: string;
  messageId: string;
}

const RATE_OPTIONS: { label: string; value: TTSRate }[] = [
  { label: "0.5×", value: 0.5 },
  { label: "0.75×", value: 0.75 },
  { label: "1×", value: 1 },
  { label: "1.25×", value: 1.25 },
  { label: "1.5×", value: 1.5 },
  { label: "2×", value: 2 },
];

const TTSButton: React.FC<TTSButtonProps> = ({ text, messageId }) => {
  const {
    speak,
    pause,
    resume,
    setRate,
    speakingMessageId,
    isSpeaking,
    isPaused,
    rate,
    hasSupport,
  } = useTTSContext();

  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isThisMessage = speakingMessageId === messageId;
  const isPlaying = isThisMessage && isSpeaking && !isPaused;
  const isThisPaused = isThisMessage && isPaused;

  // 点击菜单外部关闭
  useEffect(() => {
    if (!showSpeedMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowSpeedMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSpeedMenu]);

  if (!hasSupport || !text.trim()) return null;

  const handleClick = () => {
    if (isPlaying) {
      pause();
    } else if (isThisPaused) {
      resume();
    } else {
      speak(text, messageId);
    }
  };

  const handleRateSelect = (r: TTSRate) => {
    setRate(r);
    setShowSpeedMenu(false);
  };

  return (
    <div className="relative inline-flex items-center" ref={menuRef}>
      {/* 播报按钮 */}
      <button
        type="button"
        onClick={handleClick}
        title={
          isPlaying ? "暂停" : isThisPaused ? "继续" : "朗读"
        }
        className={`ml-1 p-1 rounded-full transition-all duration-150 hover:scale-110 ${
          isThisMessage
            ? "text-blue-400 bg-blue-500/10 hover:bg-blue-500/20"
            : "text-gray-500 hover:text-gray-300 hover:bg-gray-600/50"
        }`}
      >
        {isPlaying ? (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5.14v14l11-7-11-7z" />
          </svg>
        )}
      </button>

      {/* 倍速选择器 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowSpeedMenu(!showSpeedMenu);
        }}
        className="ml-0.5 px-1.5 py-0.5 rounded text-xs text-gray-500 hover:text-gray-300 hover:bg-gray-600/50 transition-colors min-w-[28px]"
        title="播放速度"
      >
        {rate}×
      </button>

      {showSpeedMenu && (
        <div className="absolute bottom-full left-0 mb-1.5 bg-gray-800 border border-gray-600 rounded-lg shadow-xl py-1 z-[9999] min-w-[72px]">
          {RATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleRateSelect(opt.value);
              }}
              className={`block w-full px-3 py-2 text-xs text-left hover:bg-gray-700 transition-colors ${
                rate === opt.value
                  ? "text-blue-400 bg-blue-500/10"
                  : "text-gray-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TTSButton;

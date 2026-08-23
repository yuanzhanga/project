"use client";
import React, { createContext, useContext, useCallback, useRef, useState } from "react";
import type { TTSRate } from "@/hooks/useTTS";

interface TTSContextValue {
  speak: (text: string, messageId: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setRate: (rate: TTSRate) => void;
  speakingMessageId: string | null;
  isSpeaking: boolean;
  isPaused: boolean;
  rate: TTSRate;
  hasSupport: boolean;
  setSpeakingMessageId: (id: string | null) => void;
  setIsSpeaking: (v: boolean) => void;
  setIsPaused: (v: boolean) => void;
  getCore: () => TTSCore | null;
}

export interface TTSCore {
  speak: (text: string, messageId: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setRate: (rate: TTSRate) => void;
  getRate: () => TTSRate;
  onEnd: ((messageId: string) => void) | null;
}

const TTSContext = createContext<TTSContextValue | null>(null);

export function useTTSContext() {
  const ctx = useContext(TTSContext);
  if (!ctx) throw new Error("useTTSContext must be used within TTSProvider");
  return ctx;
}

export function TTSProvider({ children }: { children: React.ReactNode }) {
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRateState] = useState<TTSRate>(1);

  const rateRef = useRef<TTSRate>(1);
  const currentMsgIdRef = useRef<string | null>(null);
  // 剩余待朗读的文本，每次 chunk 读完时裁剪
  const remainingTextRef = useRef<string>("");
  const onEndRef = useRef<((messageId: string) => void) | null>(null);
  // 标记是否正在内部重启（避免 setRate → restart 循环）
  const restartingRef = useRef(false);

  const hasSupport =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const killUtterance = useCallback(() => {
    if (typeof window === "undefined") return;
    speechSynthesis.cancel();
    if (!restartingRef.current) {
      setIsSpeaking(false);
      setIsPaused(false);
      setSpeakingMessageId(null);
      currentMsgIdRef.current = null;
      remainingTextRef.current = "";
    }
  }, []);

  /** 从 remainingTextRef 开始朗读 */
  const startSpeaking = useCallback(() => {
    const synth = speechSynthesis;
    const text = remainingTextRef.current;
    const msgId = currentMsgIdRef.current;
    if (!text || !msgId) return;

    const chunks = splitTextIntoChunks(text, 120); // 小块，倍速切换更快生效

    function utterNext() {
      if (chunks.length === 0) {
        const mid = currentMsgIdRef.current!;
        remainingTextRef.current = "";
        killUtterance();
        onEndRef.current?.(mid);
        return;
      }

      const chunk = chunks.shift()!;
      // 更新剩余文本（用于倍速切换时重启）
      remainingTextRef.current = chunks.join("");

      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.rate = rateRef.current;
      utterance.lang = "zh-CN";

      const voices = synth.getVoices();
      const zhVoice =
        voices.find((v) => v.lang === "zh-CN" && v.name.includes("Google")) ||
        voices.find((v) => v.lang === "zh-CN") ||
        voices.find((v) => v.lang.startsWith("zh")) ||
        null;
      if (zhVoice) utterance.voice = zhVoice;

      utterance.onend = () => utterNext();
      utterance.onerror = (e) => {
        if (e.error === "canceled" || e.error === "interrupted") return;
        utterNext();
      };

      synth.speak(utterance);
    }

    setIsSpeaking(true);
    setIsPaused(false);
    setSpeakingMessageId(msgId);
    utterNext();
  }, [killUtterance]);

  const speak = useCallback(
    (text: string, messageId: string) => {
      if (!hasSupport || !text.trim()) return;
      speechSynthesis.cancel();
      remainingTextRef.current = text;
      currentMsgIdRef.current = messageId;
      startSpeaking();
    },
    [hasSupport, startSpeaking],
  );

  const pause = useCallback(() => {
    speechSynthesis.pause();
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    speechSynthesis.resume();
    setIsPaused(false);
  }, []);

  const setRate = useCallback(
    (r: TTSRate) => {
      rateRef.current = r;
      setRateState(r);

      // 如果正在朗读，立即打断并从剩余文本用新倍速重启
      if (currentMsgIdRef.current && remainingTextRef.current) {
        restartingRef.current = true;
        speechSynthesis.cancel();
        // 短暂延迟确保 cancel 完成
        setTimeout(() => {
          restartingRef.current = false;
          startSpeaking();
        }, 50);
      }
    },
    [startSpeaking],
  );

  const getCore = useCallback((): TTSCore | null => null, []);

  return (
    <TTSContext.Provider
      value={{
        speak,
        pause,
        resume,
        stop: killUtterance,
        setRate,
        speakingMessageId,
        isSpeaking,
        isPaused,
        rate,
        hasSupport,
        setSpeakingMessageId,
        setIsSpeaking,
        setIsPaused,
        getCore,
      }}
    >
      {children}
    </TTSContext.Provider>
  );
}

function splitTextIntoChunks(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    let cutAt = maxLen;
    const slice = remaining.slice(0, maxLen);
    const lastPeriod = Math.max(
      slice.lastIndexOf("。"),
      slice.lastIndexOf("！"),
      slice.lastIndexOf("？"),
      slice.lastIndexOf("\n"),
      slice.lastIndexOf("；"),
      slice.lastIndexOf("，"),
    );

    if (lastPeriod > maxLen * 0.5) {
      cutAt = lastPeriod + 1;
    } else {
      const lastSpace = slice.lastIndexOf(" ");
      if (lastSpace > maxLen * 0.5) {
        cutAt = lastSpace + 1;
      }
    }

    chunks.push(remaining.slice(0, cutAt));
    remaining = remaining.slice(cutAt);
  }

  return chunks;
}

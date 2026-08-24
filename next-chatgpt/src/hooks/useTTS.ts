"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { stripMarkdownForSpeech } from "@/lib/tts";

export type TTSRate = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2;

export interface TTSSpeakingState {
  messageId: string;
  isSpeaking: boolean;
  isPaused: boolean;
  rate: TTSRate;
}

interface UseTTSOptions {
  /** 自动朗读完成后的回调 */
  onEnd?: (messageId: string) => void;
}

interface UseTTSReturn {
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
}

export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const { onEnd } = options;

  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRateState] = useState<TTSRate>(1);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const rateRef = useRef<TTSRate>(1);
  const allTextRef = useRef<string>("");
  const messageIdRef = useRef<string | null>(null);
  const charIndexRef = useRef(0);

  const hasSupport =
    typeof window !== "undefined" && "speechSynthesis" in window;

  // 停止当前朗读
  const killUtterance = useCallback(() => {
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current.onboundary = null;
      utteranceRef.current = null;
    }
    speechSynthesis.cancel();
    charIndexRef.current = 0;
    allTextRef.current = "";
    messageIdRef.current = null;
    setIsSpeaking(false);
    setIsPaused(false);
    setSpeakingMessageId(null);
  }, []);

  // 核心：切块朗读。SpeechSynthesis 有单次字符数限制（~200 chars），
  // 长文本需要切块，每读完一块自动读下一块。
  const speakChunk = useCallback((text: string, messageId: string, rate: TTSRate) => {
    if (!hasSupport) return;

    const synth = speechSynthesis;

    // 先清空之前的
    synth.cancel();

    allTextRef.current = text;
    messageIdRef.current = messageId;
    rateRef.current = rate;
    charIndexRef.current = 0;

    // 按句子边界切分，尽量避免截断
    const chunks = splitTextIntoChunks(text, 180);

    function utterNext() {
      if (charIndexRef.current >= allTextRef.current.length) {
        // 全部读完
        const mid = messageIdRef.current!;
        killUtterance();
        onEnd?.(mid);
        return;
      }

      const chunk = chunks.shift();
      if (!chunk || !chunk.trim()) {
        charIndexRef.current = allTextRef.current.length;
        utterNext();
        return;
      }

      charIndexRef.current += chunk.length;

      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.rate = rateRef.current;
      utterance.lang = "zh-CN";

      // 尝试选一个好的中文语音
      const voices = synth.getVoices();
      const zhVoice =
        voices.find((v) => v.lang === "zh-CN" && v.name.includes("Google")) ||
        voices.find((v) => v.lang === "zh-CN") ||
        voices.find((v) => v.lang.startsWith("zh")) ||
        null;
      if (zhVoice) utterance.voice = zhVoice;

      utterance.onend = () => {
        if (utteranceRef.current === utterance) {
          utterNext();
        }
      };

      utterance.onerror = (e) => {
        if (e.error === "canceled" || e.error === "interrupted") return;
        console.warn("TTS error:", e.error);
        // 尝试继续下一块
        if (utteranceRef.current === utterance) {
          utterNext();
        }
      };

      utteranceRef.current = utterance;
      synth.speak(utterance);
    }

    setIsSpeaking(true);
    setIsPaused(false);
    setSpeakingMessageId(messageId);
    utterNext();
  }, [hasSupport, killUtterance, onEnd]);

  const speak = useCallback(
    (text: string, messageId: string) => {
      if (!hasSupport) return;
      const clean = stripMarkdownForSpeech(text);
      if (!clean) return;
      killUtterance();
      speakChunk(clean, messageId, rateRef.current);
    },
    [hasSupport, killUtterance, speakChunk],
  );

  const pause = useCallback(() => {
    if (isSpeaking && !isPaused) {
      speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [isSpeaking, isPaused]);

  const resume = useCallback(() => {
    if (isSpeaking && isPaused) {
      speechSynthesis.resume();
      setIsPaused(false);
    }
  }, [isSpeaking, isPaused]);

  const stop = useCallback(() => {
    killUtterance();
  }, [killUtterance]);

  const setRate = useCallback((r: TTSRate) => {
    rateRef.current = r;
    setRateState(r);
    // 如果正在朗读，更新当前 utterance 的 rate
    if (utteranceRef.current) {
      utteranceRef.current.rate = r;
    }
  }, []);

  // 确保 voices 加载完成
  useEffect(() => {
    if (hasSupport && speechSynthesis.getVoices().length === 0) {
      speechSynthesis.getVoices(); // 触发加载
    }
  }, [hasSupport]);

  return {
    speak,
    pause,
    resume,
    stop,
    setRate,
    speakingMessageId,
    isSpeaking,
    isPaused,
    rate,
    hasSupport,
  };
}

/** 按句子边界切分文本，each chunk ≤ maxLen */
function splitTextIntoChunks(text: string, maxLen: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }

    // 在 maxLen 内找最后一个句子边界
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
      // 没有合适的断句点，在空格处断
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

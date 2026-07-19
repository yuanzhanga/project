"use client";
import { useState, useRef, useCallback, useEffect } from "react";

interface UseVoiceInputOptions {
  onResult?: (text: string) => void;
  onStatusChange?: (isRecording: boolean) => void;
}

interface UseVoiceInputReturn {
  isRecording: boolean;
  isProcessing: boolean;
  hasSupport: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
  toggleRecording: () => void;
}

export function useVoiceInput(
  options: UseVoiceInputOptions = {},
): UseVoiceInputReturn {
  const { onResult, onStatusChange } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const finalTextRef = useRef("");
  const isRecordingRef = useRef(false);
  const canceledRef = useRef(false);
  const recognitionRef = useRef<any>(null);

  const hasSupport =
    typeof window !== "undefined" &&
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  const cleanupRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn("停止识别失败:", e);
      }
      recognitionRef.current = null;
    }
    (window as any).__voiceRecognition = null;
  }, []);

  // 结束录音的公共逻辑；canceled 为 true 时丢弃本次识别结果
  const finishRecording = useCallback(
    (canceled: boolean) => {
      if (!isRecordingRef.current) return;

      canceledRef.current = canceled;
      cleanupRecognition();
      setIsRecording(false);
      isRecordingRef.current = false;
      onStatusChange?.(false);

      if (canceled) {
        finalTextRef.current = "";
        onResult?.("");
      }
    },
    [cleanupRecognition, onStatusChange, onResult],
  );

  const stopRecording = useCallback(() => {
    finishRecording(false);
  }, [finishRecording]);

  const cancelRecording = useCallback(() => {
    finishRecording(true);
  }, [finishRecording]);

  const startRecording = useCallback(() => {
    if (!hasSupport) {
      alert("您的浏览器不支持语音识别功能");
      return;
    }
    if (isRecordingRef.current) return;

    finalTextRef.current = "";
    canceledRef.current = false;
    setIsProcessing(true);

    setTimeout(() => {
      try {
        const SpeechRecognition =
          (window as any).SpeechRecognition ||
          (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "zh-CN";
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          if (canceledRef.current) return;

          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (finalTranscript) {
            finalTextRef.current += finalTranscript;
          }

          const fullText = finalTextRef.current + interimTranscript;
          onResult?.(fullText);
        };

        recognition.onerror = (event: any) => {
          if (event.error !== "no-speech") {
            finishRecording(false);
          }
        };

        recognition.onend = () => {
          if (isRecordingRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {}
          }
        };

        recognitionRef.current = recognition;
        (window as any).__voiceRecognition = recognition;
        recognition.start();
        setIsRecording(true);
        isRecordingRef.current = true;
        setIsProcessing(false);
        onStatusChange?.(true);
      } catch (e) {
        console.error("启动失败:", e);
        setIsProcessing(false);
      }
    }, 300);
  }, [hasSupport, onResult, onStatusChange, finishRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecordingRef.current) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [startRecording, stopRecording]);

  useEffect(() => {
    return () => {
      cleanupRecognition();
    };
  }, [cleanupRecognition]);

  return {
    isRecording,
    isProcessing,
    hasSupport,
    startRecording,
    stopRecording,
    cancelRecording,
    toggleRecording,
  };
}

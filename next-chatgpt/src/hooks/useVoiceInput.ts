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
  toggleRecording: () => void;
  stopRecording: () => void;
}

export function useVoiceInput(
  options: UseVoiceInputOptions = {},
): UseVoiceInputReturn {
  const { onResult, onStatusChange } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const finalTextRef = useRef("");
  const isRecordingRef = useRef(false);
  const recognitionRef = useRef<any>(null);

  const hasSupport =
    "webkitSpeechRecognition" in window || "SpeechRecognition" in window;

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

  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;

    cleanupRecognition();
    setIsRecording(false);
    isRecordingRef.current = false;
    onStatusChange?.(false);
  }, [cleanupRecognition, onStatusChange]);

  const toggleRecording = useCallback(() => {
    if (!hasSupport) {
      alert("您的浏览器不支持语音识别功能");
      return;
    }

    if (isRecording) {
      stopRecording();
    } else {
      finalTextRef.current = "";
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
              stopRecording();
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
    }
  }, [hasSupport, isRecording, stopRecording, onResult, onStatusChange]);

  useEffect(() => {
    return () => {
      cleanupRecognition();
    };
  }, [cleanupRecognition]);

  return {
    isRecording,
    isProcessing,
    hasSupport,
    toggleRecording,
    stopRecording,
  };
}

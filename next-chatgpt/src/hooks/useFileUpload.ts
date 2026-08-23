"use client";
import { useState, useRef, useCallback, useEffect } from "react";

export interface UploadedFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  type: string;
}

interface UseFileUploadOptions {
  /** 允许的文件类型，默认只允许图片 */
  accept?: string;
  /** 最大文件数量，默认 5 */
  maxFiles?: number;
  /** 单个文件最大大小（字节），默认 10MB */
  maxSize?: number;
  /** 是否允许多选，默认 true */
  multiple?: boolean;
}

interface UseFileUploadReturn {
  files: UploadedFile[];
  addFiles: (fileList: FileList | File[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  openFilePicker: () => void;
  hasFiles: boolean;
}

export function useFileUpload(
  options: UseFileUploadOptions = {},
): UseFileUploadReturn {
  const {
    accept = "image/*",
    maxFiles = 5,
    maxSize = 10 * 1024 * 1024, // 10MB
    multiple = true,
  } = options;

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const filesRef = useRef<UploadedFile[]>([]);

  // 同步 files 到 ref，避免闭包问题
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  // 清理预览 URL
  useEffect(() => {
    const currentFiles = filesRef.current;
    return () => {
      currentFiles.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, []);

  const createPreviewFiles = useCallback(
    (fileList: FileList | File[]): UploadedFile[] => {
      const incoming = Array.from(fileList);
      const currentCount = filesRef.current.length;
      const available = maxFiles - currentCount;

      if (available <= 0) {
        alert(`最多只能上传 ${maxFiles} 个文件`);
        return [];
      }

      if (incoming.length > available) {
        alert(`还能添加 ${available} 个文件，已自动截取前 ${available} 个`);
      }

      const valid: UploadedFile[] = [];

      for (const file of incoming.slice(0, available)) {
        // 校验文件大小
        if (file.size > maxSize) {
          const sizeMB = (maxSize / 1024 / 1024).toFixed(0);
          alert(`文件 "${file.name}" 超过 ${sizeMB}MB 限制`);
          continue;
        }

        // 校验文件类型
        if (accept !== "*" && accept !== "*/*") {
          const acceptedTypes = accept.split(",").map((t) => t.trim());
          const isAccepted = acceptedTypes.some((pattern) => {
            if (pattern.endsWith("/*")) {
              const prefix = pattern.replace("/*", "");
              return file.type.startsWith(prefix + "/");
            }
            if (pattern.startsWith(".")) {
              return file.name.toLowerCase().endsWith(pattern.toLowerCase());
            }
            return file.type === pattern;
          });
          if (!isAccepted) {
            alert(`文件 "${file.name}" 类型不支持`);
            continue;
          }
        }

        valid.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          type: file.type,
        });
      }

      return valid;
    },
    [maxFiles, maxSize, accept],
  );

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const newFiles = createPreviewFiles(fileList);
      if (newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles]);
      }
    },
    [createPreviewFiles],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clearFiles = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      return [];
    });
  }, []);

  // 确保 input 存在
  const ensureInput = useCallback(() => {
    if (!inputRef.current) {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.multiple = multiple;
      input.style.display = "none";
      input.addEventListener("change", () => {
        if (input.files && input.files.length > 0) {
          addFiles(input.files);
          input.value = ""; // 重置以允许重复选择同一文件
        }
      });
      document.body.appendChild(input);
      inputRef.current = input;
    }
    return inputRef.current;
  }, [accept, multiple, addFiles]);

  const openFilePicker = useCallback(() => {
    const input = ensureInput();
    input.click();
  }, [ensureInput]);

  // 组件卸载时清理 input 元素
  useEffect(() => {
    return () => {
      if (inputRef.current) {
        inputRef.current.remove();
        inputRef.current = null;
      }
      // 清理所有预览 URL
      filesRef.current.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, []);

  return {
    files,
    addFiles,
    removeFile,
    clearFiles,
    openFilePicker,
    hasFiles: files.length > 0,
  };
}

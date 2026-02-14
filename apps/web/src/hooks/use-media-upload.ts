"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { put as putBlob } from "@vercel/blob/client";

export type ProcessMode = "lossy" | "lossless" | "original";

export interface UploadMediaResult {
  id: number;
  originalName: string;
  shortHash: string;
  imageId: string;
  url: string;
  originalSize: number;
  processedSize: number;
  isDuplicate: boolean;
  width: number | null;
  height: number | null;
}

export interface UploadFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "processing" | "success" | "error";
  originalSize: number;
  processedSize?: number;
  error?: string;
  previewUrl?: string;
  uploadProgress?: number;
  imageLoadError?: boolean;
  customName?: string;
  result?: UploadMediaResult;
}

interface UseMediaUploadOptions {
  mode: ProcessMode;
  storageId: string;
  folderId: number | null;
  multiple: boolean;
}

interface UseMediaUploadReturn {
  files: UploadFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadFile[]>>;
  uploading: boolean;
  handleFileSelect: (selectedFiles: FileList | null) => void;
  handlePaste: (e: ClipboardEvent) => void;
  uploadAll: () => Promise<{
    successCount: number;
    failCount: number;
    successfulResults: UploadMediaResult[];
  }>;
  uploadSingleFile: (
    uploadFile: UploadFile,
  ) => Promise<{ success: boolean; data?: UploadMediaResult }>;
  retryFile: (
    id: string,
  ) => Promise<{ success: boolean; data?: UploadMediaResult }>;
  removeFile: (id: string) => void;
  updateFileName: (id: string, newName: string) => void;
  getDisplayFileName: (uploadFile: UploadFile) => string;
  handleImageError: (id: string) => void;
  clearFiles: () => void;
}

interface UploadApiResponse<TData = UploadMediaResult> {
  success: boolean;
  data?: TData;
  message?: string;
}

interface UploadInitData {
  uploadStrategy: "client" | "server";
  providerType: string;
  storageProviderId?: string;
  tempKey?: string;
  uploadMethod?: string;
  uploadUrl?: string;
  uploadHeaders?: Record<string, string>;
  blobPathname?: string;
  blobClientToken?: string;
}

/**
 * 媒体上传 Hook
 * 提取完整的上传流程：文件状态管理、XHR 上传（含进度追踪）、并发队列、重试
 */
export function useMediaUpload(
  options: UseMediaUploadOptions,
): UseMediaUploadReturn {
  const { mode, storageId, folderId, multiple } = options;
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // 保存预览 URL 的引用，用于清理
  const previewUrlsRef = useRef<Set<string>>(new Set());

  // 组件卸载时清理所有预览 URL
  useEffect(() => {
    const urlsToClean = previewUrlsRef.current;
    return () => {
      urlsToClean.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      urlsToClean.clear();
    };
  }, []);

  // 处理文件选择
  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      // 单选模式只取第一个文件
      const filesToProcess = multiple
        ? Array.from(selectedFiles)
        : [selectedFiles[0]].filter((f): f is File => f !== undefined);

      const newFiles: UploadFile[] = filesToProcess.map((file) => {
        const previewUrl = URL.createObjectURL(file);
        previewUrlsRef.current.add(previewUrl);
        return {
          file,
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          status: "pending" as const,
          originalSize: file.size,
          previewUrl,
        };
      });

      // 多选模式追加，单选模式替换
      if (multiple) {
        setFiles((prev) => [...prev, ...newFiles]);
      } else {
        // 清理之前的预览 URL
        setFiles((prev) => {
          prev.forEach((f) => {
            if (f.previewUrl) {
              URL.revokeObjectURL(f.previewUrl);
              previewUrlsRef.current.delete(f.previewUrl);
            }
          });
          return newFiles;
        });
      }
    },
    [multiple],
  );

  // 处理粘贴事件
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (uploading) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            // 为粘贴的图片生成默认文件名
            const ext = file.type.split("/")[1] || "png";
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const namedFile = new File(
              [file],
              `粘贴的图片_${timestamp}.${ext}`,
              { type: file.type },
            );
            imageFiles.push(namedFile);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        const dataTransfer = new DataTransfer();
        // 单选模式只取第一个
        const filesToAdd = multiple ? imageFiles : imageFiles.slice(0, 1);
        filesToAdd.forEach((file) => dataTransfer.items.add(file));
        handleFileSelect(dataTransfer.files);
      }
    },
    [uploading, multiple, handleFileSelect],
  );

  // 上传单个文件
  const uploadSingleFile = useCallback(
    async (
      uploadFile: UploadFile,
    ): Promise<{ success: boolean; data?: UploadMediaResult }> => {
      // 标记为上传中
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: "uploading" as const,
                uploadProgress: 0,
                error: undefined,
              }
            : f,
        ),
      );

      try {
        // 如果有自定义文件名，创建新的 File 对象
        let fileToUpload = uploadFile.file;
        if (uploadFile.customName) {
          fileToUpload = new File([uploadFile.file], uploadFile.customName, {
            type: uploadFile.file.type,
            lastModified: uploadFile.file.lastModified,
          });
        }

        const uploadViaServer = async (): Promise<UploadApiResponse> => {
          const formData = new FormData();
          formData.append("file", fileToUpload);
          formData.append("mode", mode);

          if (storageId) {
            formData.append("storageProviderId", storageId);
          }

          if (folderId) {
            formData.append("folderId", String(folderId));
          }

          const xhr = new XMLHttpRequest();

          return new Promise<UploadApiResponse>((resolve, reject) => {
            xhr.upload.addEventListener("progress", (e) => {
              if (e.lengthComputable) {
                const progress = Math.round((e.loaded / e.total) * 100);
                setFiles((prev) =>
                  prev.map((f) =>
                    f.id === uploadFile.id
                      ? { ...f, uploadProgress: progress }
                      : f,
                  ),
                );
              }
            });

            xhr.upload.addEventListener("load", () => {
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadFile.id
                    ? {
                        ...f,
                        status: "processing" as const,
                        uploadProgress: 100,
                      }
                    : f,
                ),
              );
            });

            xhr.addEventListener("load", () => {
              try {
                const result = JSON.parse(
                  xhr.responseText,
                ) as UploadApiResponse;
                resolve(result);
              } catch {
                reject(new Error("解析响应失败"));
              }
            });

            xhr.addEventListener("error", () => reject(new Error("网络错误")));
            xhr.addEventListener("abort", () =>
              reject(new Error("上传已取消")),
            );

            xhr.open("POST", "/admin/media/upload");
            xhr.setRequestHeader("Accept", "application/json");
            xhr.withCredentials = true;
            xhr.send(formData);
          });
        };

        const initFormData = new FormData();
        initFormData.append("action", "init");
        initFormData.append("mode", mode);
        initFormData.append("fileName", fileToUpload.name);
        initFormData.append("fileSize", String(fileToUpload.size));
        initFormData.append(
          "contentType",
          fileToUpload.type || "application/octet-stream",
        );
        if (storageId) {
          initFormData.append("storageProviderId", storageId);
        }
        if (folderId) {
          initFormData.append("folderId", String(folderId));
        }

        const initResponse = await fetch("/admin/media/upload", {
          method: "POST",
          body: initFormData,
          credentials: "include",
        });
        const initResult =
          (await initResponse.json()) as UploadApiResponse<UploadInitData>;

        let result: UploadApiResponse;

        if (!initResult.success || !initResult.data) {
          throw new Error(initResult.message || "初始化上传失败");
        }

        const initData = initResult.data;

        if (initData.uploadStrategy === "server") {
          result = await uploadViaServer();
        } else {
          if (!initData.tempKey) {
            throw new Error("初始化返回缺少 tempKey");
          }

          if (initData.providerType === "AWS_S3") {
            const uploadUrl = initData.uploadUrl;
            if (!uploadUrl) {
              throw new Error("初始化返回缺少 uploadUrl");
            }
            const xhr = new XMLHttpRequest();
            await new Promise<void>((resolve, reject) => {
              xhr.upload.addEventListener("progress", (e) => {
                if (e.lengthComputable) {
                  const progress = Math.round((e.loaded / e.total) * 100);
                  setFiles((prev) =>
                    prev.map((f) =>
                      f.id === uploadFile.id
                        ? { ...f, uploadProgress: progress }
                        : f,
                    ),
                  );
                }
              });

              xhr.addEventListener("load", () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  resolve();
                } else {
                  reject(
                    new Error(
                      `直传临时文件失败: ${xhr.status} ${xhr.statusText}`,
                    ),
                  );
                }
              });
              xhr.addEventListener("error", () =>
                reject(new Error("直传临时文件网络错误")),
              );
              xhr.addEventListener("abort", () =>
                reject(new Error("直传临时文件已取消")),
              );

              xhr.open(initData.uploadMethod || "PUT", uploadUrl);
              for (const [headerName, headerValue] of Object.entries(
                initData.uploadHeaders || {},
              )) {
                xhr.setRequestHeader(headerName, headerValue);
              }
              xhr.send(fileToUpload);
            });
          } else if (initData.providerType === "VERCEL_BLOB") {
            if (!initData.blobPathname || !initData.blobClientToken) {
              throw new Error("初始化返回缺少 Blob 上传参数");
            }

            await putBlob(initData.blobPathname, fileToUpload, {
              access: "public",
              token: initData.blobClientToken,
              contentType: fileToUpload.type || undefined,
              multipart: true,
              onUploadProgress: ({ loaded, total }) => {
                if (total > 0) {
                  const progress = Math.round((loaded / total) * 100);
                  setFiles((prev) =>
                    prev.map((f) =>
                      f.id === uploadFile.id
                        ? { ...f, uploadProgress: progress }
                        : f,
                    ),
                  );
                }
              },
            });
          } else {
            throw new Error(`暂不支持的直传存储类型: ${initData.providerType}`);
          }

          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? {
                    ...f,
                    status: "processing" as const,
                    uploadProgress: 100,
                  }
                : f,
            ),
          );

          const completeFormData = new FormData();
          completeFormData.append("action", "complete");
          completeFormData.append("mode", mode);
          completeFormData.append("tempKey", initData.tempKey);
          completeFormData.append("originalName", fileToUpload.name);
          completeFormData.append(
            "originalMimeType",
            fileToUpload.type || "application/octet-stream",
          );
          const completeStorageProviderId =
            storageId || initData.storageProviderId;
          if (!completeStorageProviderId) {
            throw new Error("缺少存储提供商ID");
          }
          completeFormData.append(
            "storageProviderId",
            completeStorageProviderId,
          );
          if (folderId) {
            completeFormData.append("folderId", String(folderId));
          }

          const completeResponse = await fetch("/admin/media/upload", {
            method: "POST",
            body: completeFormData,
            credentials: "include",
          });
          result = (await completeResponse.json()) as UploadApiResponse;
        }

        if (result.success && result.data) {
          // 更新文件状态为成功
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? {
                    ...f,
                    status: "success" as const,
                    processedSize: result.data?.processedSize,
                    result: result.data,
                    uploadProgress: undefined,
                  }
                : f,
            ),
          );
          return { success: true, data: result.data };
        } else {
          // 更新文件状态为失败
          const errorMessage = result.message || "上传失败";
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? {
                    ...f,
                    status: "error" as const,
                    error: errorMessage,
                    uploadProgress: undefined,
                  }
                : f,
            ),
          );
          return { success: false };
        }
      } catch (error) {
        console.error(`上传文件失败: ${uploadFile.file.name}`, error);
        const errorMessage =
          error instanceof Error ? error.message : "上传失败，请稍后重试";
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: "error" as const,
                  error: errorMessage,
                  uploadProgress: undefined,
                }
              : f,
          ),
        );
        return { success: false };
      }
    },
    [mode, storageId, folderId],
  );

  // 批量上传所有待上传文件
  const uploadAll = useCallback(async () => {
    const filesToUpload = files.filter((f) => f.status === "pending");

    if (filesToUpload.length === 0) {
      return { successCount: 0, failCount: 0, successfulResults: [] };
    }

    setUploading(true);

    try {
      // 并发上传，最多同时3个
      const CONCURRENT_LIMIT = 3;
      let successCount = 0;
      let failCount = 0;
      const successfulResults: UploadMediaResult[] = [];

      // 创建文件队列（使用索引而非修改数组）
      let currentIndex = 0;
      const totalFiles = filesToUpload.length;

      // 上传单个文件并递归处理队列
      const uploadNext = async (): Promise<void> => {
        const index = currentIndex++;
        if (index >= totalFiles) {
          return;
        }

        const file = filesToUpload[index];
        if (!file) return;

        const result = await uploadSingleFile(file);

        if (result.success && result.data) {
          successCount++;
          successfulResults.push(result.data);
        } else {
          failCount++;
        }

        await uploadNext();
      };

      // 启动初始的并发上传任务
      const initialTasks = [];
      for (let i = 0; i < Math.min(CONCURRENT_LIMIT, totalFiles); i++) {
        initialTasks.push(uploadNext());
      }

      await Promise.all(initialTasks);

      return { successCount, failCount, successfulResults };
    } finally {
      setUploading(false);
    }
  }, [files, uploadSingleFile]);

  // 重试上传单个文件
  const retryFile = useCallback(
    async (id: string) => {
      const fileToRetry = files.find((f) => f.id === id);
      if (!fileToRetry) return { success: false };

      return uploadSingleFile(fileToRetry);
    },
    [files, uploadSingleFile],
  );

  // 移除文件
  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
        previewUrlsRef.current.delete(fileToRemove.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  // 更新自定义文件名
  const updateFileName = useCallback((id: string, newName: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, customName: newName } : f)),
    );
  }, []);

  // 获取显示的文件名
  const getDisplayFileName = useCallback((uploadFile: UploadFile): string => {
    return uploadFile.customName || uploadFile.file.name;
  }, []);

  // 处理图片加载错误
  const handleImageError = useCallback((id: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, imageLoadError: true } : f)),
    );
  }, []);

  // 清除所有文件
  const clearFiles = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => {
        if (f.previewUrl) {
          URL.revokeObjectURL(f.previewUrl);
          previewUrlsRef.current.delete(f.previewUrl);
        }
      });
      return [];
    });
  }, []);

  return {
    files,
    setFiles,
    uploading,
    handleFileSelect,
    handlePaste,
    uploadAll,
    uploadSingleFile,
    retryFile,
    removeFile,
    updateFileName,
    getDisplayFileName,
    handleImageError,
    clearFiles,
  };
}

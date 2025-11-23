"use client";

import { useState, useRef, useEffect } from "react";
import { GridItem } from "@/components/RowGrid";
import { Dialog } from "@/ui/Dialog";
import { Button } from "@/ui/Button";
import { Select } from "@/ui/Select";
import { useToast, ToastProvider } from "@/ui/Toast";
import { useBroadcastSender } from "@/hooks/useBroadcast";
import { getStorageList } from "@/actions/storage";
import {
  RiImageAddFill,
  RiUploadLine,
  RiCheckFill,
  RiCloseFill,
  RiFileDamageFill,
  RiRestartLine,
} from "@remixicon/react";
import { AutoResizer } from "@/ui/AutoResizer";
import { AutoTransition } from "@/ui/AutoTransition";
import Image from "next/image";

type ProcessMode = "lossy" | "lossless" | "original";

interface StorageProvider {
  id: string;
  name: string;
  displayName: string;
  type: string;
  isDefault: boolean;
}

interface UserInfo {
  uid: number;
  username: string;
  nickname?: string;
  role: string;
  exp: string;
  lastRefresh: string;
}

interface UploadMediaResult {
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

interface UploadFile {
  file: File;
  id: string;
  status: "pending" | "uploading" | "processing" | "success" | "error";
  originalSize: number;
  processedSize?: number;
  result?: UploadMediaResult;
  error?: string;
  previewUrl?: string;
  uploadProgress?: number; // 0-100
  imageLoadError?: boolean; // 图片预览加载失败
}

// 圆形进度条组件
const CircularProgress = ({ progress }: { progress: number }) => {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width="24" height="24" className="transform -rotate-90">
      {/* 背景圆 */}
      <circle
        cx="12"
        cy="12"
        r={radius}
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        className="text-border"
      />
      {/* 进度圆 */}
      <circle
        cx="12"
        cy="12"
        r={radius}
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-primary transition-all duration-300"
        strokeLinecap="round"
      />
    </svg>
  );
};

function MediaAddInner() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<ProcessMode>("lossy");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [storageProviders, setStorageProviders] = useState<StorageProvider[]>(
    [],
  );
  const [selectedStorageId, setSelectedStorageId] = useState<string>("");
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success: toastSuccess, error: toastError } = useToast();
  const { broadcast } = useBroadcastSender<{ type: "media-refresh" }>();

  // 从 localStorage 获取用户角色
  useEffect(() => {
    try {
      const userInfoStr = localStorage.getItem("user_info");
      if (userInfoStr) {
        const userInfo: UserInfo = JSON.parse(userInfoStr);
        setUserRole(userInfo.role);
      }
    } catch (error) {
      console.error("Failed to parse user info:", error);
    }
  }, []);

  // 使用 Server Action 加载存储提供商列表（仅 ADMIN/EDITOR）
  useEffect(() => {
    if (userRole && userRole !== "AUTHOR") {
      setLoadingProviders(true);

      getStorageList({
        access_token: "", // Server Action 会从 cookie 自动获取
        page: 1,
        pageSize: 100,
        sortBy: "createdAt",
        sortOrder: "desc",
        isActive: true,
      })
        .then((response) => {
          if (response.success && response.data) {
            setStorageProviders(response.data);
            // 自动选择默认存储提供商
            const defaultStorage = response.data.find(
              (s: StorageProvider) => s.isDefault,
            );
            if (defaultStorage) {
              setSelectedStorageId(defaultStorage.id);
            } else if (response.data.length > 0 && response.data[0]) {
              setSelectedStorageId(response.data[0].id);
            }
          }
        })
        .catch((err) =>
          console.error("Failed to fetch storage providers:", err),
        )
        .finally(() => setLoadingProviders(false));
    }
  }, [userRole]);

  const openDialog = () => {
    setFiles([]);
    setMode("lossy");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (uploading) return;
    setDialogOpen(false);
    setFiles([]);
  };

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: UploadFile[] = Array.from(selectedFiles).map((file) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      status: "pending" as const,
      originalSize: file.size,
      previewUrl: URL.createObjectURL(file),
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

  // 组件卸载时清理所有预览 URL
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const calculateCompressionRatio = (
    original: number,
    processed: number,
  ): string => {
    const ratio = ((original - processed) / original) * 100;
    return ratio > 0
      ? `-${ratio.toFixed(1)}%`
      : `+${Math.abs(ratio).toFixed(1)}%`;
  };

  // 上传单个文件的函数
  const uploadSingleFile = async (uploadFile: UploadFile) => {
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
      const formData = new FormData();
      formData.append("file", uploadFile.file);
      formData.append("mode", mode);

      // 如果选择了存储提供商，添加到 FormData
      if (selectedStorageId) {
        formData.append("storageProviderId", selectedStorageId);
      }

      // 使用 XMLHttpRequest 以支持进度追踪
      const xhr = new XMLHttpRequest();

      // 创建 Promise 包装 XHR
      const uploadPromise = new Promise<{
        success: boolean;
        data?: UploadMediaResult;
        message?: string;
      }>((resolve, reject) => {
        // 上传进度
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id ? { ...f, uploadProgress: progress } : f,
              ),
            );
          }
        });

        // 上传完成（服务器处理中）
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

        // 请求完成
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              resolve(result);
            } catch {
              reject(new Error("解析响应失败"));
            }
          } else {
            try {
              const result = JSON.parse(xhr.responseText);
              resolve(result);
            } catch {
              reject(new Error(`上传失败: ${xhr.statusText}`));
            }
          }
        });

        // 请求错误
        xhr.addEventListener("error", () => {
          reject(new Error("网络错误"));
        });

        // 请求中止
        xhr.addEventListener("abort", () => {
          reject(new Error("上传已取消"));
        });

        // 发送请求
        xhr.open("POST", "/admin/media/upload");
        xhr.setRequestHeader("Accept", "application/json");
        // 不设置 Content-Type，让浏览器自动设置 multipart/form-data 边界
        xhr.withCredentials = true; // 携带 cookie
        xhr.send(formData);
      });

      const result = await uploadPromise;

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
        return { success: true };
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
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id
            ? {
                ...f,
                status: "error" as const,
                error: "上传失败，请稍后重试",
                uploadProgress: undefined,
              }
            : f,
        ),
      );
      return { success: false };
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toastError("请先选择文件");
      return;
    }

    // 只上传待上传的文件（不包括失败的文件，失败的文件需要通过重试按钮单独上传）
    const filesToUpload = files.filter((f) => f.status === "pending");

    if (filesToUpload.length === 0) {
      toastError("没有需要上传的文件");
      return;
    }

    setUploading(true);

    try {
      // 并发上传，最多同时3个
      const CONCURRENT_LIMIT = 3;
      let successCount = 0;
      let failCount = 0;

      // 分批并发上传
      for (let i = 0; i < filesToUpload.length; i += CONCURRENT_LIMIT) {
        const batch = filesToUpload.slice(i, i + CONCURRENT_LIMIT);
        const results = await Promise.allSettled(
          batch.map((file) => uploadSingleFile(file)),
        );

        // 统计结果
        results.forEach((result) => {
          if (result.status === "fulfilled" && result.value.success) {
            successCount++;
          } else {
            failCount++;
          }
        });
      }

      // 显示上传结果
      if (successCount > 0 && failCount === 0) {
        toastSuccess("上传成功", `成功上传 ${successCount} 个文件`);
        await broadcast({ type: "media-refresh" });
      } else if (successCount > 0 && failCount > 0) {
        toastSuccess(
          "部分成功",
          `成功 ${successCount} 个，失败 ${failCount} 个`,
        );
        await broadcast({ type: "media-refresh" });
      } else {
        toastError("上传失败", "所有文件都上传失败");
      }
    } catch (error) {
      console.error("上传文件失败:", error);
      toastError("上传失败", "请稍后重试");
    } finally {
      setUploading(false);
    }
  };

  // 重试上传单个文件
  const retryFile = async (id: string) => {
    const fileToRetry = files.find((f) => f.id === id);
    if (!fileToRetry) return;

    try {
      const result = await uploadSingleFile(fileToRetry);
      if (result.success) {
        toastSuccess("上传成功");
        await broadcast({ type: "media-refresh" });
      } else {
        toastError("上传失败", "请检查错误信息后重试");
      }
    } catch (error) {
      console.error("重试上传失败:", error);
      toastError("上传失败", "请稍后重试");
    }
  };

  // 处理图片加载错误
  const handleImageError = (id: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, imageLoadError: true } : f)),
    );
  };

  return (
    <>
      <GridItem areas={[7, 8]} width={6} height={0.2}>
        <button
          type="button"
          onClick={openDialog}
          className="h-full w-full flex gap-2 items-center justify-center text-2xl hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
        >
          <RiImageAddFill size="1.1em" /> 上传图片
        </button>
      </GridItem>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title="上传图片"
        size="lg"
      >
        <div className="px-6 py-6 space-y-6">
          {/* 存储提供商选择（仅 ADMIN/EDITOR 可见） */}
          {userRole && userRole !== "AUTHOR" && (
            <div className="space-y-2 flex flex-col gap-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                上传位置
              </label>

              {loadingProviders ? (
                <div className="text-sm text-muted-foreground">加载中...</div>
              ) : (
                <Select
                  value={selectedStorageId}
                  onChange={(value) => setSelectedStorageId(String(value))}
                  options={storageProviders.map((provider) => ({
                    value: provider.id,
                    label: `${provider.displayName}${provider.isDefault ? " (默认)" : ""}`,
                  }))}
                  size="sm"
                  disabled={uploading}
                  placeholder="选择存储提供商"
                />
              )}
            </div>
          )}

          {/* 处理模式选择 */}
          <div className="space-y-4">
            <label className="text-sm font-medium text-muted-foreground">
              处理模式
            </label>
            <div className="grid grid-cols-3 gap-4">
              <button
                type="button"
                onClick={() => setMode("lossy")}
                disabled={uploading}
                className={`p-4 border rounded-lg transition-all ${
                  mode === "lossy"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="font-semibold mb-1">有损优化</div>
                <div className="text-xs text-muted-foreground">
                  AVIF 格式，高压缩率
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode("lossless")}
                disabled={uploading}
                className={`p-4 border rounded-lg transition-all ${
                  mode === "lossless"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="font-semibold mb-1">无损转换</div>
                <div className="text-xs text-muted-foreground">
                  WebP 无损，保留元数据
                </div>
              </button>
              <button
                type="button"
                onClick={() => setMode("original")}
                disabled={uploading}
                className={`p-4 border rounded-lg transition-all ${
                  mode === "original"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="font-semibold mb-1">保留原片</div>
                <div className="text-xs text-muted-foreground">
                  支持所有图片格式
                </div>
              </button>
            </div>
          </div>

          {/* 文件选择区域 */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
          >
            <RiUploadLine
              className="mx-auto mb-4 text-muted-foreground"
              size="4em"
            />
            <div className="text-lg font-medium mb-2">
              拖拽文件到此处或点击选择
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              <AutoTransition>
                {mode === "original"
                  ? "支持所有图片格式（原样上传）"
                  : "支持 JPG、PNG、GIF、WebP、AVIF、TIFF 格式"}
              </AutoTransition>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              aria-label="选择图片文件"
            />
            <Button
              label="选择文件"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            />
          </div>

          {/* 文件列表 */}
          <AutoResizer>
            {files.length > 0 && (
              <div className="space-y-0">
                <div className="text-sm font-medium text-muted-foreground pb-3 border-b border-border">
                  文件列表 ({files.length})
                </div>
                <div className="divide-y divide-border">
                  {files.map((uploadFile) => (
                    <div
                      key={uploadFile.id}
                      className="flex items-center gap-3 py-3 px-5"
                    >
                      {/* 预览图 */}
                      <div className="flex-shrink-0">
                        <div className="w-14 h-14 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                          {uploadFile.previewUrl &&
                          !uploadFile.imageLoadError ? (
                            <Image
                              unoptimized
                              src={uploadFile.previewUrl}
                              alt={uploadFile.file.name}
                              className="w-full h-full object-cover"
                              width={56}
                              height={56}
                              onError={() => handleImageError(uploadFile.id)}
                            />
                          ) : (
                            <RiFileDamageFill
                              className="text-muted-foreground"
                              size={24}
                            />
                          )}
                        </div>
                      </div>

                      {/* 文件信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate mb-1">
                          {uploadFile.file.name}
                        </div>

                        {uploadFile.error ? (
                          <div className="text-xs text-error mt-1">
                            {uploadFile.error}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            {formatBytes(uploadFile.originalSize)}
                            {uploadFile.processedSize !== undefined && (
                              <>
                                {" → "}
                                {formatBytes(uploadFile.processedSize)}
                                <span
                                  className={
                                    uploadFile.processedSize <
                                    uploadFile.originalSize
                                      ? "text-success ml-1"
                                      : "text-orange-500 ml-1"
                                  }
                                >
                                  {calculateCompressionRatio(
                                    uploadFile.originalSize,
                                    uploadFile.processedSize,
                                  )}
                                </span>
                              </>
                            )}
                            {uploadFile.result?.isDuplicate && (
                              <span className="text-orange-500">
                                （重复项目）
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* 进度条/状态 */}
                      <div className="flex-shrink-0 w-20">
                        <AutoTransition type="scale">
                          {uploadFile.status === "pending" && (
                            <div className="h-6 w-6" />
                          )}
                          {uploadFile.status === "uploading" && (
                            <div className="flex flex-col items-center gap-1">
                              <CircularProgress
                                progress={uploadFile.uploadProgress || 0}
                              />
                            </div>
                          )}
                          {uploadFile.status === "processing" && (
                            <div className="flex flex-col items-center gap-1">
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                            </div>
                          )}
                          {uploadFile.status === "success" && (
                            <div className="flex flex-col items-center gap-1">
                              <RiCheckFill
                                className="text-success"
                                size="1.75em"
                              />
                            </div>
                          )}
                          {uploadFile.status === "error" && (
                            <div className="flex flex-col items-center gap-1">
                              <RiCloseFill
                                className="text-error"
                                size="1.75em"
                              />
                            </div>
                          )}
                        </AutoTransition>
                      </div>

                      {/* 删除/重试按钮 */}
                      {uploadFile.status === "error" ? (
                        <button
                          type="button"
                          onClick={() => retryFile(uploadFile.id)}
                          className="flex-shrink-0 p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-muted-foreground disabled:hover:bg-transparent"
                          aria-label={`重试 ${uploadFile.file.name}`}
                          title="重试上传"
                          disabled={uploading}
                        >
                          <RiRestartLine size="1.5em" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeFile(uploadFile.id)}
                          className="flex-shrink-0 p-2 text-muted-foreground hover:text-error hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-muted-foreground disabled:hover:bg-transparent"
                          aria-label={`删除 ${uploadFile.file.name}`}
                          title="删除此文件"
                          disabled={
                            uploading ||
                            uploadFile.status === "success" ||
                            uploadFile.status === "uploading" ||
                            uploadFile.status === "processing"
                          }
                        >
                          <RiCloseFill size="1.5em" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </AutoResizer>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-4 pt-4 border-t border-foreground/10">
            <Button
              label="取消"
              variant="ghost"
              onClick={closeDialog}
              size="sm"
              disabled={uploading}
            />
            <Button
              label="开始上传"
              variant="primary"
              onClick={handleUpload}
              size="sm"
              loading={uploading}
              loadingText="上传中..."
              disabled={files.length === 0}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}

export default function MediaAdd() {
  return (
    <ToastProvider>
      <MediaAddInner />
    </ToastProvider>
  );
}

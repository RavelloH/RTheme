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
  RiUploadCloudFill,
  RiCheckFill,
  RiCloseFill,
} from "@remixicon/react";

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
  status: "pending" | "uploading" | "success" | "error";
  originalSize: number;
  processedSize?: number;
  result?: UploadMediaResult;
  error?: string;
}

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
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  };

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
    setFiles((prev) => prev.filter((f) => f.id !== id));
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

  const handleUpload = async () => {
    if (files.length === 0) {
      toastError("请先选择文件");
      return;
    }

    setUploading(true);

    try {
      // 标记为上传中
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: "uploading" as const })),
      );

      // 构建 FormData
      const formData = new FormData();
      formData.append("mode", mode);
      // 如果选择了存储提供商，添加到 FormData
      if (selectedStorageId) {
        formData.append("storageProviderId", selectedStorageId);
      }
      files.forEach((uploadFile) => {
        formData.append("files", uploadFile.file);
      });

      // 调用上传 API 端点
      const response = await fetch("/admin/media/upload", {
        method: "POST",
        body: formData,
        credentials: "include", // 携带 cookie
      });

      const result = await response.json();

      if (result.success && result.data) {
        // 更新文件状态
        setFiles((prev) =>
          prev.map((f) => {
            const uploadResult = result.data.find(
              (r: UploadMediaResult) => r.originalName === f.file.name,
            );
            if (uploadResult) {
              return {
                ...f,
                status: "success" as const,
                processedSize: uploadResult.processedSize,
                result: uploadResult,
              };
            }
            return {
              ...f,
              status: "error" as const,
              error: "上传失败",
            };
          }),
        );

        toastSuccess("上传成功", `成功上传 ${result.data.length} 个文件`);
        await broadcast({ type: "media-refresh" });
      } else {
        const message = result.message || "上传失败";
        toastError(message);
        setFiles((prev) =>
          prev.map((f) => ({ ...f, status: "error" as const, error: message })),
        );
      }
    } catch (error) {
      console.error("上传文件失败:", error);
      toastError("上传失败", "请稍后重试");
      setFiles((prev) =>
        prev.map((f) => ({
          ...f,
          status: "error" as const,
          error: "上传失败",
        })),
      );
    } finally {
      setUploading(false);
    }
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                存储提供商
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
                  不做处理，原样上传
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
            <RiUploadCloudFill
              className="mx-auto mb-4 text-muted-foreground"
              size={48}
            />
            <div className="text-lg font-medium mb-2">
              拖拽文件到此处或点击选择
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              支持 JPG、PNG、GIF、WebP、AVIF、HEIC、TIFF 格式
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
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                文件列表 ({files.length})
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {files.map((uploadFile) => (
                  <div
                    key={uploadFile.id}
                    className="flex items-center gap-3 p-3 border border-border rounded-lg"
                  >
                    {/* 状态图标 */}
                    <div className="flex-shrink-0">
                      {uploadFile.status === "success" && (
                        <RiCheckFill className="text-green-500" size={20} />
                      )}
                      {uploadFile.status === "error" && (
                        <RiCloseFill className="text-red-500" size={20} />
                      )}
                      {uploadFile.status === "uploading" && (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                      )}
                      {uploadFile.status === "pending" && (
                        <div className="h-5 w-5 rounded-full border-2 border-border" />
                      )}
                    </div>

                    {/* 文件信息 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {uploadFile.file.name}
                      </div>
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
                                  ? "text-green-500 ml-1"
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
                          <span className="text-orange-500 ml-2">（去重）</span>
                        )}
                      </div>
                      {uploadFile.error && (
                        <div className="text-xs text-red-500">
                          {uploadFile.error}
                        </div>
                      )}
                    </div>

                    {/* 删除按钮 */}
                    {!uploading && uploadFile.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => removeFile(uploadFile.id)}
                        className="flex-shrink-0 text-muted-foreground hover:text-red-500 transition-colors"
                        aria-label={`删除 ${uploadFile.file.name}`}
                        title="删除此文件"
                      >
                        <RiCloseFill size={20} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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

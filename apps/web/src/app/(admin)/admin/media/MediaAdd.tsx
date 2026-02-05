"use client";

import { useCallback, useEffect, useState } from "react";
import { RiFolderLine, RiImageAddFill, RiUploadLine } from "@remixicon/react";
import { useRouter, useSearchParams } from "next/navigation";

import FolderPickerDialog from "@/app/(admin)/admin/media/FolderPickerDialog";
import { GridItem } from "@/components/client/layout/RowGrid";
import { FileListItem } from "@/components/ui/FileListItem";
import { useBroadcastSender } from "@/hooks/use-broadcast";
import { type ProcessMode, useMediaUpload } from "@/hooks/use-media-upload";
import { useStorageProviders } from "@/hooks/use-storage-providers";
import { useUserInfo } from "@/hooks/use-user-info";
import { getAccessibleFolders } from "@/lib/client/folder-utils";
import { AutoResizer } from "@/ui/AutoResizer";
import { AutoTransition } from "@/ui/AutoTransition";
import { Button } from "@/ui/Button";
import Clickable from "@/ui/Clickable";
import { Dialog } from "@/ui/Dialog";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { Select } from "@/ui/Select";
import { useToast } from "@/ui/Toast";

function MediaAddInner() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<ProcessMode>("lossy");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [selectedFolderName, setSelectedFolderName] =
    useState<string>("公共空间");
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);

  const userInfo = useUserInfo();
  const userRole = userInfo?.role || "";
  const userUid = userInfo?.uid || 0;

  const { success: toastSuccess, error: toastError } = useToast();
  const { broadcast } = useBroadcastSender<{ type: "media-refresh" }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  // 存储提供商
  const {
    providers: storageProviders,
    selectedId: selectedStorageId,
    setSelectedId: setSelectedStorageId,
    loading: loadingProviders,
  } = useStorageProviders({
    enabled: Boolean(userRole && userRole !== "AUTHOR"),
    filterVirtual: false,
  });

  // 上传 Hook
  const {
    files,
    uploading,
    handleFileSelect,
    handlePaste,
    uploadAll,
    retryFile,
    removeFile,
    updateFileName,
    getDisplayFileName,
    handleImageError,
    clearFiles,
  } = useMediaUpload({
    mode,
    storageId: selectedStorageId,
    folderId: selectedFolderId,
    multiple: true,
  });

  // 检测 action=upload 参数，自动打开上传对话框
  useEffect(() => {
    if (searchParams.get("action") === "upload") {
      setDialogOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("action");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, router]);

  // 加载默认文件夹（公共空间）
  useEffect(() => {
    if (userRole && userUid > 0) {
      getAccessibleFolders(userRole, userUid, "", null)
        .then(({ publicRootId }) => {
          if (publicRootId !== null) {
            setSelectedFolderId(publicRootId);
            setSelectedFolderName("公共空间");
          }
        })
        .catch((err) => console.error("Failed to fetch folders:", err));
    }
  }, [userRole, userUid]);

  // 监听粘贴事件
  useEffect(() => {
    if (dialogOpen) {
      document.addEventListener("paste", handlePaste);
      return () => document.removeEventListener("paste", handlePaste);
    }
  }, [dialogOpen, handlePaste]);

  // 处理文件夹选择
  const handleFolderSelect = useCallback(
    (folderId: number | null, folderName: string) => {
      setSelectedFolderId(folderId);
      setSelectedFolderName(folderName);
    },
    [],
  );

  const openDialog = () => {
    clearFiles();
    setMode("lossy");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (uploading) return;
    clearFiles();
    setDialogOpen(false);
  };

  // 拖拽处理
  const [dragActive, setDragActive] = useState(false);

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

  const handleUpload = async () => {
    if (files.length === 0) {
      toastError("请先选择文件");
      return;
    }

    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) {
      toastError("没有需要上传的文件");
      return;
    }

    const { successCount, failCount } = await uploadAll();

    if (successCount > 0 && failCount === 0) {
      toastSuccess("上传成功", `成功上传 ${successCount} 个文件`);
      await broadcast({ type: "media-refresh" });
    } else if (successCount > 0 && failCount > 0) {
      toastSuccess("部分成功", `成功 ${successCount} 个，失败 ${failCount} 个`);
      await broadcast({ type: "media-refresh" });
    } else {
      toastError("上传失败", "所有文件都上传失败");
    }
  };

  const handleRetryFile = async (id: string) => {
    const result = await retryFile(id);
    if (result.success) {
      toastSuccess("上传成功");
      await broadcast({ type: "media-refresh" });
    } else {
      toastError("上传失败", "请检查错误信息后重试");
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
          {/* 处理模式选择 */}
          <div className="space-y-4">
            <SegmentedControl
              value={mode}
              onChange={setMode}
              disabled={uploading}
              options={[
                {
                  value: "lossy",
                  label: "有损优化",
                  description: "压缩为 AVIF 格式，节省占用",
                },
                {
                  value: "lossless",
                  label: "无损转换",
                  description: "无损转换为 WebP ",
                },
                {
                  value: "original",
                  label: "保留原片",
                  description: "以原始格式上传，不做处理",
                },
              ]}
              columns={3}
            />
          </div>

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

          {/* 文件夹选择 */}
          <div className="space-y-2 flex flex-col gap-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              目标文件夹
            </label>

            <Clickable
              onClick={() => !uploading && setFolderPickerOpen(true)}
              hoverScale={1}
              className={`flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm transition-colors ${
                uploading
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-muted/50"
              }`}
            >
              <RiFolderLine className="text-muted-foreground" />
              <span className="flex-1 text-left">{selectedFolderName}</span>
            </Clickable>
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
              拖拽、粘贴文件到此处，或点击选择
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              <AutoTransition>
                {mode === "original"
                  ? "支持所有图片格式（原样上传）"
                  : "支持 JPG、PNG、GIF、WebP、AVIF、TIFF 格式"}
              </AutoTransition>
            </div>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => {
                if (e.target.files) {
                  handleFileSelect(e.target.files);
                }
              }}
              className="hidden"
              id="media-add-file-input"
              aria-label="选择图片文件"
            />
            <Button
              label="选择文件"
              variant="secondary"
              size="sm"
              onClick={() =>
                document.getElementById("media-add-file-input")?.click()
              }
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
                    <FileListItem
                      key={uploadFile.id}
                      id={uploadFile.id}
                      displayName={getDisplayFileName(uploadFile)}
                      status={uploadFile.status}
                      error={uploadFile.error}
                      previewSrc={uploadFile.previewUrl}
                      imageLoadError={uploadFile.imageLoadError}
                      onImageError={() => handleImageError(uploadFile.id)}
                      originalSize={uploadFile.originalSize}
                      processedSize={uploadFile.processedSize}
                      isDuplicate={uploadFile.result?.isDuplicate}
                      uploadProgress={uploadFile.uploadProgress}
                      editable={uploadFile.status === "pending"}
                      onNameChange={(newName) =>
                        updateFileName(uploadFile.id, newName)
                      }
                      originalName={uploadFile.file.name}
                      onRemove={() => removeFile(uploadFile.id)}
                      onRetry={() => handleRetryFile(uploadFile.id)}
                      operationDisabled={uploading}
                    />
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
              disabled={files.length === 0}
            />
          </div>
        </div>
      </Dialog>

      {/* 文件夹选择对话框 */}
      <FolderPickerDialog
        open={folderPickerOpen}
        onClose={() => setFolderPickerOpen(false)}
        onSelect={handleFolderSelect}
        userRole={userRole}
        userUid={userUid}
        title="选择目标文件夹"
      />
    </>
  );
}

export default function MediaAdd() {
  return <MediaAddInner />;
}

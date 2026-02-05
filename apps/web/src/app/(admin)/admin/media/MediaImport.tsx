"use client";

import { useCallback, useEffect, useState } from "react";
import { RiFolderLine, RiLinksFill } from "@remixicon/react";
import { useRouter, useSearchParams } from "next/navigation";

import FolderPickerDialog from "@/app/(admin)/admin/media/FolderPickerDialog";
import { GridItem } from "@/components/client/layout/RowGrid";
import { FileListItem } from "@/components/ui/FileListItem";
import { useBroadcastSender } from "@/hooks/use-broadcast";
import { useMediaImport } from "@/hooks/use-media-import";
import { type ProcessMode } from "@/hooks/use-media-upload";
import { useStorageProviders } from "@/hooks/use-storage-providers";
import { useUserInfo } from "@/hooks/use-user-info";
import { getAccessibleFolders } from "@/lib/client/folder-utils";
import { formatBytes } from "@/lib/shared/format";
import { AutoResizer } from "@/ui/AutoResizer";
import { AutoTransition } from "@/ui/AutoTransition";
import { Button } from "@/ui/Button";
import Clickable from "@/ui/Clickable";
import { Dialog } from "@/ui/Dialog";
import { Input } from "@/ui/Input";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { Select } from "@/ui/Select";
import { useToast } from "@/ui/Toast";

type ImportMode = "record" | "transfer";

function MediaImportInner() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("record");
  const [processMode, setProcessMode] = useState<ProcessMode>("lossy");
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

  // 存储提供商（仅在转存模式且为 ADMIN/EDITOR 时启用）
  const {
    providers: storageProviders,
    selectedId: selectedStorageId,
    setSelectedId: setSelectedStorageId,
    loading: loadingProviders,
  } = useStorageProviders({
    enabled:
      importMode === "transfer" && Boolean(userRole && userRole !== "AUTHOR"),
    filterVirtual: true, // 过滤 external-url
  });

  // 导入 Hook
  const {
    items,
    importing,
    urlInput,
    setUrlInput,
    handleInputKeyDown,
    handleInputPaste,
    importAll,
    retryItem,
    removeItem,
    updateItemFileName,
    getDisplayFileName,
    handleImageError,
    clearItems,
  } = useMediaImport({
    importMode,
    processMode,
    storageId: selectedStorageId,
    folderId: selectedFolderId,
  });

  // 检测 action=import 参数，自动打开导入对话框
  useEffect(() => {
    if (searchParams.get("action") === "import") {
      setDialogOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("action");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, router]);

  // 加载初始文件夹信息（获取公共空间根目录 ID）
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

  // 处理文件夹选择
  const handleFolderSelect = useCallback(
    (folderId: number | null, folderName: string) => {
      setSelectedFolderId(folderId);
      setSelectedFolderName(folderName);
    },
    [],
  );

  const openDialog = () => {
    clearItems();
    setImportMode("record");
    setProcessMode("lossy");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (importing) return;
    clearItems();
    setDialogOpen(false);
  };

  const handleImport = async () => {
    if (items.length === 0) {
      toastError("请先添加要导入的图片 URL");
      return;
    }

    const pendingItems = items.filter((item) => item.status === "pending");
    if (pendingItems.length === 0) {
      toastError("没有需要导入的项目");
      return;
    }

    const { successCount, failCount } = await importAll();

    if (successCount > 0 && failCount === 0) {
      toastSuccess("导入成功", `成功导入 ${successCount} 个图片`);
      await broadcast({ type: "media-refresh" });
    } else if (successCount > 0 && failCount > 0) {
      toastSuccess("部分成功", `成功 ${successCount} 个，失败 ${failCount} 个`);
      await broadcast({ type: "media-refresh" });
    } else {
      toastError("导入失败", "所有图片都导入失败");
    }
  };

  const handleRetryItem = async (id: string) => {
    const result = await retryItem(id);
    if (result.success) {
      toastSuccess("导入成功");
      await broadcast({ type: "media-refresh" });
    } else {
      toastError("导入失败", "请检查错误信息后重试");
    }
  };

  return (
    <>
      <GridItem areas={[5, 6]} width={6} height={0.2}>
        <button
          type="button"
          onClick={openDialog}
          className="h-full w-full flex gap-2 items-center justify-center text-2xl hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
        >
          <RiLinksFill size="1.1em" /> 导入图片
        </button>
      </GridItem>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title="导入外部图片"
        size="lg"
      >
        <div className="px-6 py-6 space-y-6">
          {/* 导入模式选择 */}
          <div className="space-y-4">
            <SegmentedControl
              value={importMode}
              onChange={setImportMode}
              disabled={importing}
              options={[
                {
                  value: "record",
                  label: "外链优化",
                  description: "仅优化图片，不上传到存储",
                },
                {
                  value: "transfer",
                  label: "转存托管",
                  description: "下载并上传到存储，可选择压缩",
                },
              ]}
              columns={2}
            />
          </div>

          <AutoResizer>
            <AutoTransition>
              {/* 转存模式的额外选项 */}
              {importMode === "transfer" ? (
                <div key="transfer-options">
                  {/* 处理模式选择 */}
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      将图片直接下载并上传到存储服务，完全由站点托管。
                    </p>
                    <SegmentedControl
                      value={processMode}
                      onChange={setProcessMode}
                      disabled={importing}
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
                    <div className="space-y-2 flex flex-col gap-y-2 pt-4 pb-8">
                      <label className="text-sm font-medium text-muted-foreground">
                        上传位置
                      </label>

                      {loadingProviders ? (
                        <div className="text-sm text-muted-foreground">
                          加载中...
                        </div>
                      ) : (
                        <Select
                          value={selectedStorageId}
                          onChange={(value) =>
                            setSelectedStorageId(String(value))
                          }
                          options={storageProviders.map((provider) => ({
                            value: provider.id,
                            label: `${provider.displayName}${provider.isDefault ? " (默认)" : ""}`,
                          }))}
                          size="sm"
                          disabled={importing}
                          placeholder="选择存储提供商"
                        />
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p
                  className="text-sm text-muted-foreground"
                  key="record-mode-info"
                >
                  将图片的元信息，例如文件大小、图片尺寸、模糊占位符等解析后保存到数据库，并为其启用站点的图片优化。
                  其性能与常规上传的图片相同，并可在全站所有功能中使用。图片仍然托管在原始的外部
                  URL 上，不会上传到存储服务。
                </p>
              )}
            </AutoTransition>
          </AutoResizer>

          {/* 文件夹选择 */}
          <div className="space-y-2 flex flex-col gap-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              目标文件夹
            </label>

            <Clickable
              onClick={() => !importing && setFolderPickerOpen(true)}
              hoverScale={1}
              className={`flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm transition-colors ${
                importing
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-muted/50"
              }`}
            >
              <RiFolderLine className="text-muted-foreground" />
              <span className="flex-1 text-left">{selectedFolderName}</span>
            </Clickable>
          </div>

          {/* URL 输入区域 */}
          <div className="space-y-2">
            <Input
              label="图片 URL"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onPaste={handleInputPaste}
              helperText={"粘贴图片 URL，每行一个。Enter 或粘贴后自动添加"}
              rows={2}
              size="sm"
              autoFocus
              disabled={importing}
            />
          </div>

          {/* 项目列表 */}
          <AutoResizer>
            {items.length > 0 && (
              <div className="space-y-0">
                <div className="text-sm font-medium text-muted-foreground pb-3 border-b border-border">
                  导入列表 ({items.length})
                </div>
                <div className="divide-y divide-border">
                  {items.map((item) => (
                    <FileListItem
                      key={item.id}
                      id={item.id}
                      displayName={getDisplayFileName(item)}
                      status={item.status}
                      error={item.error}
                      previewSrc={item.url}
                      imageLoadError={item.imageLoadError}
                      onImageError={() => handleImageError(item.id)}
                      editable={item.status === "pending"}
                      onNameChange={(newName) =>
                        updateItemFileName(item.id, newName)
                      }
                      originalName={item.fileName}
                      onRemove={() => removeItem(item.id)}
                      onRetry={() => handleRetryItem(item.id)}
                      operationDisabled={importing}
                      subtitle={
                        !item.error && !item.result
                          ? `${item.url}${item.fileSize ? ` · ${formatBytes(item.fileSize)}` : ""}`
                          : undefined
                      }
                      resultInfo={
                        item.result ? (
                          <div className="text-xs text-muted-foreground">
                            {formatBytes(item.result.originalSize)}
                            {item.result.width && item.result.height && (
                              <span className="ml-2">
                                · {item.result.width} × {item.result.height}
                              </span>
                            )}
                            {item.result.isDuplicate && (
                              <span className="text-orange-500 ml-2">
                                · 重复项目
                              </span>
                            )}
                          </div>
                        ) : undefined
                      }
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
              disabled={importing}
            />
            <Button
              label="开始导入"
              variant="primary"
              onClick={handleImport}
              size="sm"
              loading={importing}
              disabled={items.length === 0}
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

export default function MediaImport() {
  return <MediaImportInner />;
}

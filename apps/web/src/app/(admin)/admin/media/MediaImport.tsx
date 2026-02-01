"use client";

import { useEffect, useState } from "react";
import {
  RiCheckFill,
  RiCloseFill,
  RiFileDamageFill,
  RiLinksFill,
  RiLoader4Line,
  RiRestartLine,
} from "@remixicon/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

import { getStorageList } from "@/actions/storage";
import { GridItem } from "@/components/client/layout/RowGrid";
import { useBroadcastSender } from "@/hooks/use-broadcast";
import { AutoResizer } from "@/ui/AutoResizer";
import { AutoTransition } from "@/ui/AutoTransition";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Input } from "@/ui/Input";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { Select } from "@/ui/Select";
import { useToast } from "@/ui/Toast";

type ImportMode = "record" | "transfer"; // 记录模式 或 转存模式
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

interface ImportItem {
  id: string;
  url: string;
  fileName: string; // 从 URL 提取的文件名
  fileSize?: number; // 文件大小（字节）
  status: "pending" | "uploading" | "success" | "error";
  result?: UploadMediaResult;
  error?: string;
  imageLoadError?: boolean; // 图片预览加载失败
  customFileName?: string; // 用户自定义的文件名
}

function MediaImportInner() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("record");
  const [processMode, setProcessMode] = useState<ProcessMode>("lossy");
  const [items, setItems] = useState<ImportItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [urlsInput, setUrlsInput] = useState("");
  const [storageProviders, setStorageProviders] = useState<StorageProvider[]>(
    [],
  );
  const [selectedStorageId, setSelectedStorageId] = useState<string>("");
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const { success: toastSuccess, error: toastError } = useToast();
  const { broadcast } = useBroadcastSender<{ type: "media-refresh" }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  // 检测 action=import 参数，自动打开导入对话框
  useEffect(() => {
    if (searchParams.get("action") === "import") {
      setDialogOpen(true);
      // 移除查询参数
      const url = new URL(window.location.href);
      url.searchParams.delete("action");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [searchParams, router]);

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

  // 加载存储提供商列表（仅在转存模式且为 ADMIN/EDITOR 时）
  useEffect(() => {
    if (importMode === "transfer" && userRole && userRole !== "AUTHOR") {
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
            // 过滤掉虚拟存储提供商（external-url）
            const filteredProviders = response.data.filter(
              (provider: StorageProvider) => provider.name !== "external-url",
            );
            setStorageProviders(filteredProviders);
            // 自动选择默认存储提供商
            const defaultStorage = filteredProviders.find(
              (s: StorageProvider) => s.isDefault,
            );
            if (defaultStorage) {
              setSelectedStorageId(defaultStorage.id);
            } else if (filteredProviders.length > 0 && filteredProviders[0]) {
              setSelectedStorageId(filteredProviders[0].id);
            }
          }
        })
        .catch((err) =>
          console.error("Failed to fetch storage providers:", err),
        )
        .finally(() => setLoadingProviders(false));
    }
  }, [importMode, userRole]);

  const openDialog = () => {
    setItems([]);
    setUrlsInput("");
    setImportMode("record"); // 默认为记录模式
    setProcessMode("lossy"); // 默认有损优化
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (importing) return;
    setDialogOpen(false);
    setItems([]);
    setUrlsInput("");
  };

  // 从 URL 提取文件名
  const extractFileName = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const fileName = pathname.split("/").pop() || "未命名文件";
      return decodeURIComponent(fileName);
    } catch {
      return "未命名文件";
    }
  };

  // 预加载图片以获取文件大小
  const preloadImage = async (url: string): Promise<number | undefined> => {
    try {
      const response = await fetch(url, {
        method: "HEAD", // 只获取头部信息，不下载整个文件
      });
      const contentLength = response.headers.get("content-length");
      return contentLength ? parseInt(contentLength, 10) : undefined;
    } catch {
      return undefined;
    }
  };

  // 解析 URL 输入并追加到列表（带去重）
  const parseUrls = async () => {
    const lines = urlsInput.trim().split("\n");
    const newItems: ImportItem[] = [];

    // 获取现有 URL 列表用于去重
    const existingUrls = new Set(items.map((item) => item.url));

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // 简单的 URL 验证
      try {
        new URL(trimmed);
        // 去重：跳过已存在的 URL
        if (!existingUrls.has(trimmed)) {
          const fileName = extractFileName(trimmed);
          newItems.push({
            id: `${trimmed}-${Date.now()}-${Math.random()}`,
            url: trimmed,
            fileName,
            status: "pending",
          });
          existingUrls.add(trimmed); // 添加到集合中，避免本次批次内重复
        }
      } catch {
        // 忽略无效的 URL
        console.warn(`Invalid URL: ${trimmed}`);
      }
    }

    if (newItems.length === 0) {
      toastError("请输入有效的图片 URL", "每行一个 URL");
      return;
    }

    // 追加到现有列表，而不是替换
    setItems((prev) => [...prev, ...newItems]);
    setUrlsInput(""); // 清空输入框

    // 异步加载文件大小
    newItems.forEach((item) => {
      preloadImage(item.url).then((fileSize) => {
        if (fileSize) {
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, fileSize } : i)),
          );
        }
      });
    });
  };

  // 处理输入框的键盘事件（Enter 键追加）
  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (urlsInput.trim()) {
        parseUrls();
      }
    }
  };

  // 处理粘贴事件（自动追加）
  const handleInputPaste = (
    e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");

    if (!pastedText.trim()) return;

    const lines = pastedText.trim().split("\n");
    const newItems: ImportItem[] = [];

    // 获取现有 URL 列表用于去重
    const existingUrls = new Set(items.map((item) => item.url));

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        new URL(trimmed);
        // 去重：跳过已存在的 URL
        if (!existingUrls.has(trimmed)) {
          const fileName = extractFileName(trimmed);
          newItems.push({
            id: `${trimmed}-${Date.now()}-${Math.random()}`,
            url: trimmed,
            fileName,
            status: "pending",
          });
          existingUrls.add(trimmed); // 添加到集合中，避免本次批次内重复
        }
      } catch {
        console.warn(`Invalid URL: ${trimmed}`);
      }
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);

      // 异步加载文件大小
      newItems.forEach((item) => {
        preloadImage(item.url).then((fileSize) => {
          if (fileSize) {
            setItems((prev) =>
              prev.map((i) => (i.id === item.id ? { ...i, fileSize } : i)),
            );
          }
        });
      });
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  // 导入单个图片的函数
  const importSingleItem = async (importItem: ImportItem) => {
    // 标记为导入中
    setItems((prev) =>
      prev.map((item) =>
        item.id === importItem.id
          ? {
              ...item,
              status: "uploading" as const,
              error: undefined,
            }
          : item,
      ),
    );

    try {
      const formData = new FormData();
      formData.append("externalUrl", importItem.url);
      // 如果用户自定义了文件名，传递给后端
      if (importItem.customFileName) {
        formData.append("displayName", importItem.customFileName);
      }

      // 根据导入模式决定参数
      if (importMode === "record") {
        // 记录模式：不压缩，不上传到 OSS
        formData.append("mode", "original");
      } else {
        // 转存模式：按选择的模式压缩并上传
        formData.append("mode", processMode);
        // 如果选择了存储提供商，添加到 FormData
        if (selectedStorageId) {
          formData.append("storageProviderId", selectedStorageId);
        }
      }

      // 使用 fetch 发送请求
      const response = await fetch("/admin/media/upload", {
        method: "POST",
        body: formData,
        credentials: "include", // 携带 cookie
      });

      const result = await response.json();

      if (result.success && result.data) {
        // 更新项目状态为成功
        setItems((prev) =>
          prev.map((item) =>
            item.id === importItem.id
              ? {
                  ...item,
                  status: "success" as const,
                  result: result.data,
                }
              : item,
          ),
        );
        return { success: true };
      } else {
        // 更新项目状态为失败
        const errorMessage = result.message || "导入失败";
        setItems((prev) =>
          prev.map((item) =>
            item.id === importItem.id
              ? {
                  ...item,
                  status: "error" as const,
                  error: errorMessage,
                }
              : item,
          ),
        );
        return { success: false };
      }
    } catch (error) {
      console.error(`导入图片失败: ${importItem.url}`, error);
      setItems((prev) =>
        prev.map((item) =>
          item.id === importItem.id
            ? {
                ...item,
                status: "error" as const,
                error: "导入失败，请稍后重试",
              }
            : item,
        ),
      );
      return { success: false };
    }
  };

  const handleImport = async () => {
    if (items.length === 0) {
      toastError("请先添加要导入的图片 URL");
      return;
    }

    // 只导入待导入的项目（不包括失败的项目，失败的项目需要通过重试按钮单独导入）
    const itemsToImport = items.filter((item) => item.status === "pending");

    if (itemsToImport.length === 0) {
      toastError("没有需要导入的项目");
      return;
    }

    setImporting(true);

    try {
      // 并发导入，最多同时3个
      const CONCURRENT_LIMIT = 3;
      let successCount = 0;
      let failCount = 0;

      // 创建项目队列（使用索引而非修改数组）
      let currentIndex = 0;
      const totalItems = itemsToImport.length;

      // 导入单个项目并递归处理队列
      const importNext = async (): Promise<void> => {
        // 从队列中取出下一个项目
        const index = currentIndex++;
        if (index >= totalItems) {
          return; // 队列已空
        }

        const item = itemsToImport[index];
        if (!item) return;

        // 导入当前项目
        const result = await importSingleItem(item);

        // 统计结果
        if (result.success) {
          successCount++;
        } else {
          failCount++;
        }

        // 立即开始导入下一个项目（递归）
        await importNext();
      };

      // 启动初始的并发导入任务（最多 CONCURRENT_LIMIT 个）
      const initialTasks = [];
      for (let i = 0; i < Math.min(CONCURRENT_LIMIT, totalItems); i++) {
        initialTasks.push(importNext());
      }

      // 等待所有并发链完成
      await Promise.all(initialTasks);

      // 显示导入结果
      if (successCount > 0 && failCount === 0) {
        toastSuccess("导入成功", `成功导入 ${successCount} 个图片`);
        await broadcast({ type: "media-refresh" });
      } else if (successCount > 0 && failCount > 0) {
        toastSuccess(
          "部分成功",
          `成功 ${successCount} 个，失败 ${failCount} 个`,
        );
        await broadcast({ type: "media-refresh" });
      } else {
        toastError("导入失败", "所有图片都导入失败");
      }
    } catch (error) {
      console.error("导入图片失败:", error);
      toastError("导入失败", "请稍后重试");
    } finally {
      setImporting(false);
    }
  };

  // 重试导入单个项目
  const retryItem = async (id: string) => {
    const itemToRetry = items.find((item) => item.id === id);
    if (!itemToRetry) return;

    try {
      const result = await importSingleItem(itemToRetry);
      if (result.success) {
        toastSuccess("导入成功");
        await broadcast({ type: "media-refresh" });
      } else {
        toastError("导入失败", "请检查错误信息后重试");
      }
    } catch (error) {
      console.error("重试导入失败:", error);
      toastError("导入失败", "请稍后重试");
    }
  };

  // 更新项目文件名
  const updateItemFileName = (id: string, newFileName: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, customFileName: newFileName } : item,
      ),
    );
  };

  // 获取显示的文件名
  const getDisplayFileName = (importItem: ImportItem): string => {
    return importItem.customFileName || importItem.fileName;
  };

  // 处理文件名编辑
  const handleFileNameBlur = (
    id: string,
    e: React.FocusEvent<HTMLDivElement>,
  ) => {
    const newFileName = e.currentTarget.textContent?.trim() || "";
    if (newFileName) {
      updateItemFileName(id, newFileName);
    } else {
      // 如果为空，恢复原始文件名
      e.currentTarget.textContent =
        items.find((item) => item.id === id)?.fileName || "";
    }
  };

  // 处理回车键
  const handleFileNameKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  // 处理图片加载错误
  const handleImageError = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, imageLoadError: true } : item,
      ),
    );
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
                  将图片的元信息，例如文件大小、图片尺寸、模糊占位符等解析后保存到数据库，并为其启用站点的b图片优化。
                  其性能与常规上传的图片相同，并可在全站所有功能中使用。图片仍然托管在原始的外部
                  URL 上，不会上传到存储服务。
                </p>
              )}
            </AutoTransition>
          </AutoResizer>

          {/* URL 输入区域 */}
          <div className="space-y-2">
            <Input
              label="图片 URL"
              value={urlsInput}
              onChange={(e) => setUrlsInput(e.target.value)}
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
                    <div
                      key={item.id}
                      className="flex items-center gap-3 py-3 px-5"
                    >
                      {/* 预览图 */}
                      <div className="flex-shrink-0">
                        <div className="w-14 h-14 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                          {!item.imageLoadError ? (
                            <Image
                              unoptimized
                              src={item.url}
                              alt={getDisplayFileName(item)}
                              className="w-full h-full object-cover"
                              width={56}
                              height={56}
                              onError={() => handleImageError(item.id)}
                            />
                          ) : (
                            <RiFileDamageFill
                              className="text-muted-foreground"
                              size="1.5em"
                            />
                          )}
                        </div>
                      </div>

                      {/* 项目信息 */}
                      <div className="flex-1 min-w-0">
                        {/* 文件名（可编辑） */}
                        <div
                          contentEditable={
                            item.status === "pending" && !importing
                          }
                          suppressContentEditableWarning
                          onBlur={(e) => handleFileNameBlur(item.id, e)}
                          onKeyDown={handleFileNameKeyDown}
                          className={`text-sm font-medium truncate mb-1 outline-none ${
                            item.status === "pending" && !importing
                              ? "cursor-text focus:underline"
                              : ""
                          }`}
                        >
                          {getDisplayFileName(item)}
                        </div>

                        {/* URL 和文件大小 */}
                        {!item.error && (
                          <div className="text-xs text-muted-foreground truncate">
                            {item.url}
                            {item.fileSize && (
                              <span className="ml-2">
                                · {formatBytes(item.fileSize)}
                              </span>
                            )}
                          </div>
                        )}

                        {/* 错误信息 */}
                        {item.error && (
                          <div className="text-xs text-error">{item.error}</div>
                        )}

                        {/* 成功信息 */}
                        {item.result && (
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
                        )}
                      </div>

                      {/* 状态指示器 */}
                      <div className="flex-shrink-0 w-20">
                        <AutoTransition type="scale">
                          {item.status === "pending" && (
                            <div className="h-6 w-6" />
                          )}
                          {item.status === "uploading" && (
                            <div className="flex flex-col items-center gap-1">
                              <RiLoader4Line
                                className="animate-spin text-primary"
                                size="1.5em"
                              />
                            </div>
                          )}
                          {item.status === "success" && (
                            <div className="flex flex-col items-center gap-1">
                              <RiCheckFill
                                className="text-success"
                                size="1.75em"
                              />
                            </div>
                          )}
                          {item.status === "error" && (
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
                      {item.status === "error" ? (
                        <button
                          type="button"
                          onClick={() => retryItem(item.id)}
                          className="flex-shrink-0 p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-muted-foreground disabled:hover:bg-transparent"
                          aria-label={`重试 ${item.url}`}
                          title="重试导入"
                          disabled={importing}
                        >
                          <RiRestartLine size="1.5em" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="flex-shrink-0 p-2 text-muted-foreground hover:text-error hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-muted-foreground disabled:hover:bg-transparent"
                          aria-label={`删除 ${item.url}`}
                          title="删除此项目"
                          disabled={
                            importing ||
                            item.status === "success" ||
                            item.status === "uploading"
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
              disabled={importing}
            />
            <Button
              label="开始导入"
              variant="primary"
              onClick={handleImport}
              size="sm"
              loading={importing}
              loadingText="导入中..."
              disabled={items.length === 0}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}

export default function MediaImport() {
  return <MediaImportInner />;
}

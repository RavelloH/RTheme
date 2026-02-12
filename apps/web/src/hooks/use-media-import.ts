"use client";

import { useCallback, useState } from "react";

import type { ProcessMode, UploadMediaResult } from "@/hooks/use-media-upload";

export interface ImportItem {
  id: string;
  url: string;
  fileName: string;
  fileSize?: number;
  status: "pending" | "uploading" | "success" | "error";
  result?: UploadMediaResult;
  error?: string;
  imageLoadError?: boolean;
  customFileName?: string;
}

interface UseMediaImportOptions {
  importMode: "record" | "transfer";
  processMode: ProcessMode;
  storageId: string;
  folderId: number | null;
}

interface UseMediaImportReturn {
  items: ImportItem[];
  setItems: React.Dispatch<React.SetStateAction<ImportItem[]>>;
  importing: boolean;
  urlInput: string;
  setUrlInput: (value: string) => void;
  parseUrls: () => boolean;
  handleInputKeyDown: (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  handleInputPaste: (
    e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  importAll: () => Promise<{
    successCount: number;
    failCount: number;
    successfulResults: UploadMediaResult[];
  }>;
  importSingleItem: (
    importItem: ImportItem,
  ) => Promise<{ success: boolean; data?: UploadMediaResult }>;
  retryItem: (
    id: string,
  ) => Promise<{ success: boolean; data?: UploadMediaResult }>;
  removeItem: (id: string) => void;
  updateItemFileName: (id: string, newFileName: string) => void;
  getDisplayFileName: (item: ImportItem) => string;
  handleImageError: (id: string) => void;
  clearItems: () => void;
}

// 从 URL 提取文件名
function extractFileName(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const fileName = pathname.split("/").pop() || "未命名文件";
    return decodeURIComponent(fileName);
  } catch {
    return "未命名文件";
  }
}

// 预加载图片以获取文件大小
async function preloadImageSize(url: string): Promise<number | undefined> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    const contentLength = response.headers.get("content-length");
    return contentLength ? parseInt(contentLength, 10) : undefined;
  } catch {
    return undefined;
  }
}

// 解析文本中的 URL 并去重
function parseUrlsFromText(
  text: string,
  existingUrls: Set<string>,
): ImportItem[] {
  const lines = text.trim().split("\n");
  const newItems: ImportItem[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      new URL(trimmed);
      if (!existingUrls.has(trimmed)) {
        const fileName = extractFileName(trimmed);
        newItems.push({
          id: `${trimmed}-${Date.now()}-${Math.random()}`,
          url: trimmed,
          fileName,
          status: "pending",
        });
        existingUrls.add(trimmed);
      }
    } catch {
      console.warn(`Invalid URL: ${trimmed}`);
    }
  }

  return newItems;
}

/**
 * 媒体导入 Hook
 * 提取完整的导入流程：URL 解析、去重、批量导入、重试
 */
export function useMediaImport(
  options: UseMediaImportOptions,
): UseMediaImportReturn {
  const { importMode, processMode, storageId, folderId } = options;
  const [items, setItems] = useState<ImportItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  // 追加新项并异步加载文件大小
  const appendItems = useCallback((newItems: ImportItem[]) => {
    if (newItems.length === 0) return;

    setItems((prev) => [...prev, ...newItems]);

    // 异步加载文件大小
    newItems.forEach((item) => {
      preloadImageSize(item.url).then((fileSize) => {
        if (fileSize) {
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, fileSize } : i)),
          );
        }
      });
    });
  }, []);

  // 解析 URL 输入并追加到列表
  const parseUrls = useCallback(() => {
    if (!urlInput.trim()) return false;

    const existingUrls = new Set(items.map((item) => item.url));
    const newItems = parseUrlsFromText(urlInput, existingUrls);

    if (newItems.length === 0) return false;

    appendItems(newItems);
    setUrlInput("");
    return true;
  }, [urlInput, items, appendItems]);

  // 处理输入框的键盘事件（Enter 键追加）
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (urlInput.trim()) {
          parseUrls();
        }
      }
    },
    [urlInput, parseUrls],
  );

  // 处理粘贴事件（自动追加）
  const handleInputPaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");
      if (!pastedText.trim()) return;

      const existingUrls = new Set(items.map((item) => item.url));
      const newItems = parseUrlsFromText(pastedText, existingUrls);

      if (newItems.length > 0) {
        appendItems(newItems);
      }
    },
    [items, appendItems],
  );

  // 导入单个图片
  const importSingleItem = useCallback(
    async (
      importItem: ImportItem,
    ): Promise<{ success: boolean; data?: UploadMediaResult }> => {
      // 标记为导入中
      setItems((prev) =>
        prev.map((item) =>
          item.id === importItem.id
            ? { ...item, status: "uploading" as const, error: undefined }
            : item,
        ),
      );

      try {
        const formData = new FormData();
        formData.append("externalUrl", importItem.url);
        formData.append("importMode", importMode);

        if (importItem.customFileName) {
          formData.append("displayName", importItem.customFileName);
        }

        // 根据导入模式决定参数
        if (importMode === "record") {
          formData.append("mode", "original");
        } else {
          formData.append("mode", processMode);
          if (storageId) {
            formData.append("storageProviderId", storageId);
          }
        }

        // 如果选择了文件夹，添加到 FormData
        if (folderId) {
          formData.append("folderId", String(folderId));
        }

        const response = await fetch("/admin/media/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        const result = await response.json();

        if (result.success && result.data) {
          setItems((prev) =>
            prev.map((item) =>
              item.id === importItem.id
                ? { ...item, status: "success" as const, result: result.data }
                : item,
            ),
          );
          return { success: true, data: result.data };
        } else {
          const errorMessage = result.message || "导入失败";
          setItems((prev) =>
            prev.map((item) =>
              item.id === importItem.id
                ? { ...item, status: "error" as const, error: errorMessage }
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
    },
    [importMode, processMode, storageId, folderId],
  );

  // 批量导入所有待导入项
  const importAll = useCallback(async () => {
    const itemsToImport = items.filter((item) => item.status === "pending");

    if (itemsToImport.length === 0) {
      return { successCount: 0, failCount: 0, successfulResults: [] };
    }

    setImporting(true);

    try {
      const CONCURRENT_LIMIT = 3;
      let successCount = 0;
      let failCount = 0;
      const successfulResults: UploadMediaResult[] = [];

      let currentIndex = 0;
      const totalItems = itemsToImport.length;

      const importNext = async (): Promise<void> => {
        const index = currentIndex++;
        if (index >= totalItems) return;

        const item = itemsToImport[index];
        if (!item) return;

        const result = await importSingleItem(item);

        if (result.success && result.data) {
          successCount++;
          successfulResults.push(result.data);
        } else {
          failCount++;
        }

        await importNext();
      };

      const initialTasks = [];
      for (let i = 0; i < Math.min(CONCURRENT_LIMIT, totalItems); i++) {
        initialTasks.push(importNext());
      }

      await Promise.all(initialTasks);

      return { successCount, failCount, successfulResults };
    } finally {
      setImporting(false);
    }
  }, [items, importSingleItem]);

  // 重试导入单个项目
  const retryItem = useCallback(
    async (id: string) => {
      const itemToRetry = items.find((item) => item.id === id);
      if (!itemToRetry) return { success: false };

      return importSingleItem(itemToRetry);
    },
    [items, importSingleItem],
  );

  // 移除导入项
  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  // 更新导入项文件名
  const updateItemFileName = useCallback((id: string, newFileName: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, customFileName: newFileName } : item,
      ),
    );
  }, []);

  // 获取导入项显示文件名
  const getDisplayFileName = useCallback((item: ImportItem): string => {
    return item.customFileName || item.fileName;
  }, []);

  // 处理导入项图片加载错误
  const handleImageError = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, imageLoadError: true } : item,
      ),
    );
  }, []);

  // 清除所有项
  const clearItems = useCallback(() => {
    setItems([]);
    setUrlInput("");
  }, []);

  return {
    items,
    setItems,
    importing,
    urlInput,
    setUrlInput,
    parseUrls,
    handleInputKeyDown,
    handleInputPaste,
    importAll,
    importSingleItem,
    retryItem,
    removeItem,
    updateItemFileName,
    getDisplayFileName,
    handleImageError,
    clearItems,
  };
}

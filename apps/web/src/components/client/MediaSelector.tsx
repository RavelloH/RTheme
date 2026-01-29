"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";
import { Dialog } from "@/ui/Dialog";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { Select } from "@/ui/Select";
import { Tooltip } from "@/ui/Tooltip";
import { useToast } from "@/ui/Toast";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { Checkbox } from "@/ui/Checkbox";
import CMSImage from "@/components/CMSImage";
import {
  RiAddLine,
  RiEditLine,
  RiCloseLine,
  RiImageLine,
  RiUploadLine,
  RiCheckFill,
  RiLoader4Line,
  RiFileDamageFill,
  RiCloseFill,
  RiRestartLine,
} from "@remixicon/react";
import { getMediaList } from "@/actions/media";
import { type MediaListItem } from "@repo/shared-types/api/media";
import { getStorageList } from "@/actions/storage";
import Image from "next/image";
import { AutoResizer } from "@/ui/AutoResizer";
import { AutoTransition } from "@/ui/AutoTransition";
import { SegmentedControl } from "@/ui/SegmentedControl";
import Clickable from "@/ui/Clickable";

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

interface MediaSelectorProps {
  value?: string;
  onChange: (url: string | string[]) => void;
  multiple?: boolean;
  label?: string;
  helperText?: string;
  /** 默认打开的标签页 */
  defaultTab?: "select" | "upload" | "url";
  /** 受控模式：对话框是否打开 */
  open?: boolean;
  /** 受控模式：对话框状态变化回调 */
  onOpenChange?: (open: boolean) => void;
  /** 是否隐藏触发按钮（用于外部控制打开） */
  hideTrigger?: boolean;
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

interface UploadFile {
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
  result?: {
    url: string;
    imageId: string;
    processedSize?: number;
    originalSize?: number;
    isDuplicate?: boolean;
  };
}

export default function MediaSelector({
  value,
  onChange,
  multiple = false,
  label = "图片",
  helperText,
  defaultTab = "select",
  open,
  onOpenChange,
  hideTrigger = false,
}: MediaSelectorProps) {
  // 支持受控和非受控模式
  const isControlled = open !== undefined;
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const dialogOpen = isControlled ? open : internalDialogOpen;

  const setDialogOpen = useCallback(
    (value: boolean) => {
      if (isControlled) {
        onOpenChange?.(value);
      } else {
        setInternalDialogOpen(value);
      }
    },
    [isControlled, onOpenChange],
  );
  const [activeTab, setActiveTab] = useState<"select" | "upload" | "url">(
    defaultTab,
  );
  const toast = useToast();

  // 选择标签页状态
  const [mediaList, setMediaList] = useState<MediaListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<number>>(
    new Set(),
  );

  // Intersection Observer 哨兵 - 用于懒加载
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    skip: !hasMore,
  });

  // 上传标签页状态
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [mode, setMode] = useState<ProcessMode>("lossy");
  const [storageProviders, setStorageProviders] = useState<StorageProvider[]>(
    [],
  );
  const [selectedStorageId, setSelectedStorageId] = useState<string>("");
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadingRef = useRef(false); // 使用 ref 追踪加载状态
  const pageRef = useRef(1); // 使用 ref 追踪当前页码
  const hasMoreRef = useRef(true); // 使用 ref 追踪是否还有更多
  const loadMediaListRef = useRef<
    ((page: number, append: boolean) => Promise<void>) | undefined
  >(undefined);

  // URL 标签页状态(外部图片导入)
  const [urlInput, setUrlInput] = useState("");
  const [importMode, setImportMode] = useState<"record" | "transfer">("record");
  const [importProcessMode, setImportProcessMode] =
    useState<ProcessMode>("lossy");
  const [importItems, setImportItems] = useState<
    Array<{
      id: string;
      url: string;
      fileName: string;
      fileSize?: number;
      status: "pending" | "uploading" | "success" | "error";
      result?: {
        imageId: string;
        url: string;
        originalSize: number;
        processedSize: number;
        isDuplicate: boolean;
        width: number | null;
        height: number | null;
      };
      error?: string;
      imageLoadError?: boolean;
      customFileName?: string;
    }>
  >([]);
  const [importing, setImporting] = useState(false);

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

  // 格式化字节大小
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  // 计算压缩率
  const calculateCompressionRatio = (
    original: number,
    processed: number,
  ): string => {
    const ratio = ((original - processed) / original) * 100;
    return ratio > 0
      ? `-${ratio.toFixed(1)}%`
      : `+${Math.abs(ratio).toFixed(1)}%`;
  };

  // 获取显示的文件名
  const getDisplayFileName = (uploadFile: UploadFile): string => {
    return uploadFile.customName || uploadFile.file.name;
  };

  // 更新自定义文件名
  const updateFileName = (id: string, newName: string) => {
    setUploadFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, customName: newName } : f)),
    );
  };

  // 处理文件名编辑
  const handleFileNameBlur = (
    id: string,
    e: React.FocusEvent<HTMLDivElement>,
  ) => {
    const newName = e.currentTarget.textContent?.trim() || "";
    if (newName) {
      updateFileName(id, newName);
    } else {
      // 如果为空，恢复原始文件名
      e.currentTarget.textContent =
        uploadFiles.find((f) => f.id === id)?.file.name || "";
    }
  };

  // 处理回车键
  const handleFileNameKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  // ========== 外部图片导入相关函数 ==========

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
      const response = await fetch(url, { method: "HEAD" });
      const contentLength = response.headers.get("content-length");
      return contentLength ? parseInt(contentLength, 10) : undefined;
    } catch {
      return undefined;
    }
  };

  // 解析 URL 输入并追加到列表(带去重)
  const parseImportUrls = async () => {
    const lines = urlInput.trim().split("\n");
    const newItems: typeof importItems = [];

    // 获取现有 URL 列表用于去重
    const existingUrls = new Set(importItems.map((item) => item.url));

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // 简单的 URL 验证
      try {
        new URL(trimmed);
        // 去重:跳过已存在的 URL
        if (!existingUrls.has(trimmed)) {
          const fileName = extractFileName(trimmed);
          newItems.push({
            id: `${trimmed}-${Date.now()}-${Math.random()}`,
            url: trimmed,
            fileName,
            status: "pending",
          });
          existingUrls.add(trimmed); // 添加到集合中,避免本次批次内重复
        }
      } catch {
        // 忽略无效的 URL
        console.warn(`Invalid URL: ${trimmed}`);
      }
    }

    if (newItems.length === 0) {
      toast.error("请输入有效的图片 URL");
      return;
    }

    // 追加到现有列表,而不是替换
    setImportItems((prev) => [...prev, ...newItems]);
    setUrlInput(""); // 清空输入框

    // 异步加载文件大小
    newItems.forEach((item) => {
      preloadImage(item.url).then((fileSize) => {
        if (fileSize) {
          setImportItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, fileSize } : i)),
          );
        }
      });
    });
  };

  // 处理输入框的键盘事件(Enter 键追加)
  const handleImportInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (urlInput.trim()) {
        parseImportUrls();
      }
    }
  };

  // 处理粘贴事件(自动追加)
  const handleImportInputPaste = (
    e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");

    if (!pastedText.trim()) return;

    const lines = pastedText.trim().split("\n");
    const newItems: typeof importItems = [];

    // 获取现有 URL 列表用于去重
    const existingUrls = new Set(importItems.map((item) => item.url));

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        new URL(trimmed);
        // 去重:跳过已存在的 URL
        if (!existingUrls.has(trimmed)) {
          const fileName = extractFileName(trimmed);
          newItems.push({
            id: `${trimmed}-${Date.now()}-${Math.random()}`,
            url: trimmed,
            fileName,
            status: "pending",
          });
          existingUrls.add(trimmed); // 添加到集合中,避免本次批次内重复
        }
      } catch {
        console.warn(`Invalid URL: ${trimmed}`);
      }
    }

    if (newItems.length > 0) {
      setImportItems((prev) => [...prev, ...newItems]);

      // 异步加载文件大小
      newItems.forEach((item) => {
        preloadImage(item.url).then((fileSize) => {
          if (fileSize) {
            setImportItems((prev) =>
              prev.map((i) => (i.id === item.id ? { ...i, fileSize } : i)),
            );
          }
        });
      });
    }
  };

  // 移除导入项
  const removeImportItem = (id: string) => {
    setImportItems((prev) => prev.filter((item) => item.id !== id));
  };

  // 更新导入项文件名
  const updateImportItemFileName = (id: string, newFileName: string) => {
    setImportItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, customFileName: newFileName } : item,
      ),
    );
  };

  // 获取导入项显示文件名
  const getImportDisplayFileName = (
    item: (typeof importItems)[number],
  ): string => {
    return item.customFileName || item.fileName;
  };

  // 处理导入项文件名编辑
  const handleImportFileNameBlur = (
    id: string,
    e: React.FocusEvent<HTMLDivElement>,
  ) => {
    const newFileName = e.currentTarget.textContent?.trim() || "";
    if (newFileName) {
      updateImportItemFileName(id, newFileName);
    } else {
      // 如果为空,恢复原始文件名
      e.currentTarget.textContent =
        importItems.find((item) => item.id === id)?.fileName || "";
    }
  };

  // 处理导入项图片加载错误
  const handleImportImageError = (id: string) => {
    setImportItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, imageLoadError: true } : item,
      ),
    );
  };

  // 导入单个图片
  const importSingleItem = async (importItem: (typeof importItems)[number]) => {
    // 标记为导入中
    setImportItems((prev) =>
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
      // 如果用户自定义了文件名,传递给后端
      if (importItem.customFileName) {
        formData.append("displayName", importItem.customFileName);
      }

      // 根据导入模式决定参数
      if (importMode === "record") {
        // 记录模式:不压缩,不上传到 OSS
        formData.append("mode", "original");
      } else {
        // 转存模式:按选择的模式压缩并上传
        formData.append("mode", importProcessMode);
        // 如果选择了存储提供商,添加到 FormData
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
        setImportItems((prev) =>
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
        return { success: true, data: result.data };
      } else {
        // 更新项目状态为失败
        const errorMessage = result.message || "导入失败";
        setImportItems((prev) =>
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
      setImportItems((prev) =>
        prev.map((item) =>
          item.id === importItem.id
            ? {
                ...item,
                status: "error" as const,
                error: "导入失败,请稍后重试",
              }
            : item,
        ),
      );
      return { success: false };
    }
  };

  // 执行导入并选择
  const handleImportAndSelect = async () => {
    if (importItems.length === 0) {
      toast.error("请先添加要导入的图片 URL");
      return;
    }

    // 只导入待导入的项目(不包括失败的项目)
    const itemsToImport = importItems.filter(
      (item) => item.status === "pending",
    );

    if (itemsToImport.length === 0) {
      toast.error("没有需要导入的项目");
      return;
    }

    setImporting(true);

    try {
      // 并发导入,最多同时3个
      const CONCURRENT_LIMIT = 3;
      let successCount = 0;
      let failCount = 0;
      const successfulImageIds: string[] = [];

      // 创建项目队列(使用索引而非修改数组)
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
        if (result.success && result.data) {
          successCount++;
          successfulImageIds.push(result.data.imageId);
        } else {
          failCount++;
        }

        // 立即开始导入下一个项目(递归)
        await importNext();
      };

      // 启动初始的并发导入任务(最多 CONCURRENT_LIMIT 个)
      const initialTasks = [];
      for (let i = 0; i < Math.min(CONCURRENT_LIMIT, totalItems); i++) {
        initialTasks.push(importNext());
      }

      // 等待所有并发链完成
      await Promise.all(initialTasks);

      // 显示导入结果并自动选择
      if (successCount > 0 && failCount === 0) {
        // 全部成功
        if (multiple) {
          const urls = successfulImageIds.map((id) => `/p/${id}`);
          onChange(urls);
        } else {
          onChange(`/p/${successfulImageIds[0]}`);
        }
        closeDialog();
        toast.success(`成功导入 ${successCount} 张图片`);
      } else if (successCount > 0 && failCount > 0) {
        // 部分成功
        if (multiple) {
          const urls = successfulImageIds.map((id) => `/p/${id}`);
          onChange(urls);
        } else if (successfulImageIds[0]) {
          onChange(`/p/${successfulImageIds[0]}`);
        }
        closeDialog();
        toast.success(`成功 ${successCount} 张,失败 ${failCount} 张`);
      } else {
        toast.error("导入失败,所有图片都导入失败");
      }
    } catch (error) {
      console.error("导入图片失败:", error);
      toast.error("导入失败,请稍后重试");
    } finally {
      setImporting(false);
    }
  };

  // 重试导入单个项目
  const retryImportItem = async (id: string) => {
    const itemToRetry = importItems.find((item) => item.id === id);
    if (!itemToRetry) return;

    const result = await importSingleItem(itemToRetry);
    if (result.success && result.data) {
      // 单选模式下重试成功后自动选择
      if (!multiple) {
        onChange(`/p/${result.data.imageId}`);
        closeDialog();
      }
      toast.success("导入成功");
    } else {
      toast.error("导入失败,请检查错误信息后重试");
    }
  };

  // ========== End of 外部图片导入相关函数 ==========

  // 打开对话框
  const openDialog = useCallback(() => {
    setDialogOpen(true);
    if (value && value.startsWith("/p/")) {
      // CMS 内部图片，切换到选择标签页
      setActiveTab("select");
    } else if (value) {
      // 外部 URL，切换到 URL 标签页并填充
      setActiveTab("url");
      setUrlInput(value);
    } else {
      // 无值，使用默认标签页
      setActiveTab(defaultTab);
    }
  }, [value, defaultTab, setDialogOpen]);

  // 关闭对话框
  const closeDialog = useCallback(() => {
    if (uploading || importing) return;
    setDialogOpen(false);
    setUploadFiles([]);
    setUrlInput("");
    setSelectedImageIds(new Set());
    setMode("lossy"); // 重置为默认压缩模式
    // 清除导入状态
    setImportItems([]);
    setImportMode("record");
    setImportProcessMode("lossy");
  }, [uploading, importing, setDialogOpen]);

  // 受控模式下，当对话框打开时初始化状态
  useEffect(() => {
    if (isControlled && open) {
      if (value && value.startsWith("/p/")) {
        setActiveTab("select");
      } else if (value) {
        setActiveTab("url");
        setUrlInput(value);
      } else {
        setActiveTab(defaultTab);
      }
    }
  }, [isControlled, open, value, defaultTab]);

  // 加载媒体列表
  const loadMediaList = useCallback(
    async (pageToLoad: number, append: boolean = false) => {
      if (loadingRef.current) return; // 使用 ref 防止重复加载

      loadingRef.current = true;
      setLoading(true);
      try {
        const result = await getMediaList({
          page: pageToLoad,
          pageSize: 24,
          sortBy: "createdAt",
          sortOrder: "desc",
          mediaType: "IMAGE",
        });

        if (result.success && result.data) {
          const data = result.data; // 明确赋值以进行类型缩窄
          if (append) {
            setMediaList((prev) => [...prev, ...data]);
          } else {
            setMediaList(data);
          }

          if (result.meta) {
            const hasMoreData = pageToLoad < result.meta.totalPages;
            setHasMore(hasMoreData);
            hasMoreRef.current = hasMoreData;
          }

          // 更新页码
          pageRef.current = pageToLoad;
        }
      } catch (error) {
        console.error("Failed to load media list:", error);
        toast.error("加载图片列表失败");
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    },
    [toast],
  );

  // 将 loadMediaList 存储到 ref 中
  useEffect(() => {
    loadMediaListRef.current = loadMediaList;
  }, [loadMediaList]);

  // 当切换到选择标签页时加载列表
  useEffect(() => {
    if (activeTab === "select" && dialogOpen) {
      setMediaList([]);
      setHasMore(true);
      pageRef.current = 1;
      hasMoreRef.current = true;
      loadMediaList(1, false);
    }
  }, [activeTab, dialogOpen, loadMediaList]);

  // Intersection Observer 触发加载更多
  useEffect(() => {
    if (
      inView &&
      hasMoreRef.current &&
      !loadingRef.current &&
      activeTab === "select"
    ) {
      const timer = setTimeout(() => {
        if (hasMoreRef.current && !loadingRef.current) {
          const nextPage = pageRef.current + 1;
          loadMediaListRef.current?.(nextPage, true);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [inView, activeTab]);

  // 选择图片（切换选中状态）
  const handleSelectImage = useCallback(
    (item: MediaListItem) => {
      if (multiple) {
        // 多选模式：切换选中状态
        setSelectedImageIds((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(item.id)) {
            newSet.delete(item.id);
          } else {
            newSet.add(item.id);
          }
          return newSet;
        });
      } else {
        // 单选模式：直接设置
        setSelectedImageIds(new Set([item.id]));
      }
    },
    [multiple],
  );

  // 确认选择
  const handleConfirmSelect = useCallback(() => {
    const selectedItems = mediaList.filter((item) =>
      selectedImageIds.has(item.id),
    );
    if (selectedItems.length > 0) {
      if (multiple) {
        // 多选模式：返回数组
        const urls = selectedItems.map((item) => `/p/${item.imageId}`);
        onChange(urls);
        toast.success(`已选择 ${urls.length} 张图片`);
      } else {
        // 单选模式：返回字符串
        onChange(`/p/${selectedItems[0]!.imageId}`);
        toast.success("图片已选择");
      }
      closeDialog();
    }
  }, [selectedImageIds, mediaList, onChange, closeDialog, toast, multiple]);

  // 文件选择处理
  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      // 单选模式只取第一个文件
      const filesToProcess = multiple
        ? Array.from(selectedFiles)
        : [selectedFiles[0]].filter((f): f is File => f !== undefined);

      const newFiles: UploadFile[] = filesToProcess.map((file) => ({
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: "pending" as const,
        originalSize: file.size,
        previewUrl: URL.createObjectURL(file),
      }));

      setUploadFiles(newFiles);
    },
    [multiple],
  );

  // 处理粘贴事件
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (activeTab !== "upload" || !dialogOpen || uploading) return;

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
              {
                type: file.type,
              },
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
    [activeTab, dialogOpen, uploading, multiple, handleFileSelect],
  );

  // 监听粘贴事件
  useEffect(() => {
    if (dialogOpen && activeTab === "upload") {
      document.addEventListener("paste", handlePaste);
      return () => document.removeEventListener("paste", handlePaste);
    }
  }, [dialogOpen, activeTab, handlePaste]);

  // 组件卸载时清理所有预览 URL
  useEffect(() => {
    return () => {
      uploadFiles.forEach((file) => {
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });
    };
  }, [uploadFiles]);

  // 拖拽处理
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files);
      }
    },
    [handleFileSelect],
  );

  // 上传单个文件
  const uploadSingleFile = useCallback(
    async (uploadFile: UploadFile) => {
      // 标记为上传中
      setUploadFiles((prev) =>
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

        // 如果有自定义文件名，创建新的 File 对象
        let fileToUpload = uploadFile.file;
        if (uploadFile.customName) {
          fileToUpload = new File([uploadFile.file], uploadFile.customName, {
            type: uploadFile.file.type,
            lastModified: uploadFile.file.lastModified,
          });
        }

        formData.append("file", fileToUpload);
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
          data?: {
            url: string;
            imageId: string;
            processedSize?: number;
            originalSize?: number;
            isDuplicate?: boolean;
          };
          message?: string;
        }>((resolve, reject) => {
          // 上传进度
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              setUploadFiles((prev) =>
                prev.map((f) =>
                  f.id === uploadFile.id
                    ? { ...f, uploadProgress: progress }
                    : f,
                ),
              );
            }
          });

          // 上传完成（服务器处理中）
          xhr.upload.addEventListener("load", () => {
            setUploadFiles((prev) =>
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
          setUploadFiles((prev) =>
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
          setUploadFiles((prev) =>
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
        setUploadFiles((prev) =>
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
    },
    [mode, selectedStorageId],
  );

  // 上传并选择
  const handleUploadAndSelect = useCallback(async () => {
    if (uploadFiles.length === 0) {
      toast.error("请先选择文件");
      return;
    }

    setUploading(true);

    try {
      if (multiple) {
        // 多选模式：批量上传所有文件
        const results = await Promise.all(
          uploadFiles.map((file) => uploadSingleFile(file)),
        );

        const successfulUrls = results
          .filter((r) => r.success && r.data)
          .map((r) => `/p/${r.data!.imageId}`);

        if (successfulUrls.length > 0) {
          onChange(successfulUrls);
          closeDialog();
          toast.success(`成功上传 ${successfulUrls.length} 张图片`);
        } else {
          toast.error("所有文件上传失败");
        }
      } else {
        // 单选模式：只上传第一个文件
        const file = uploadFiles[0];
        if (!file) return;

        const result = await uploadSingleFile(file);

        if (result.success && result.data) {
          onChange(`/p/${result.data.imageId}`);
          closeDialog();
          toast.success("图片上传成功");
        } else {
          toast.error("上传失败");
        }
      }
    } catch (error) {
      console.error("上传失败:", error);
      toast.error("上传失败，请稍后重试");
    } finally {
      setUploading(false);
    }
  }, [uploadFiles, uploadSingleFile, onChange, closeDialog, toast, multiple]);

  // 清除图片
  const handleClear = useCallback(() => {
    onChange("");
    toast.success("图片已清除");
  }, [onChange, toast]);

  // 删除文件
  const removeFile = (id: string) => {
    setUploadFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  // 重试上传单个文件
  const retryFile = async (id: string) => {
    const fileToRetry = uploadFiles.find((f) => f.id === id);
    if (!fileToRetry) return;

    try {
      const result = await uploadSingleFile(fileToRetry);
      if (result.success) {
        // 上传成功后自动选择
        if (result.data) {
          onChange(`/p/${result.data.imageId}`);
          closeDialog();
          toast.success("上传成功");
        }
      } else {
        toast.error("上传失败，请检查错误信息后重试");
      }
    } catch (error) {
      console.error("重试上传失败:", error);
      toast.error("上传失败，请稍后重试");
    }
  };

  // 处理图片加载错误
  const handleImageError = (id: string) => {
    setUploadFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, imageLoadError: true } : f)),
    );
  };

  return (
    <div className={hideTrigger ? "" : "space-y-2"}>
      {!hideTrigger && label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      {/* 图片预览或添加按钮 - 仅在非隐藏模式下显示 */}
      {!hideTrigger && (
        <div className="relative">
          {value ? (
            <div className="relative group">
              <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden max-h-[20em]">
                <CMSImage
                  src={value}
                  alt={label}
                  fill
                  className="object-cover"
                />
              </div>
              {/* 悬浮操作栏 */}
              <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                <Tooltip content="编辑">
                  <Clickable onClick={openDialog} hoverScale={1.1}>
                    <div className="p-3 bg-foreground/10 hover:bg-foreground/50 rounded-lg text-white transition-all">
                      <RiEditLine size="1.5em" />
                    </div>
                  </Clickable>
                </Tooltip>
                <Tooltip content="清除">
                  <Clickable onClick={handleClear} hoverScale={1.1}>
                    <div className="p-3 bg-error/40 hover:bg-error/80 rounded-lg text-white transition-all">
                      <RiCloseLine size="1.5em" />
                    </div>
                  </Clickable>
                </Tooltip>
              </div>
            </div>
          ) : (
            <button
              onClick={openDialog}
              className="max-h-[20em] aspect-video w-full bg-muted/80 rounded-lg flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-all cursor-pointer border-2 border-dashed border-border hover:border-muted-foreground"
              type="button"
            >
              <RiAddLine size="2em" />
              <span className="text-sm">选择图片</span>
            </button>
          )}
        </div>
      )}

      {!hideTrigger && helperText && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}

      {/* 选择对话框 */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title="选择图片"
        size="lg"
      >
        <div className="px-6 py-6 space-y-6">
          {/* 标签页切换 - 使用 SegmentedControl */}
          <SegmentedControl
            value={activeTab}
            onChange={setActiveTab}
            options={[
              {
                value: "select",
                label: "选择",
                description: "从已有图片中选择",
              },
              {
                value: "upload",
                label: "上传",
                description: "上传新图片",
              },
              {
                value: "url",
                label: "URL",
                description: "手动输入图片链接",
              },
            ]}
            columns={3}
          />

          {/* 使用 AutoResizer 包裹内容区域，实现平滑高度过渡 */}
          <AutoResizer duration={0.3}>
            <AutoTransition type="fade" duration={0.3}>
              {/* 选择标签页 */}
              {activeTab === "select" && (
                <div className="space-y-4" key="select-tab">
                  {mediaList.length === 0 && !loading ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      暂无图片
                    </div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto scroll-smooth">
                      <>
                        <div
                          className="grid gap-4"
                          style={{
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(8em, 1fr))",
                            contentVisibility: "auto",
                          }}
                        >
                          {mediaList.map((item, index) => {
                            const isSelected = selectedImageIds.has(item.id);
                            // 前 12 张图片使用 eager 加载，其余懒加载
                            const loadingStrategy =
                              index < 12 ? "eager" : "lazy";

                            const renderTooltipContent = () => {
                              return (
                                <div className="space-y-1 min-w-[200px]">
                                  <div className="font-medium truncate">
                                    {item.originalName}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {item.width && item.height && (
                                      <div>
                                        尺寸: {item.width} × {item.height}
                                      </div>
                                    )}
                                    <div>大小: {formatBytes(item.size)}</div>
                                    <div>
                                      上传:{" "}
                                      {new Date(item.createdAt).toLocaleString(
                                        "zh-CN",
                                        {
                                          year: "numeric",
                                          month: "2-digit",
                                          day: "2-digit",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        },
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            };

                            return (
                              <Tooltip
                                key={item.id}
                                content={renderTooltipContent()}
                                placement="top"
                                delay={300}
                                className="block"
                              >
                                <div
                                  onClick={(e) => {
                                    const target = e.target as HTMLElement;
                                    const isCheckboxClick = target.closest(
                                      '[data-checkbox="true"]',
                                    );
                                    if (!isCheckboxClick) {
                                      handleSelectImage(item);
                                    }
                                  }}
                                  className={`
                                  relative aspect-square cursor-pointer overflow-hidden bg-muted/30
                                  group transition-all duration-150
                                  ${
                                    isSelected
                                      ? "border-2 border-primary"
                                      : "border-2 border-transparent hover:border-foreground/30"
                                  }
                                `}
                                  style={{ transform: "translateZ(0)" }}
                                >
                                  {item.width && item.height ? (
                                    <CMSImage
                                      src={`/p/${item.imageId}`}
                                      alt={item.altText || item.originalName}
                                      fill
                                      blur={item.blur}
                                      className="object-cover"
                                      loading={loadingStrategy}
                                      sizes="8em"
                                      priority={index < 6}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                      <RiImageLine size="2em" />
                                    </div>
                                  )}
                                  {/* 复选框 */}
                                  <div
                                    className={`
                                    absolute top-2 right-2 z-10
                                    transition-opacity duration-150
                                    ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                                  `}
                                    data-checkbox="true"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                  >
                                    <div className="rounded p-1">
                                      <Checkbox
                                        checked={isSelected}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          handleSelectImage(item);
                                        }}
                                        size="lg"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </Tooltip>
                            );
                          })}
                        </div>

                        {/* 底部状态显示 */}
                        {hasMore ? (
                          // 有更多数据时，常驻显示加载指示器和哨兵
                          <div
                            ref={loadMoreRef}
                            className="flex justify-center py-4 my-4"
                          >
                            <LoadingIndicator />
                          </div>
                        ) : (
                          // 没有更多数据时，显示提示信息
                          mediaList.length > 0 && (
                            <div className="text-center text-sm text-muted-foreground py-4">
                              没有更多图片了
                            </div>
                          )
                        )}
                      </>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex justify-end gap-4 pt-4 border-t border-foreground/10">
                    <Button
                      label="取消"
                      variant="ghost"
                      onClick={closeDialog}
                      size="sm"
                    />
                    <Button
                      label="确认选择"
                      variant="primary"
                      onClick={handleConfirmSelect}
                      size="sm"
                      disabled={selectedImageIds.size === 0}
                    />
                  </div>
                </div>
              )}

              {/* 上传标签页 */}
              {activeTab === "upload" && (
                <div className="space-y-4">
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
                          disabled={uploading}
                          placeholder="选择存储提供商"
                        />
                      )}
                    </div>
                  )}

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
                      size="3em"
                    />
                    <div className="text-base font-medium mb-2">
                      {multiple
                        ? "拖拽、粘贴文件到此处，或点击选择"
                        : "拖拽、粘贴文件到此处，或点击选择（仅限单张）"}
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
                      accept="image/*"
                      multiple={multiple}
                      onChange={(e) => handleFileSelect(e.target.files)}
                      className="hidden"
                      id="media-selector-file-input"
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
                    {uploadFiles.length > 0 && (
                      <div className="space-y-0">
                        <div className="text-sm font-medium text-muted-foreground pb-3 border-b border-border">
                          文件列表 ({uploadFiles.length})
                        </div>
                        <div className="divide-y divide-border">
                          {uploadFiles.map((uploadFile) => (
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
                                      alt={getDisplayFileName(uploadFile)}
                                      className="w-full h-full object-cover"
                                      width={56}
                                      height={56}
                                      onError={() =>
                                        handleImageError(uploadFile.id)
                                      }
                                    />
                                  ) : (
                                    <RiFileDamageFill
                                      className="text-muted-foreground"
                                      size="1.5em"
                                    />
                                  )}
                                </div>
                              </div>

                              {/* 文件信息 */}
                              <div className="flex-1 min-w-0">
                                <div
                                  contentEditable={
                                    uploadFile.status === "pending" &&
                                    !uploading
                                  }
                                  suppressContentEditableWarning
                                  onBlur={(e) =>
                                    handleFileNameBlur(uploadFile.id, e)
                                  }
                                  onKeyDown={handleFileNameKeyDown}
                                  className={`text-sm font-medium truncate mb-1 outline-none ${
                                    uploadFile.status === "pending" &&
                                    !uploading
                                      ? "cursor-text focus:underline"
                                      : ""
                                  }`}
                                >
                                  {getDisplayFileName(uploadFile)}
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
                                        progress={
                                          uploadFile.uploadProgress || 0
                                        }
                                      />
                                    </div>
                                  )}
                                  {uploadFile.status === "processing" && (
                                    <div className="flex flex-col items-center gap-1">
                                      <RiLoader4Line
                                        className="animate-spin text-primary"
                                        size="1.5em"
                                      />
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
                                  aria-label={`重试 ${getDisplayFileName(uploadFile)}`}
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
                                  aria-label={`删除 ${getDisplayFileName(uploadFile)}`}
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
                      label="上传并选择"
                      variant="primary"
                      onClick={handleUploadAndSelect}
                      size="sm"
                      loading={uploading}
                      loadingText="上传中..."
                      disabled={uploadFiles.length === 0}
                    />
                  </div>
                </div>
              )}

              {/* URL 标签页 - 外部图片导入 */}
              {activeTab === "url" && (
                <div className="space-y-4">
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
                              value={importProcessMode}
                              onChange={setImportProcessMode}
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

                  {/* URL 输入区域 */}
                  <div className="space-y-2">
                    <Input
                      label="图片 URL"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={handleImportInputKeyDown}
                      onPaste={handleImportInputPaste}
                      helperText={
                        "粘贴图片 URL，每行一个。Enter 或粘贴后自动添加"
                      }
                      rows={2}
                      size="sm"
                      disabled={importing}
                    />
                  </div>

                  {/* 导入列表 */}
                  <AutoResizer>
                    {importItems.length > 0 && (
                      <div className="space-y-0">
                        <div className="text-sm font-medium text-muted-foreground pb-3 border-b border-border">
                          导入列表 ({importItems.length})
                        </div>
                        <div className="divide-y divide-border">
                          {importItems.map((item) => (
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
                                      alt={getImportDisplayFileName(item)}
                                      className="w-full h-full object-cover"
                                      width={56}
                                      height={56}
                                      onError={() =>
                                        handleImportImageError(item.id)
                                      }
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
                                  onBlur={(e) =>
                                    handleImportFileNameBlur(item.id, e)
                                  }
                                  onKeyDown={handleFileNameKeyDown}
                                  className={`text-sm font-medium truncate mb-1 outline-none ${
                                    item.status === "pending" && !importing
                                      ? "cursor-text focus:underline"
                                      : ""
                                  }`}
                                >
                                  {getImportDisplayFileName(item)}
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
                                  <div className="text-xs text-error">
                                    {item.error}
                                  </div>
                                )}

                                {/* 成功信息 */}
                                {item.result && (
                                  <div className="text-xs text-muted-foreground">
                                    {formatBytes(item.result.originalSize)}
                                    {item.result.width &&
                                      item.result.height && (
                                        <span className="ml-2">
                                          · {item.result.width} ×{" "}
                                          {item.result.height}
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
                                  onClick={() => retryImportItem(item.id)}
                                  className="flex-shrink-0 p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-muted-foreground disabled:hover:bg-transparent"
                                  aria-label={`重试 ${getImportDisplayFileName(item)}`}
                                  title="重试导入"
                                  disabled={importing}
                                >
                                  <RiRestartLine size="1.5em" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => removeImportItem(item.id)}
                                  className="flex-shrink-0 p-2 text-muted-foreground hover:text-error hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-muted-foreground disabled:hover:bg-transparent"
                                  aria-label={`删除 ${getImportDisplayFileName(item)}`}
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
                      label="导入并选择"
                      variant="primary"
                      onClick={handleImportAndSelect}
                      size="sm"
                      loading={importing}
                      loadingText="导入中..."
                      disabled={importItems.length === 0}
                    />
                  </div>
                </div>
              )}
            </AutoTransition>
          </AutoResizer>
        </div>
      </Dialog>
    </div>
  );
}

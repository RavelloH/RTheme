"use client";

import {
  getMediaList,
  getMediaDetail,
  updateMedia,
  deleteMedia,
} from "@/actions/media";
import GridTable, { FilterConfig, ActionButton } from "@/components/GridTable";
import { TableColumn } from "@/ui/Table";
import { useEffect, useState, useMemo, useCallback, useRef, memo } from "react";
import type { MediaListItem, MediaDetail } from "@repo/shared-types/api/media";
import { useBroadcast } from "@/hooks/use-broadcast";
import { Dialog } from "@/ui/Dialog";
import { AlertDialog } from "@/ui/AlertDialog";
import {
  RiEyeLine,
  RiEditLine,
  RiDeleteBinLine,
  RiImageLine,
  RiVideoLine,
  RiMusicLine,
  RiFileLine,
  RiGridLine,
  RiListUnordered,
  RiSearchLine,
  RiCloseLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiFilter3Line,
} from "@remixicon/react";
import MediaPreviewDialog from "./MediaPreviewDialog";
import { Input } from "@/ui/Input";
import { Switch } from "@/ui/Switch";
import { Button } from "@/ui/Button";
import { useToast } from "@/ui/Toast";
import Link from "@/components/Link";
import CMSImage from "@/components/CMSImage";
import { GridItem } from "@/components/RowGrid";
import { createArray } from "@/lib/client/create-array";
import { Checkbox } from "@/ui/Checkbox";
import { Tooltip } from "@/ui/Tooltip";
import Clickable from "@/ui/Clickable";
import { AutoTransition } from "@/ui/AutoTransition";
import { motion, AnimatePresence } from "framer-motion";
import { Select } from "@/ui/Select";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { useMobile } from "@/hooks/use-mobile";

// 提取图片卡片为独立组件并使用 memo
const MediaGridItem = memo(
  ({
    item,
    isSelected,
    onSelect,
    onPreview,
    formatFileSize,
    getFileTypeIcon,
    actions,
    index,
  }: {
    item: MediaListItem;
    isSelected: boolean;
    onSelect: (id: string | number, checked: boolean) => void;
    onPreview: (item: MediaListItem) => void;
    formatFileSize: (bytes: number) => string;
    getFileTypeIcon: (type: string) => React.ReactNode;
    actions: Array<{
      label: string;
      icon: React.ReactNode;
      onClick: () => void;
      variant?: "primary" | "danger" | "ghost" | "outline";
    }>;
    index: number;
  }) => {
    // 前 24 张图片使用 eager 加载，其余懒加载
    const loadingStrategy = index < 24 ? "eager" : "lazy";

    const renderTooltipContent = () => {
      return (
        <div className="space-y-1 min-w-[200px]">
          <div className="font-medium truncate">{item.originalName}</div>
          <div className="text-xs text-muted-foreground">
            {item.width && item.height && (
              <div>
                尺寸: {item.width} × {item.height}
              </div>
            )}
            <div>大小: {formatFileSize(item.size)}</div>
            <div>
              上传:{" "}
              {new Date(item.createdAt).toLocaleString("zh-CN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>
      );
    };

    return (
      <Tooltip content={renderTooltipContent()} placement="top" delay={300}>
        <div
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
          onClick={(e) => {
            const target = e.target as HTMLElement;
            const isCheckboxClick = target.closest('[data-checkbox="true"]');
            const isActionClick = target.closest('[data-action="true"]');
            if (!isCheckboxClick && !isActionClick) {
              onPreview(item);
            }
          }}
        >
          {/* 图片 */}
          {item.mediaType === "IMAGE" && item.width && item.height ? (
            <CMSImage
              src={`/p/${item.imageId}`}
              alt={item.altText || item.originalName}
              fill
              blur={item.blur}
              className="object-cover"
              sizes="(max-width: 768px) 8rem, 10rem"
              loading={loadingStrategy}
              priority={index < 12}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              {getFileTypeIcon(item.mediaType)}
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
                  onSelect(item.id, e.target.checked);
                }}
                size="lg"
              />
            </div>
          </div>

          {/* 底部操作栏 */}
          <div
            className={`
              absolute bottom-0 left-0 right-0 z-10
              bg-background/80 backdrop-blur-sm
              transform transition-transform duration-200 ease-out
              ${isSelected ? "translate-y-0" : "translate-y-full group-hover:translate-y-0"}
            `}
            data-action="true"
          >
            <div className="flex items-center justify-center gap-2 px-2 py-2">
              {actions.map((action, index) => (
                <Tooltip key={index} content={action.label} placement="top">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick();
                    }}
                    className={`
                      p-2 rounded transition-colors
                      ${
                        action.variant === "danger"
                          ? "hover:bg-red-500/20 hover:text-red-500"
                          : "hover:bg-muted"
                      }
                    `}
                    aria-label={action.label}
                  >
                    {action.icon}
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>
      </Tooltip>
    );
  },
  (prevProps, nextProps) => {
    // 自定义比较函数：返回 true 表示 props 相等（不重新渲染）
    // 只比较数据相关的 props，不比较函数 props（函数引用可能变化但功能相同）
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.item.imageId === nextProps.item.imageId
    );
  },
);

MediaGridItem.displayName = "MediaGridItem";

export default function MediaTable() {
  const toast = useToast();
  const isMobile = useMobile(); // 检测是否为移动设备
  const [data, setData] = useState<MediaListItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(100); // 默认 100
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid"); // 新增视图模式
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValues, setFilterValues] = useState<
    Record<string, string | string[] | { start?: string; end?: string }>
  >({});
  const [selectedMedia, setSelectedMedia] = useState<Set<string | number>>(
    new Set(),
  ); // 改为 Set
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMediaItem, setSelectedMediaItem] =
    useState<MediaListItem | null>(null);
  const [mediaDetail, setMediaDetail] = useState<MediaDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    originalName: "",
    altText: "",
    inGallery: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchValue, setSearchValue] = useState(""); // 搜索输入框的值
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchValueRef = useRef<string>("");
  const [searchDialogOpen, setSearchDialogOpen] = useState(false); // 搜索对话框（移动端）
  const [filterDialogOpen, setFilterDialogOpen] = useState(false); // 筛选对话框
  const [tempFilterValues, setTempFilterValues] = useState<
    Record<string, string | string[] | { start?: string; end?: string }>
  >({}); // 临时筛选值

  // 搜索输入变化处理（防抖）
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchValue !== lastSearchValueRef.current) {
        lastSearchValueRef.current = searchValue;
        setSearchQuery(searchValue);
        setPage(1);
      }
    }, 1000);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchValue]);

  // 处理选中状态变化
  const handleSelectionChange = useCallback(
    (selectedKeys: (string | number)[]) => {
      setSelectedMedia(new Set(selectedKeys));
    },
    [],
  );

  // 处理排序变化
  const handleSortChange = useCallback(
    (key: string, order: "asc" | "desc" | null) => {
      setSortKey(order ? key : null);
      setSortOrder(order);
      setPage(1); // 排序变化时重置到第一页
    },
    [],
  );

  // 处理搜索变化
  const handleSearchChange = useCallback((search: string) => {
    // 只有当搜索内容真正变化时才更新状态和重置页码
    setSearchQuery((prev) => {
      if (search !== prev) {
        setPage(1); // 搜索变化时重置到第一页
        return search;
      }
      return prev;
    });
  }, []);

  // 处理筛选变化
  const handleFilterChange = useCallback(
    (
      filters: Record<
        string,
        string | string[] | { start?: string; end?: string }
      >,
    ) => {
      setFilterValues(filters);
      setPage(1); // 筛选变化时重置到第一页
    },
    [],
  );

  // 打开筛选对话框
  const openFilterDialog = useCallback(() => {
    setTempFilterValues({ ...filterValues });
    setFilterDialogOpen(true);
  }, [filterValues]);

  // 关闭筛选对话框
  const closeFilterDialog = useCallback(() => {
    setFilterDialogOpen(false);
  }, []);

  // 更新临时筛选值
  const updateTempFilterValue = useCallback(
    (
      key: string,
      value: string | string[] | { start?: string; end?: string },
    ) => {
      setTempFilterValues((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [],
  );

  // 切换 checkbox 选项
  const toggleCheckboxOption = useCallback((key: string, option: string) => {
    setTempFilterValues((prev) => {
      const currentValue = prev[key];
      const currentArray = Array.isArray(currentValue) ? currentValue : [];

      if (currentArray.includes(option)) {
        // 移除该选项
        const newArray = currentArray.filter((v) => v !== option);
        if (newArray.length === 0) {
          const { [key]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [key]: newArray };
      } else {
        // 添加该选项
        return { ...prev, [key]: [...currentArray, option] };
      }
    });
  }, []);

  // 应用筛选
  const applyFilters = useCallback(() => {
    // 移除空值
    const cleanedFilters: Record<
      string,
      string | string[] | { start?: string; end?: string }
    > = {};
    Object.entries(tempFilterValues).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // checkboxGroup: 只保留非空数组
        if (value.length > 0) {
          cleanedFilters[key] = value;
        }
      } else if (
        typeof value === "object" &&
        value !== null &&
        "start" in value
      ) {
        // dateRange/range: 至少有一个值才保留
        if (value.start || value.end) {
          cleanedFilters[key] = value;
        }
      } else if (value !== "" && value !== undefined && value !== null) {
        // input: 非空字符串
        cleanedFilters[key] = value as string;
      }
    });

    handleFilterChange(cleanedFilters);
    closeFilterDialog();
  }, [tempFilterValues, handleFilterChange, closeFilterDialog]);

  // 重置筛选
  const resetFilters = useCallback(() => {
    setTempFilterValues({});
    handleFilterChange({});
    closeFilterDialog();
  }, [handleFilterChange, closeFilterDialog]);

  // 判断是否有激活的筛选
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filterValues).length > 0;
  }, [filterValues]);

  // 筛选配置
  const filterConfig: FilterConfig[] = useMemo(
    () => [
      {
        key: "mediaType",
        label: "文件类型",
        type: "checkboxGroup",
        options: [
          { value: "IMAGE", label: "图片" },
          { value: "VIDEO", label: "视频" },
          { value: "AUDIO", label: "音频" },
          { value: "FILE", label: "文件" },
        ],
      },
      {
        key: "userUid",
        label: "上传者 UID",
        type: "input",
        inputType: "number",
        placeholder: "输入用户 UID",
      },
      {
        key: "size",
        label: "文件大小",
        type: "range",
        rangeFields: { min: "sizeMin", max: "sizeMax" },
        inputType: "number",
        placeholderMin: "最小大小 (字节)",
        placeholderMax: "最大大小 (字节)",
      },
      {
        key: "inGallery",
        label: "在图库中显示",
        type: "checkboxGroup",
        options: [
          { value: "true", label: "是" },
          { value: "false", label: "否" },
        ],
      },
      {
        key: "isOptimized",
        label: "已优化",
        type: "checkboxGroup",
        options: [
          { value: "true", label: "是" },
          { value: "false", label: "否" },
        ],
      },
      {
        key: "hasReferences",
        label: "引用状态",
        type: "checkboxGroup",
        options: [
          { value: "true", label: "已被引用" },
          { value: "false", label: "未被引用" },
        ],
      },
      {
        key: "createdAt",
        label: "上传时间",
        type: "dateRange",
        dateFields: { start: "createdAtStart", end: "createdAtEnd" },
      },
    ],
    [],
  );

  // 打开详情对话框
  const openDetailDialog = useCallback(
    async (media: MediaListItem) => {
      setSelectedMediaItem(media);
      setDetailDialogOpen(true);
      setDetailLoading(true);

      try {
        const result = await getMediaDetail({ id: media.id });
        if (result.success && result.data) {
          setMediaDetail(result.data);
        } else {
          toast.error(result.message || "获取详情失败");
        }
      } catch (error) {
        console.error("Get media detail error:", error);
        toast.error("获取详情失败");
      } finally {
        setDetailLoading(false);
      }
    },
    [toast],
  );

  // 关闭详情对话框
  const closeDetailDialog = useCallback(() => {
    setDetailDialogOpen(false);
    setSelectedMediaItem(null);
    setMediaDetail(null);
  }, []);

  // 打开编辑对话框
  const openEditDialog = useCallback((media: MediaListItem) => {
    setSelectedMediaItem(media);
    setEditForm({
      originalName: media.originalName,
      altText: media.altText || "",
      inGallery: media.inGallery,
    });
    setEditDialogOpen(true);
  }, []);

  // 关闭编辑对话框
  const closeEditDialog = useCallback(() => {
    setEditDialogOpen(false);
    setSelectedMediaItem(null);
    setEditForm({
      originalName: "",
      altText: "",
      inGallery: false,
    });
  }, []);

  // 处理编辑表单字段变化
  const handleEditFormChange = useCallback(
    (field: keyof typeof editForm, value: string | boolean) => {
      setEditForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // 处理编辑提交
  const handleEditSubmit = useCallback(async () => {
    if (!selectedMediaItem) return;

    setIsSubmitting(true);
    try {
      const result = await updateMedia({
        id: selectedMediaItem.id,
        originalName: editForm.originalName,
        altText: editForm.altText || null,
        inGallery: editForm.inGallery,
      });

      if (result.success) {
        toast.success(`文件 "${selectedMediaItem.originalName}" 已更新`);
        closeEditDialog();
        setRefreshTrigger((prev) => prev + 1); // 触发刷新
      } else {
        toast.error(result.message || "更新失败");
      }
    } catch (error) {
      console.error("Update media error:", error);
      toast.error("更新失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedMediaItem, editForm, toast, closeEditDialog]);

  // 打开删除对话框
  const openDeleteDialog = useCallback((media: MediaListItem) => {
    setSelectedMediaItem(media);
    setDeleteDialogOpen(true);
  }, []);

  // 关闭删除对话框
  const closeDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false);
    setSelectedMediaItem(null);
  }, []);

  // 处理单个删除
  const handleDelete = useCallback(async () => {
    if (!selectedMediaItem) return;

    setIsSubmitting(true);
    try {
      const result = await deleteMedia({
        ids: [selectedMediaItem.id],
      });

      if (result.success) {
        toast.success(`文件 "${selectedMediaItem.originalName}" 已删除`);
        closeDeleteDialog();
        setRefreshTrigger((prev) => prev + 1); // 触发刷新
      } else {
        toast.error(result.message || "删除失败");
      }
    } catch (error) {
      console.error("Delete media error:", error);
      toast.error("删除失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedMediaItem, toast, closeDeleteDialog]);

  // 打开批量删除对话框
  const openBatchDeleteDialog = useCallback(() => {
    setBatchDeleteDialogOpen(true);
  }, []);

  // 关闭批量删除对话框
  const closeBatchDeleteDialog = useCallback(() => {
    setBatchDeleteDialogOpen(false);
  }, []);

  // 确认批量删除
  const handleConfirmBatchDelete = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const result = await deleteMedia({
        ids: Array.from(selectedMedia).map((id) =>
          typeof id === "number" ? id : Number(id),
        ),
      });

      if (result.success) {
        toast.success(`已删除 ${result.data?.deleted || 0} 个文件`);
        setSelectedMedia(new Set());
        closeBatchDeleteDialog();
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast.error(result.message || "删除失败");
      }
    } catch (error) {
      console.error("Batch delete media error:", error);
      toast.error("删除失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedMedia, toast, closeBatchDeleteDialog]);

  // 监听广播刷新消息
  useBroadcast<{ type: string }>(async (message) => {
    if (message.type === "media-refresh") {
      setRefreshTrigger((prev) => prev + 1); // 触发刷新
    }
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // 构建请求参数
        const params: {
          page: number;
          pageSize: number;
          sortBy?:
            | "id"
            | "createdAt"
            | "size"
            | "originalName"
            | "referencesCount";
          sortOrder?: "asc" | "desc";
          search?: string;
          mediaType?: "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
          userUid?: number;
          sizeMin?: number;
          sizeMax?: number;
          inGallery?: boolean;
          isOptimized?: boolean;
          hasReferences?: boolean;
          createdAtStart?: string;
          createdAtEnd?: string;
        } = {
          page,
          pageSize,
        };

        // 只在有有效的排序参数时才添加
        if (sortKey && sortOrder) {
          // 将 postsCount 映射为 referencesCount
          const mappedSortKey =
            sortKey === "postsCount" ? "referencesCount" : sortKey;
          params.sortBy = mappedSortKey as
            | "id"
            | "createdAt"
            | "size"
            | "originalName"
            | "referencesCount";
          params.sortOrder = sortOrder;
        }

        // 添加搜索参数（全局搜索）
        if (searchQuery && searchQuery.trim()) {
          params.search = searchQuery.trim();
        }

        // 添加筛选参数
        if (filterValues.mediaType) {
          if (typeof filterValues.mediaType === "string") {
            params.mediaType = filterValues.mediaType as
              | "IMAGE"
              | "VIDEO"
              | "AUDIO"
              | "FILE";
          } else if (
            Array.isArray(filterValues.mediaType) &&
            filterValues.mediaType.length > 0
          ) {
            // 如果是数组，取第一个值（后续可以在后端支持多选）
            params.mediaType = filterValues.mediaType[0] as
              | "IMAGE"
              | "VIDEO"
              | "AUDIO"
              | "FILE";
          }
        }

        if (filterValues.userUid && typeof filterValues.userUid === "string") {
          params.userUid = parseInt(filterValues.userUid, 10);
        }

        if (filterValues.size && typeof filterValues.size === "object") {
          const sizeRange = filterValues.size as {
            start?: string;
            end?: string;
          };
          if (sizeRange.start) {
            params.sizeMin = parseInt(sizeRange.start, 10);
          }
          if (sizeRange.end) {
            params.sizeMax = parseInt(sizeRange.end, 10);
          }
        }

        if (filterValues.inGallery) {
          if (typeof filterValues.inGallery === "string") {
            params.inGallery = filterValues.inGallery === "true";
          } else if (
            Array.isArray(filterValues.inGallery) &&
            filterValues.inGallery.length > 0
          ) {
            // 如果是数组，根据第一个值设置布尔值
            params.inGallery = filterValues.inGallery[0] === "true";
          }
        }

        if (filterValues.isOptimized) {
          if (typeof filterValues.isOptimized === "string") {
            params.isOptimized = filterValues.isOptimized === "true";
          } else if (
            Array.isArray(filterValues.isOptimized) &&
            filterValues.isOptimized.length > 0
          ) {
            // 如果是数组，根据第一个值设置布尔值
            params.isOptimized = filterValues.isOptimized[0] === "true";
          }
        }

        if (
          filterValues.createdAt &&
          typeof filterValues.createdAt === "object"
        ) {
          const dateRange = filterValues.createdAt as {
            start?: string;
            end?: string;
          };
          if (dateRange.start) {
            params.createdAtStart = dateRange.start;
          }
          if (dateRange.end) {
            params.createdAtEnd = dateRange.end;
          }
        }

        // 引用状态筛选
        if (filterValues.hasReferences) {
          if (typeof filterValues.hasReferences === "string") {
            params.hasReferences = filterValues.hasReferences === "true";
          } else if (
            Array.isArray(filterValues.hasReferences) &&
            filterValues.hasReferences.length > 0
          ) {
            // 如果是数组，根据第一个值设置布尔值
            params.hasReferences = filterValues.hasReferences[0] === "true";
          }
        }

        const result = await getMediaList({
          page: params.page,
          pageSize: params.pageSize,
          sortBy: params.sortBy || "createdAt",
          sortOrder: params.sortOrder || "desc",
          search: params.search,
          mediaType: params.mediaType,
          userUid: params.userUid,
          sizeMin: params.sizeMin,
          sizeMax: params.sizeMax,
          inGallery: params.inGallery,
          isOptimized: params.isOptimized,
          hasReferences: params.hasReferences,
          createdAtStart: params.createdAtStart,
          createdAtEnd: params.createdAtEnd,
        });

        if (result.success && result.data) {
          setData(result.data);
          setTotalRecords(result.meta?.total || 0);
          if (result.meta) {
            setTotalPages(result.meta.totalPages);
          }
        }
      } catch (error) {
        console.error("Failed to fetch media list:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [
    page,
    pageSize,
    sortKey,
    sortOrder,
    searchQuery,
    filterValues,
    refreshTrigger,
  ]);

  // 格式化文件大小
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }, []);

  // 获取文件类型图标
  const getFileTypeIcon = useCallback((type: string) => {
    switch (type) {
      case "IMAGE":
        return <RiImageLine size="1.2em" />;
      case "VIDEO":
        return <RiVideoLine size="1.2em" />;
      case "AUDIO":
        return <RiMusicLine size="1.2em" />;
      case "FILE":
        return <RiFileLine size="1.2em" />;
      default:
        return <RiFileLine size="1.2em" />;
    }
  }, []);

  const columns: TableColumn<MediaListItem>[] = useMemo(
    () => [
      {
        key: "id",
        title: "ID",
        dataIndex: "id",
        align: "left",
        sortable: true,
        mono: true,
      },
      {
        key: "preview",
        title: "预览",
        dataIndex: "mediaType",
        align: "left",
        render: (value: unknown, record: MediaListItem) => {
          if (record.mediaType === "IMAGE" && record.width && record.height) {
            return (
              <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                <CMSImage
                  src={`/p/${record.imageId}`}
                  alt={record.originalName}
                  width={96}
                  height={96}
                  blur={record.blur}
                  className="w-full h-full object-cover"
                />
              </div>
            );
          }
          return (
            <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              {getFileTypeIcon(record.mediaType)}
            </div>
          );
        },
      },
      {
        key: "originalName",
        title: "显示名称",
        dataIndex: "originalName",
        align: "left",
        sortable: true,
        render: (value: unknown, record: MediaListItem) => {
          const name = String(value);
          return (
            <div className="max-w-[200px]">
              <div className="truncate" title={name}>
                {name}
              </div>
              <div
                className="text-xs text-muted-foreground truncate"
                title={record.fileName}
              >
                {record.fileName}
              </div>
            </div>
          );
        },
      },
      {
        key: "mediaType",
        title: "类型",
        dataIndex: "mediaType",
        align: "left",
        sortable: true,
        render: (value: unknown) => {
          const type = String(value);
          let typeName = "";
          switch (type) {
            case "IMAGE":
              typeName = "图片";
              break;
            case "VIDEO":
              typeName = "视频";
              break;
            case "AUDIO":
              typeName = "音频";
              break;
            case "FILE":
              typeName = "文件";
              break;
            default:
              typeName = "其他";
          }
          return (
            <div className="flex items-center gap-2">
              {getFileTypeIcon(type)}
              <span>{typeName}</span>
            </div>
          );
        },
      },
      {
        key: "size",
        title: "大小",
        dataIndex: "size",
        align: "left",
        sortable: true,
        mono: true,
        render: (value: unknown) => {
          return formatFileSize(Number(value));
        },
      },
      {
        key: "dimensions",
        title: "尺寸",
        dataIndex: "width",
        align: "left",
        render: (value: unknown, record: MediaListItem) => {
          if (record.width && record.height) {
            return `${record.width} × ${record.height}`;
          }
          return "-";
        },
      },
      {
        key: "user",
        title: "上传者",
        dataIndex: "user",
        align: "left",
        render: (value: unknown, record: MediaListItem) => {
          const user = record.user;
          if (!user) {
            return <span className="text-muted-foreground">-</span>;
          }
          return (
            <Link
              href={`/admin/users?uid=${user.uid}`}
              presets={["hover-underline"]}
              title={`@${user.username}`}
            >
              {user.nickname || `@${user.username}`}
            </Link>
          );
        },
      },
      {
        key: "inGallery",
        title: "图库",
        dataIndex: "inGallery",
        sortable: true,
        render: (value: unknown) => {
          return <span>{value ? "是" : "否"}</span>;
        },
      },
      {
        key: "createdAt",
        title: "上传时间",
        dataIndex: "createdAt",
        sortable: true,
        mono: true,
        render: (value: unknown) => {
          if (typeof value === "string") {
            return new Date(value).toLocaleString("zh-CN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
          }
          return "-";
        },
      },
      {
        key: "postsCount",
        title: "引用次数",
        dataIndex: "postsCount",
        align: "left",
        sortable: true,
        render: (value: unknown) => {
          const count = Number(value) || 0;
          return (
            <span
              className={
                count > 0 ? "text-foreground" : "text-muted-foreground"
              }
            >
              {count}
            </span>
          );
        },
      },
    ],
    [formatFileSize, getFileTypeIcon],
  );

  // 批量操作按钮
  const batchActions: ActionButton[] = useMemo(
    () => [
      {
        label: "删除",
        onClick: openBatchDeleteDialog,
        icon: <RiDeleteBinLine size="1em" />,
        variant: "danger" as const,
      },
    ],
    [openBatchDeleteDialog],
  );

  // 行操作按钮
  const rowActions = useCallback(
    (record: MediaListItem) => [
      {
        label: "查看详情",
        icon: <RiEyeLine size="1.1em" />,
        onClick: () => openDetailDialog(record),
      },
      {
        label: "编辑",
        icon: <RiEditLine size="1.1em" />,
        onClick: () => openEditDialog(record),
      },
      {
        label: "删除",
        icon: <RiDeleteBinLine size="1.1em" />,
        onClick: () => openDeleteDialog(record),
        variant: "danger" as const,
      },
    ],
    [openDetailDialog, openEditDialog, openDeleteDialog],
  );

  // 单选
  const handleSelectItem = useCallback(
    (id: string | number, checked: boolean) => {
      setSelectedMedia((prev) => {
        const newSelectedMedia = new Set(prev);
        if (checked) {
          newSelectedMedia.add(id);
        } else {
          newSelectedMedia.delete(id);
        }
        return newSelectedMedia;
      });
    },
    [], // 不依赖 selectedMedia，使用函数式更新
  );

  // 视图切换器组件
  const viewModeToggle = useMemo(
    () => (
      <div className="flex items-center gap-1 bg-muted/30 rounded p-1 text-base">
        <Tooltip content="网格视图" placement="bottom">
          <Clickable
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded transition-colors ${
              viewMode === "grid"
                ? "bg-foreground text-background"
                : "hover:bg-muted"
            }`}
            hoverScale={1.05}
          >
            <RiGridLine size="1em" />
          </Clickable>
        </Tooltip>
        <Tooltip content="表格视图" placement="bottom">
          <Clickable
            onClick={() => setViewMode("table")}
            className={`p-2 rounded transition-colors ${
              viewMode === "table"
                ? "bg-foreground text-background"
                : "hover:bg-muted"
            }`}
            hoverScale={1.05}
          >
            <RiListUnordered size="1em" />
          </Clickable>
        </Tooltip>
      </div>
    ),
    [viewMode],
  );

  return (
    <>
      <AutoTransition
        key={viewMode}
        type="fade"
        duration={0.3}
        className="contents"
      >
        {viewMode === "table" ? (
          <GridTable
            title={
              <div className="flex items-center gap-4">
                <span>媒体文件管理</span>
                {/* 视图切换 */}
                {viewModeToggle}
              </div>
            }
            columns={columns}
            data={data}
            loading={loading}
            rowKey="id"
            page={page}
            totalPages={totalPages}
            totalRecords={totalRecords}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSortChange={handleSortChange}
            onSearchChange={handleSearchChange}
            onRowClick={(record) => openDetailDialog(record)}
            searchPlaceholder="搜索显示名称、原始文件名或替代文本..."
            filterConfig={filterConfig}
            onFilterChange={handleFilterChange}
            striped
            hoverable
            bordered={false}
            size="sm"
            emptyText="暂无媒体文件"
            stickyHeader
            maxHeight="100%"
            padding={2.5}
            enableActions={true}
            batchActions={batchActions}
            rowActions={rowActions}
            onSelectionChange={handleSelectionChange}
          />
        ) : (
          <>
            {/* 表头 */}
            <GridItem
              areas={[1]}
              width={24}
              height={0.1}
              className="flex items-center justify-between text-2xl px-10"
            >
              <div className="flex items-center gap-4">
                <span>媒体文件管理</span>
                {/* 视图切换 */}
                {viewModeToggle}
              </div>
              <div className="flex items-center gap-4">
                {/* 搜索框 */}
                {isMobile ? (
                  // 移动端：显示搜索图标
                  <Tooltip content="搜索" placement="bottom">
                    <Clickable
                      onClick={() => setSearchDialogOpen(true)}
                      className="p-2 rounded transition-colors hover:bg-muted inline-flex"
                      hoverScale={1.1}
                    >
                      <RiSearchLine size="1em" />
                    </Clickable>
                  </Tooltip>
                ) : (
                  // 桌面端：显示搜索输入框
                  <div className="relative w-[15em]">
                    <input
                      title="search"
                      type="text"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      className="
                      relative w-full bg-transparent border-0
                      px-0 py-2 text-base text-white
                      focus:outline-none
                    "
                    />
                    <motion.div
                      className="absolute bottom-0 left-0 h-0.5 w-full"
                      initial={{ backgroundColor: "#ffffff" }}
                      animate={{
                        backgroundColor:
                          searchValue.length > 0
                            ? "var(--color-primary)"
                            : "#ffffff",
                      }}
                      transition={{ duration: 0.3 }}
                    />
                    <motion.label
                      className="absolute top-2 left-0 pointer-events-none whitespace-nowrap flex items-center text-base text-white"
                      animate={{
                        opacity: searchValue.length > 0 ? 0 : 1,
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <RiSearchLine size="1em" className="inline mr-1" />
                      搜索显示名称、原始文件名或替代文本...
                    </motion.label>
                    <AnimatePresence>
                      {searchValue.length > 0 && (
                        <motion.button
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{
                            duration: 0.3,
                            ease: [0.68, -0.55, 0.265, 1.55],
                          }}
                          onClick={() => setSearchValue("")}
                          className="absolute right-0 top-2 text-primary hover:text-white transition-colors cursor-pointer flex items-center"
                          type="button"
                        >
                          <RiCloseLine size="1em" />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* 筛选按钮 */}
                <Tooltip
                  content={hasActiveFilters ? "筛选（已激活）" : "筛选条件"}
                  placement="bottom"
                >
                  <Clickable
                    onClick={openFilterDialog}
                    className={`p-2 rounded transition-colors ${
                      hasActiveFilters
                        ? "bg-foreground text-background"
                        : "bg-muted/30 hover:bg-muted"
                    }`}
                    hoverScale={1.05}
                  >
                    <RiFilter3Line size="1em" />
                  </Clickable>
                </Tooltip>
              </div>
            </GridItem>

            {/* 内容区 */}
            <GridItem areas={createArray(2, 11)} width={24 / 10} height={2}>
              <div className="flex flex-col h-full">
                {/* 批量操作栏 */}
                <AnimatePresence>
                  {selectedMedia.size > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        height: { duration: 0.3, ease: "easeInOut" },
                        opacity: { duration: 0.2, ease: "easeInOut" },
                      }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center justify-between px-10 py-2 border-b border-muted">
                        <div className="flex items-center gap-4">
                          <AutoTransition key={selectedMedia.size}>
                            <span className="text-primary">
                              已选中 {selectedMedia.size} 项
                            </span>
                          </AutoTransition>
                        </div>
                        <div className="flex items-center gap-2">
                          {batchActions.map((action, index) => (
                            <Button
                              key={index}
                              label={action.label || "操作"}
                              variant={action.variant || "outline"}
                              size="sm"
                              icon={action.icon}
                              onClick={action.onClick}
                              disabled={
                                action.disabled || selectedMedia.size === 0
                              }
                              loading={action.loading}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 网格内容 */}
                <div className="flex-1 overflow-auto px-10 py-6 scroll-smooth">
                  {loading ? (
                    <div className="h-full">
                      <LoadingIndicator />
                    </div>
                  ) : data.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-muted-foreground">暂无媒体文件</div>
                    </div>
                  ) : (
                    <div
                      className="grid gap-4"
                      style={{
                        gridTemplateColumns: isMobile
                          ? "repeat(auto-fill, minmax(8em, 1fr))"
                          : "repeat(auto-fill, minmax(10em, 1fr))",
                        contentVisibility: "auto",
                      }}
                    >
                      {data.map((item, index) => (
                        <MediaGridItem
                          key={item.id}
                          item={item}
                          isSelected={selectedMedia.has(item.id)}
                          onSelect={handleSelectItem}
                          onPreview={openDetailDialog}
                          formatFileSize={formatFileSize}
                          getFileTypeIcon={getFileTypeIcon}
                          actions={rowActions(item)}
                          index={index}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </GridItem>

            {/* 表尾分页 */}
            <GridItem
              areas={[12]}
              width={24}
              height={0.1}
              className="flex justify-between pl-10 pr-6"
            >
              <div className="flex items-center gap-2">
                <AutoTransition key={totalRecords} type="fade">
                  共 {totalRecords} 条
                </AutoTransition>
                <span>/</span>
                <AutoTransition key={page + "" + totalRecords} type="fade">
                  第 {(page - 1) * pageSize + 1}
                  {" - "}
                  {Math.min(page * pageSize, totalRecords)} 条
                </AutoTransition>
                <span>/</span>
                <div className="flex items-center gap-2">
                  <Select
                    value={pageSize}
                    onChange={(value) => {
                      setPageSize(Number(value));
                      setPage(1);
                    }}
                    options={[
                      { value: 10, label: "10 条/页" },
                      { value: 25, label: "25 条/页" },
                      { value: 50, label: "50 条/页" },
                      { value: 100, label: "100 条/页" },
                      { value: 250, label: "250 条/页" },
                      { value: 500, label: "500 条/页" },
                    ]}
                    size="sm"
                  />
                </div>
              </div>
              <div className="flex items-center">
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <Clickable
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 rounded transition-colors hover:bg-muted"
                      enableHoverScale={false}
                    >
                      <RiArrowLeftSLine />
                    </Clickable>

                    <span>
                      <AutoTransition key={page} type="fade">
                        第 {page} / {totalPages} 页
                      </AutoTransition>
                    </span>

                    <Clickable
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 rounded transition-colors hover:bg-muted"
                      enableHoverScale={false}
                    >
                      <RiArrowRightSLine />
                    </Clickable>
                  </div>
                )}
              </div>
            </GridItem>
          </>
        )}
      </AutoTransition>

      {/* 详情对话框 */}
      <MediaPreviewDialog
        open={detailDialogOpen}
        onClose={closeDetailDialog}
        media={mediaDetail || selectedMediaItem}
        loading={detailLoading}
      />

      {/* 编辑对话框 */}
      <Dialog
        open={editDialogOpen}
        onClose={closeEditDialog}
        title={`编辑文件 - ${selectedMediaItem?.originalName || ""}`}
        size="md"
      >
        <div className="px-6 py-6 space-y-6">
          <div>
            <Input
              label="显示名称"
              value={editForm.originalName}
              onChange={(e) =>
                handleEditFormChange("originalName", e.target.value)
              }
              size="sm"
              placeholder="输入显示名称"
            />
          </div>
          <div>
            <Input
              label="替代文本"
              value={editForm.altText}
              onChange={(e) => handleEditFormChange("altText", e.target.value)}
              size="sm"
              helperText="用于图片的 alt 属性，提升可访问性和 SEO"
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              size="sm"
              checked={editForm.inGallery}
              onCheckedChange={(checked) =>
                handleEditFormChange("inGallery", checked)
              }
            />
            <label className="text-sm font-medium">在图库中显示</label>
          </div>
          <div className="flex justify-end gap-4 pt-4 border-t border-foreground/10">
            <Button
              label="取消"
              variant="ghost"
              onClick={closeEditDialog}
              size="sm"
              disabled={isSubmitting}
            />
            <Button
              label="保存"
              variant="primary"
              onClick={handleEditSubmit}
              size="sm"
              loading={isSubmitting}
              loadingText="保存中..."
            />
          </div>
        </div>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        title="确认删除文件"
        description={
          selectedMediaItem
            ? `确定要删除文件 "${selectedMediaItem.originalName}" 吗？此操作不可撤销。`
            : ""
        }
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleDelete}
        variant="danger"
        loading={isSubmitting}
      />

      {/* 批量删除确认对话框 */}
      <AlertDialog
        open={batchDeleteDialogOpen}
        onClose={closeBatchDeleteDialog}
        title="确认批量删除"
        description={`确定要删除选中的 ${selectedMedia.size} 个文件吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleConfirmBatchDelete}
        variant="danger"
        loading={isSubmitting}
      />

      {/* 筛选 Dialog */}
      <Dialog
        open={filterDialogOpen}
        onClose={closeFilterDialog}
        title="筛选条件"
        size="md"
      >
        <div className="px-6 py-6 space-y-6">
          <div className="space-y-6">
            {filterConfig.map((config) => (
              <div key={config.key}>
                {config.type !== "input" && (
                  <label className="block text-sm font-medium text-foreground mb-3">
                    {config.label}
                  </label>
                )}
                {config.type === "checkboxGroup" && config.options && (
                  <div className="flex gap-4">
                    {config.options.map((option) => {
                      const currentValue = tempFilterValues[config.key];
                      const currentArray = Array.isArray(currentValue)
                        ? currentValue
                        : [];
                      return (
                        <Checkbox
                          key={option.value}
                          label={option.label}
                          checked={currentArray.includes(String(option.value))}
                          onChange={() =>
                            toggleCheckboxOption(
                              config.key,
                              String(option.value),
                            )
                          }
                        />
                      );
                    })}
                  </div>
                )}
                {config.type === "input" && (
                  <Input
                    label={config.label}
                    value={(tempFilterValues[config.key] as string) || ""}
                    onChange={(e) =>
                      updateTempFilterValue(config.key, e.target.value)
                    }
                    helperText={config.placeholder}
                    type={config.inputType || "text"}
                    size="sm"
                  />
                )}
                {config.type === "dateRange" && config.dateFields && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="开始时间"
                        type="datetime-local"
                        value={
                          ((
                            tempFilterValues[config.key] as
                              | {
                                  start?: string;
                                  end?: string;
                                }
                              | undefined
                          )?.start || "") as string
                        }
                        onChange={(e) => {
                          const currentValue = tempFilterValues[config.key] as
                            | { start?: string; end?: string }
                            | undefined;
                          updateTempFilterValue(config.key, {
                            start: e.target.value || undefined,
                            end: currentValue?.end,
                          });
                        }}
                        size="sm"
                      />
                    </div>
                    <div>
                      <Input
                        label="结束时间"
                        type="datetime-local"
                        value={
                          ((
                            tempFilterValues[config.key] as
                              | {
                                  start?: string;
                                  end?: string;
                                }
                              | undefined
                          )?.end || "") as string
                        }
                        onChange={(e) => {
                          const currentValue = tempFilterValues[config.key] as
                            | { start?: string; end?: string }
                            | undefined;
                          updateTempFilterValue(config.key, {
                            start: currentValue?.start,
                            end: e.target.value || undefined,
                          });
                        }}
                        size="sm"
                      />
                    </div>
                  </div>
                )}
                {config.type === "range" && config.rangeFields && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        label={config.placeholderMin || "最小值"}
                        type={config.inputType || "number"}
                        value={
                          ((
                            tempFilterValues[config.key] as
                              | {
                                  start?: string;
                                  end?: string;
                                }
                              | undefined
                          )?.start || "") as string
                        }
                        onChange={(e) => {
                          const currentValue = tempFilterValues[config.key] as
                            | { start?: string; end?: string }
                            | undefined;
                          updateTempFilterValue(config.key, {
                            start: e.target.value || undefined,
                            end: currentValue?.end,
                          });
                        }}
                        size="sm"
                      />
                    </div>
                    <div>
                      <Input
                        label={config.placeholderMax || "最大值"}
                        type={config.inputType || "number"}
                        value={
                          ((
                            tempFilterValues[config.key] as
                              | {
                                  start?: string;
                                  end?: string;
                                }
                              | undefined
                          )?.end || "") as string
                        }
                        onChange={(e) => {
                          const currentValue = tempFilterValues[config.key] as
                            | { start?: string; end?: string }
                            | undefined;
                          updateTempFilterValue(config.key, {
                            start: currentValue?.start,
                            end: e.target.value || undefined,
                          });
                        }}
                        size="sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-between pt-4 border-t border-foreground/10">
            <Button
              label="重置"
              variant="ghost"
              onClick={resetFilters}
              size="sm"
            />
            <div className="flex gap-4">
              <Button
                label="取消"
                variant="ghost"
                onClick={closeFilterDialog}
                size="sm"
              />
              <Button
                label="确认"
                variant="primary"
                onClick={applyFilters}
                size="sm"
              />
            </div>
          </div>
        </div>
      </Dialog>

      {/* 搜索 Dialog（移动端） */}
      <Dialog
        open={searchDialogOpen}
        onClose={() => setSearchDialogOpen(false)}
        title="搜索"
        size="sm"
      >
        <div className="px-6 py-6">
          <Input
            label="搜索关键词"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            helperText="搜索显示名称、原始文件名或替代文本..."
            type="text"
            size="md"
            autoFocus
          />
          <div className="flex justify-end gap-4 pt-6 border-t border-foreground/10 mt-6">
            <Button
              label="取消"
              variant="ghost"
              onClick={() => setSearchDialogOpen(false)}
              size="sm"
            />
            <Button
              label="搜索"
              variant="primary"
              onClick={() => setSearchDialogOpen(false)}
              size="sm"
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}

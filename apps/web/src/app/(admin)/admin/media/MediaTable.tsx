"use client";

import {
  getMediaList,
  getMediaDetail,
  updateMedia,
  deleteMedia,
} from "@/actions/media";
import GridTable, { FilterConfig, ActionButton } from "@/components/GridTable";
import { TableColumn } from "@/ui/Table";
import { useEffect, useState, useMemo, useCallback } from "react";
import type { MediaListItem, MediaDetail } from "@repo/shared-types/api/media";
import { useBroadcast } from "@/hooks/useBroadcast";
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
} from "@remixicon/react";
import MediaPreviewDialog from "./MediaPreviewDialog";
import { Input } from "@/ui/Input";
import { Switch } from "@/ui/Switch";
import { Button } from "@/ui/Button";
import { useToast } from "@/ui/Toast";
import Link from "@/components/Link";
import CMSImage from "@/components/CMSImage";

export default function MediaTable() {
  const toast = useToast();
  const [data, setData] = useState<MediaListItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValues, setFilterValues] = useState<
    Record<string, string | string[] | { start?: string; end?: string }>
  >({});
  const [selectedMedia, setSelectedMedia] = useState<(string | number)[]>([]);
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

  // 处理选中状态变化
  const handleSelectionChange = useCallback(
    (selectedKeys: (string | number)[]) => {
      setSelectedMedia(selectedKeys);
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
        ids: selectedMedia.map((id) =>
          typeof id === "number" ? id : Number(id),
        ),
      });

      if (result.success) {
        toast.success(`已删除 ${result.data?.deleted || 0} 个文件`);
        setSelectedMedia([]);
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

  // 处理行点击事件
  const handleRowClick = useCallback(
    (record: MediaListItem, index: number, event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      const isClickable =
        target.tagName === "A" ||
        target.tagName === "BUTTON" ||
        target.closest("a") ||
        target.closest("button") ||
        target.closest('[role="button"]') ||
        target.closest('[data-action-cell="true"]');

      if (!isClickable) {
        openDetailDialog(record);
      }
    },
    [openDetailDialog],
  );

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
          sortBy?: "id" | "createdAt" | "size" | "originalName";
          sortOrder?: "asc" | "desc";
          search?: string;
          mediaType?: "IMAGE" | "VIDEO" | "AUDIO" | "FILE";
          userUid?: number;
          sizeMin?: number;
          sizeMax?: number;
          inGallery?: boolean;
          isOptimized?: boolean;
          createdAtStart?: string;
          createdAtEnd?: string;
        } = {
          page,
          pageSize,
        };

        // 只在有有效的排序参数时才添加
        if (sortKey && sortOrder) {
          params.sortBy = sortKey as
            | "id"
            | "createdAt"
            | "size"
            | "originalName";
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
                  width={record.width}
                  height={record.height}
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
        title: "关联文章",
        dataIndex: "postsCount",
        align: "left",
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

  return (
    <>
      <GridTable
        title="媒体文件管理"
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
        onRowClick={handleRowClick}
        searchPlaceholder="搜索文件名或替代文本..."
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
        description={`确定要删除选中的 ${selectedMedia.length} 个文件吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleConfirmBatchDelete}
        variant="danger"
        loading={isSubmitting}
      />
    </>
  );
}

"use client";

import { getMediaList, updateMedia, deleteMedia } from "@/actions/media";
import GridTable, { FilterConfig } from "@/components/GridTable";
import { TableColumn } from "@/ui/Table";
import { useEffect, useState } from "react";
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
import Clickable from "@/ui/Clickable";
import MediaPreviewDialog from "./MediaPreviewDialog";
import { Input } from "@/ui/Input";
import { Switch } from "@/ui/Switch";
import Image from "next/image";

export default function MediaTable() {
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
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaListItem | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    originalName: "",
    altText: "",
    inGallery: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 处理排序变化
  const handleSortChange = (key: string, order: "asc" | "desc" | null) => {
    setSortKey(order ? key : null);
    setSortOrder(order);
    setPage(1); // 排序变化时重置到第一页
  };

  // 处理搜索变化
  const handleSearchChange = (search: string) => {
    // 只有当搜索内容真正变化时才更新状态和重置页码
    if (search !== searchQuery) {
      setSearchQuery(search);
      setPage(1); // 搜索变化时重置到第一页
    }
  };

  // 处理筛选变化
  const handleFilterChange = (
    filters: Record<
      string,
      string | string[] | { start?: string; end?: string }
    >,
  ) => {
    setFilterValues(filters);
    setPage(1); // 筛选变化时重置到第一页
  };

  // 筛选配置
  const filterConfig: FilterConfig[] = [
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
  ];

  // 打开详情对话框
  const openDetailDialog = (media: MediaListItem) => {
    setSelectedMedia(media);
    setDetailDialogOpen(true);
  };

  // 关闭详情对话框
  const closeDetailDialog = () => {
    setDetailDialogOpen(false);
    setSelectedMedia(null);
  };

  // 打开编辑对话框
  const openEditDialog = (media: MediaListItem) => {
    setSelectedMedia(media);
    setEditForm({
      originalName: media.originalName,
      altText: media.altText || "",
      inGallery: media.inGallery,
    });
    setEditDialogOpen(true);
  };

  // 关闭编辑对话框
  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedMedia(null);
    setEditForm({
      originalName: "",
      altText: "",
      inGallery: false,
    });
  };

  // 处理编辑提交
  const handleEditSubmit = async () => {
    if (!selectedMedia) return;

    setIsSubmitting(true);
    try {
      const result = await updateMedia({
        id: selectedMedia.id,
        originalName: editForm.originalName,
        altText: editForm.altText || null,
        inGallery: editForm.inGallery,
      });

      if (result.success) {
        closeEditDialog();
        setRefreshTrigger((prev) => prev + 1); // 触发刷新
      } else {
        alert(result.message || "更新失败");
      }
    } catch (error) {
      console.error("Update media error:", error);
      alert("更新失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 打开删除对话框
  const openDeleteDialog = (media: MediaListItem) => {
    setSelectedMedia(media);
    setDeleteDialogOpen(true);
  };

  // 关闭删除对话框
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setSelectedMedia(null);
  };

  // 处理单个删除
  const handleDelete = async () => {
    if (!selectedMedia) return;

    setIsSubmitting(true);
    try {
      const result = await deleteMedia({
        ids: [selectedMedia.id],
      });

      if (result.success) {
        closeDeleteDialog();
        setRefreshTrigger((prev) => prev + 1); // 触发刷新
      } else {
        alert(result.message || "删除失败");
      }
    } catch (error) {
      console.error("Delete media error:", error);
      alert("删除失败");
    } finally {
      setIsSubmitting(false);
    }
  };

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
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // 获取文件类型图标
  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case "IMAGE":
        return <RiImageLine size="1.2em" className="text-green-500" />;
      case "VIDEO":
        return <RiVideoLine size="1.2em" className="text-blue-500" />;
      case "AUDIO":
        return <RiMusicLine size="1.2em" className="text-purple-500" />;
      case "FILE":
        return <RiFileLine size="1.2em" className="text-gray-500" />;
      default:
        return <RiFileLine size="1.2em" className="text-gray-500" />;
    }
  };

  const columns: TableColumn<MediaListItem>[] = [
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
      align: "center",
      render: (value: unknown, record: MediaListItem) => {
        if (record.mediaType === "IMAGE") {
          return (
            <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
              <Image
                src={`/p/${record.imageId}`}
                alt={record.altText || record.originalName}
                width={48}
                height={48}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  target.parentElement!.innerHTML =
                    '<span class="text-muted-foreground">-</span>';
                }}
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
      sortable: true,
      render: (value: unknown) => {
        if (value && typeof value === "object" && "username" in value) {
          const user = value as {
            username: string;
            nickname?: string | null;
            uid: number;
          };
          return (
            <span className="text-sm">
              {user.nickname || user.username}
              <span className="text-muted-foreground ml-1">
                (UID: {user.uid})
              </span>
            </span>
          );
        }
        return <span className="text-muted-foreground">-</span>;
      },
    },
    {
      key: "inGallery",
      title: "图库",
      dataIndex: "inGallery",
      align: "center",
      sortable: true,
      render: (value: unknown) => {
        return (
          <span
            className={`px-2 py-1 rounded-full text-xs ${
              value
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400"
            }`}
          >
            {value ? "是" : "否"}
          </span>
        );
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
      key: "actions",
      title: "操作",
      dataIndex: "id",
      align: "center",
      render: (value: unknown, record: MediaListItem) => {
        return (
          <div className="flex items-center justify-center gap-2">
            <Clickable
              onClick={() => openDetailDialog(record)}
              className="text-primary hover:text-primary/80 text-sm"
            >
              <RiEyeLine size="1.1em" />
            </Clickable>
            <Clickable
              onClick={() => openEditDialog(record)}
              className="text-blue-500 hover:text-blue-600 text-sm"
            >
              <RiEditLine size="1.1em" />
            </Clickable>
            <Clickable
              onClick={() => openDeleteDialog(record)}
              className="text-red-500 hover:text-red-600 text-sm"
            >
              <RiDeleteBinLine size="1.1em" />
            </Clickable>
          </div>
        );
      },
    },
  ];

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
        onRowClick={(record) => openDetailDialog(record)}
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
      />

      {/* 详情对话框 */}
      {selectedMedia && (
        <MediaPreviewDialog
          open={detailDialogOpen}
          onClose={closeDetailDialog}
          media={selectedMedia as MediaDetail} // 类型转换
        />
      )}

      {/* 编辑对话框 */}
      <Dialog
        open={editDialogOpen}
        onClose={closeEditDialog}
        title={`编辑文件 - ${selectedMedia?.originalName || ""}`}
        size="md"
      >
        <div className="px-6 py-6 space-y-6">
          <div>
            <Input
              label="显示名称"
              value={editForm.originalName}
              onChange={(e) =>
                setEditForm({ ...editForm, originalName: e.target.value })
              }
              placeholder="输入显示名称"
            />
          </div>
          <div>
            <Input
              label="替代文本"
              value={editForm.altText}
              onChange={(e) =>
                setEditForm({ ...editForm, altText: e.target.value })
              }
              placeholder="输入替代文本（用于图片的alt属性）"
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={editForm.inGallery}
              onCheckedChange={(checked) =>
                setEditForm({ ...editForm, inGallery: checked })
              }
            />
            <label className="text-sm font-medium">在图库中显示</label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={closeEditDialog}
              className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
            >
              取消
            </button>
            <button
              onClick={handleEditSubmit}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        title="确认删除"
        description={`确定要删除文件 "${selectedMedia?.originalName}" 吗？此操作不可撤销。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleDelete}
        variant="danger"
      />
    </>
  );
}

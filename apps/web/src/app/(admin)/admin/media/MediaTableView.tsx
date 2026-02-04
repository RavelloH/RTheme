"use client";

import React, { useCallback, useMemo } from "react";
import {
  RiCheckLine,
  RiCloseLine,
  RiDeleteBinLine,
  RiEditLine,
  RiEyeLine,
} from "@remixicon/react";
import type { MediaListItem } from "@repo/shared-types/api/media";

import type { MediaTableViewProps } from "@/app/(admin)/admin/media/MediaTable.types";
import CMSImage from "@/components/ui/CMSImage";
import GridTable from "@/components/ui/GridTable";
import Link from "@/components/ui/Link";
import type { TableColumn } from "@/ui/Table";

/**
 * 媒体表格视图组件
 * 负责渲染表格布局的媒体列表，使用 GridTable 的分页功能
 */
export default function MediaTableView({
  // 数据
  data,
  loading,

  // 分页
  page,
  totalPages,
  totalRecords,
  pageSize,
  onPageChange,
  onPageSizeChange,

  // 操作回调
  onPreview,
  onEdit,
  onDelete,

  // 工具函数
  formatFileSize,
  getFileTypeIcon,

  // 视图切换
  viewModeToggle,

  // 排序
  onSortChange,

  // 搜索
  onSearchChange,

  // 筛选
  filterConfig,
  onFilterChange,

  // 批量操作
  batchActions,

  // 选中
  onSelectionChange,
}: MediaTableViewProps) {
  // 行操作按钮
  const rowActions = useCallback(
    (record: MediaListItem) => [
      {
        label: "查看详情",
        icon: <RiEyeLine size="1.1em" />,
        onClick: () => onPreview(record),
      },
      {
        label: "编辑",
        icon: <RiEditLine size="1.1em" />,
        onClick: () => onEdit(record),
      },
      {
        label: "删除",
        icon: <RiDeleteBinLine size="1.1em" />,
        onClick: () => onDelete(record),
        variant: "danger" as const,
      },
    ],
    [onPreview, onEdit, onDelete],
  );

  // 表格列定义
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
        render: (_value: unknown, record: MediaListItem) => {
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
        key: "size",
        title: "大小",
        dataIndex: "size",
        align: "right",
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
        mono: true,
        align: "center",
        render: (_value: unknown, record: MediaListItem) => {
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
        align: "center",
        render: (_value: unknown, record: MediaListItem) => {
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
        align: "center",
        sortable: true,
        render: (value: unknown) => {
          return value ? (
            <span className="text-success flex items-center justify-center">
              <RiCheckLine size="1.5em" />
            </span>
          ) : (
            <span className="text-muted-foreground flex items-center justify-center">
              <RiCloseLine size="1.5em" />
            </span>
          );
        },
      },
      {
        key: "createdAt",
        title: "上传时间",
        dataIndex: "createdAt",
        align: "center",
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
        align: "center",
        sortable: true,
        render: (value: unknown) => {
          const count = Number(value) || 0;
          return (
            <span
              className={count > 0 ? "text-primary" : "text-muted-foreground"}
            >
              {count}
            </span>
          );
        },
      },
    ],
    [formatFileSize, getFileTypeIcon],
  );

  return (
    <GridTable<MediaListItem>
      title={
        <div className="flex items-center gap-4">
          <span>媒体文件管理</span>
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
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onSortChange={onSortChange}
      onSearchChange={onSearchChange}
      onRowClick={(record) => onPreview(record)}
      searchPlaceholder="搜索显示名称、原始文件名或替代文本..."
      filterConfig={filterConfig}
      onFilterChange={onFilterChange}
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
      onSelectionChange={onSelectionChange}
    />
  );
}

"use client";

import React, { useCallback, useEffect, useState } from "react";
import GridTable, {
  type FilterConfig,
  type ActionButton,
} from "@/components/GridTable";
import { TableColumn } from "@/ui/Table";
import {
  getCommentsAdmin,
  updateCommentStatus,
  deleteComments,
} from "@/actions/comment";
import type {
  AdminCommentItem,
  CommentStatus,
} from "@repo/shared-types/api/comment";
import runWithAuth, { resolveApiResponse } from "@/lib/client/runWithAuth";
import { useToast } from "@/ui/Toast";
import {
  RiCheckLine,
  RiCloseLine,
  RiAlertLine,
  RiDeleteBinLine,
} from "@remixicon/react";
import Link from "@/components/Link";
import { Dialog } from "@/ui/Dialog";
import { useBroadcast } from "@/hooks/useBroadcast";

const statusLabels: Record<CommentStatus, string> = {
  APPROVED: "已通过",
  PENDING: "待审核",
  REJECTED: "已拒绝",
  SPAM: "垃圾",
};

type SortKey = "createdAt" | "status" | "id" | "postSlug";
type AdminCommentRow = AdminCommentItem & { postTitle?: string | null };

export default function CommentsTable() {
  const [data, setData] = useState<AdminCommentRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterValues, setFilterValues] = useState<
    Record<string, string | string[] | { start?: string; end?: string }>
  >({});
  const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>([]);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] =
    useState<AdminCommentRow | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { success: toastSuccess, error: toastError } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const slugFilter =
        typeof filterValues.slug === "string" && filterValues.slug.trim()
          ? filterValues.slug.trim()
          : undefined;
      const rawUid =
        typeof filterValues.uid === "string" && filterValues.uid.trim()
          ? Number.parseInt(filterValues.uid, 10)
          : undefined;
      const uidFilter = Number.isNaN(rawUid ?? NaN) ? undefined : rawUid;

      const result = await runWithAuth(getCommentsAdmin, {
        page,
        pageSize,
        sortBy: sortKey || "createdAt",
        sortOrder: sortOrder || "desc",
        search: searchQuery.trim() || undefined,
        status: Array.isArray(filterValues.status)
          ? (filterValues.status as CommentStatus[])
          : undefined,
        slug: slugFilter,
        uid: uidFilter,
        parentOnly: Array.isArray(filterValues.parentOnly)
          ? (filterValues.parentOnly as string[]).includes("true")
          : undefined,
      } as never);
      const response = await resolveApiResponse(result);
      if (response?.success && Array.isArray(response.data)) {
        setData(response.data as AdminCommentRow[]);
        setTotalPages((response.meta?.totalPages as number) || 1);
        setTotalRecords((response.meta?.total as number) || 0);
      } else {
        toastError("获取评论列表失败", response?.message || "");
      }
    } catch (error) {
      console.error("获取评论列表失败", error);
      toastError("获取评论列表失败", "请稍后重试");
    } finally {
      setLoading(false);
    }
  }, [
    filterValues,
    page,
    pageSize,
    searchQuery,
    sortKey,
    sortOrder,
    toastError,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 通过 broadcast 通知刷新时，重新获取数据
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  useBroadcast<{ type: string }>((message) => {
    if (message.type === "comments-refresh") {
      setRefreshTrigger((prev) => prev + 1);
    }
  });

  const operateStatus = async (
    ids: (string | number)[],
    status: CommentStatus,
  ) => {
    if (!ids.length) return;
    try {
      const res = await runWithAuth(updateCommentStatus, {
        ids: ids.map(String),
        status,
      } as never);
      const parsed = await resolveApiResponse(res);
      if (parsed?.success) {
        toastSuccess("操作成功");
        fetchData();
      } else {
        toastError("操作失败", parsed?.message || "");
      }
    } catch (error) {
      console.error("更新评论状态失败", error);
      toastError("更新评论状态失败", "请稍后重试");
    }
  };

  const handleDelete = async (ids: (string | number)[]) => {
    if (!ids.length) return;
    try {
      const res = await runWithAuth(deleteComments, {
        ids: ids.map(String),
      } as never);
      const parsed = await resolveApiResponse(res);
      if (parsed?.success) {
        toastSuccess("删除成功");
        fetchData();
      } else {
        toastError("删除失败", parsed?.message || "");
      }
    } catch (error) {
      console.error("删除评论失败", error);
      toastError("删除评论失败", "请稍后重试");
    }
  };

  const columns: TableColumn<AdminCommentRow>[] = [
    {
      key: "author",
      title: "作者",
      render: (_, record) => (
        <div className="flex flex-col text-sm">
          <span className="font-semibold">
            {record.author.nickname ||
              record.author.username ||
              record.author.displayName}
          </span>
          {record.author.uid ? (
            <Link
              href={`/admin/users?uid=${record.author.uid}`}
              presets={["hover-underline"]}
              className="text-muted-foreground text-xs"
            >
              UID: {record.author.uid}
            </Link>
          ) : (
            record.email && (
              <span className="text-muted-foreground text-xs truncate max-w-[120px]">
                {record.email}
              </span>
            )
          )}
        </div>
      ),
    },
    {
      key: "content",
      title: "内容",
      render: (_, record) => (
        <div className="max-w-xl text-sm">
          {record.replyTo && (
            <span className="text-muted-foreground text-xs mr-1">
              回复 @{record.replyTo.authorName}:
            </span>
          )}
          {(record.depth ?? 0) > 0 && (
            <span className="text-muted-foreground/60 text-xs mr-1">
              [L{record.depth}]
            </span>
          )}
          <span className="line-clamp-2">{record.content}</span>
        </div>
      ),
    },
    {
      key: "status",
      title: "状态",
      sortable: true,
      render: (_, record) => (
        <span
          className={`text-xs ${
            record.status === "APPROVED"
              ? "text-green-600"
              : record.status === "PENDING"
                ? "text-orange-500"
                : record.status === "SPAM"
                  ? "text-gray-500"
                  : "text-red-500"
          }`}
        >
          {statusLabels[record.status]}
        </span>
      ),
    },
    {
      key: "replyCount",
      title: "回复",
      align: "center",
      render: (_, record) => (
        <span
          className={`text-xs ${record.replyCount > 0 ? "text-primary" : "text-muted-foreground"}`}
        >
          {record.replyCount}
        </span>
      ),
    },
    {
      key: "postSlug",
      title: "文章",
      sortable: true,
      render: (_, record) => (
        <div className="text-xs max-w-[160px]">
          <Link
            href={`/posts/${record.postSlug}`}
            target="_blank"
            presets={["hover-underline"]}
            title={record.postTitle || record.postSlug}
            className="line-clamp-1"
          >
            {record.postTitle || record.postSlug}
          </Link>
        </div>
      ),
    },
    {
      key: "ipAddress",
      title: "IP",
      align: "center",
      render: (_, record) => (
        <span className="text-xs text-muted-foreground font-mono">
          {record.ipAddress || "-"}
        </span>
      ),
    },
    {
      key: "createdAt",
      title: "时间",
      sortable: true,
      mono: true,
      render: (_, record) => (
        <span className="text-xs text-muted-foreground">
          {new Date(record.createdAt).toLocaleString("zh-CN")}
        </span>
      ),
    },
  ];

  const filterConfig: FilterConfig[] = [
    {
      key: "status",
      label: "状态",
      type: "checkboxGroup",
      options: [
        { label: "待审核", value: "PENDING" },
        { label: "已通过", value: "APPROVED" },
        { label: "已拒绝", value: "REJECTED" },
        { label: "垃圾", value: "SPAM" },
      ],
    },
    {
      key: "slug",
      label: "文章 Slug",
      type: "input",
      placeholder: "按文章筛选",
    },
    {
      key: "uid",
      label: "用户 UID",
      type: "input",
      inputType: "number",
      placeholder: "按用户筛选",
    },
    {
      key: "parentOnly",
      label: "评论层级",
      type: "checkboxGroup",
      options: [{ label: "仅顶级评论", value: "true" }],
    },
  ];

  const selectedIds = selectedKeys.map(String);

  const batchActions: ActionButton[] = [
    {
      label: "通过",
      icon: <RiCheckLine size="1.1em" />,
      onClick: () => operateStatus(selectedIds, "APPROVED"),
      disabled: !selectedKeys.length,
      variant: "ghost",
    },
    {
      label: "拒绝",
      icon: <RiCloseLine size="1.1em" />,
      onClick: () => operateStatus(selectedIds, "REJECTED"),
      disabled: !selectedKeys.length,
      variant: "ghost",
    },
    {
      label: "标记垃圾",
      icon: <RiAlertLine size="1.1em" />,
      onClick: () => operateStatus(selectedIds, "SPAM"),
      disabled: !selectedKeys.length,
      variant: "ghost",
    },
    {
      label: "删除",
      icon: <RiDeleteBinLine size="1.1em" />,
      onClick: () => handleDelete(selectedIds),
      disabled: !selectedKeys.length,
      variant: "danger",
    },
  ];

  const rowActions = (record: AdminCommentRow): ActionButton[] => [
    {
      label: "通过",
      icon: <RiCheckLine size="1.1em" />,
      onClick: () => operateStatus([record.id], "APPROVED"),
    },
    {
      label: "拒绝",
      icon: <RiCloseLine size="1.1em" />,
      onClick: () => operateStatus([record.id], "REJECTED"),
    },
    {
      label: "垃圾",
      icon: <RiAlertLine size="1.1em" />,
      onClick: () => operateStatus([record.id], "SPAM"),
    },
    {
      label: "删除",
      icon: <RiDeleteBinLine size="1.1em" />,
      variant: "danger",
      onClick: () => handleDelete([record.id]),
    },
  ];

  const openDetailDialog = (record: AdminCommentItem) => {
    setSelectedComment(record);
    setDetailDialogOpen(true);
  };

  const closeDetailDialog = () => {
    setDetailDialogOpen(false);
    setSelectedComment(null);
  };

  const handleRowClick = (
    record: AdminCommentRow,
    _index: number,
    event: React.MouseEvent,
  ) => {
    const target = event.target as HTMLElement;
    const isAction =
      target.tagName === "A" ||
      target.tagName === "BUTTON" ||
      target.closest("a") ||
      target.closest("button") ||
      target.closest('[role="button"]') ||
      target.closest('[data-action-cell="true"]');

    if (!isAction) {
      openDetailDialog(record);
    }
  };

  return (
    <>
      <GridTable
        title="评论列表"
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
        onSortChange={(key, order) => {
          setSortKey(order ? (key as SortKey) : "createdAt");
          setSortOrder(order || "desc");
          setPage(1);
        }}
        onSearchChange={(value) => {
          setPage(1);
          setSearchQuery(value);
        }}
        searchPlaceholder="搜索内容/作者/邮箱"
        filterConfig={filterConfig}
        onFilterChange={(values) => {
          setPage(1);
          setFilterValues(values);
        }}
        striped
        hoverable
        bordered={false}
        size="sm"
        stickyHeader
        maxHeight="100%"
        padding={2.5}
        enableActions
        batchActions={batchActions}
        rowActions={rowActions}
        onSelectionChange={(keys) => setSelectedKeys(keys)}
        onRowClick={handleRowClick}
        emptyText="暂无评论记录"
      />

      <Dialog
        open={detailDialogOpen}
        onClose={closeDetailDialog}
        title="评论详情"
        size="lg"
      >
        {selectedComment && (
          <div className="px-6 py-6 space-y-5 text-sm">
            {/* 父评论上下文 */}
            {selectedComment.replyTo && (
              <div className="text-muted-foreground border-l-2 border-primary/50 pl-3">
                回复{" "}
                <span className="font-medium text-foreground">
                  @{selectedComment.replyTo.authorName}
                </span>
                <span className="text-xs ml-2 font-mono">
                  ({selectedComment.replyTo.id})
                </span>
              </div>
            )}

            {/* 基本信息 */}
            <div className="space-y-2">
              <h3 className="font-medium text-foreground border-b border-border pb-1">
                基本信息
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2">
                <div>
                  <span className="text-muted-foreground">状态：</span>
                  <span
                    className={
                      selectedComment.status === "APPROVED"
                        ? "text-green-600"
                        : selectedComment.status === "PENDING"
                          ? "text-orange-500"
                          : selectedComment.status === "SPAM"
                            ? "text-gray-500"
                            : "text-red-500"
                    }
                  >
                    {statusLabels[selectedComment.status]}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">层级：</span>
                  <span>
                    {(selectedComment.depth ?? 0) === 0
                      ? "顶级评论"
                      : `L${selectedComment.depth}`}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">回复数：</span>
                  <span>{selectedComment.replyCount}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">时间：</span>
                  <span className="font-mono text-xs">
                    {new Date(selectedComment.createdAt).toLocaleString(
                      "zh-CN",
                    )}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">文章：</span>
                <Link
                  href={`/posts/${selectedComment.postSlug}`}
                  target="_blank"
                  presets={["hover-underline"]}
                  className="text-primary"
                >
                  {selectedComment.postTitle || selectedComment.postSlug}
                </Link>
              </div>
              {selectedComment.path && (
                <div>
                  <span className="text-muted-foreground">路径：</span>
                  <span className="font-mono text-xs break-all">
                    {selectedComment.path}
                  </span>
                </div>
              )}
            </div>

            {/* 作者信息 */}
            <div className="space-y-2">
              <h3 className="font-medium text-foreground border-b border-border pb-1">
                作者信息
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div>
                  <span className="text-muted-foreground">昵称：</span>
                  <span>{selectedComment.author.displayName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">UID：</span>
                  {selectedComment.author.uid ? (
                    <Link
                      href={`/admin/users?uid=${selectedComment.author.uid}`}
                      presets={["hover-underline"]}
                      className="text-primary"
                    >
                      {selectedComment.author.uid}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">匿名</span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">邮箱：</span>
                  <span>
                    {selectedComment.email || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">网站：</span>
                  {selectedComment.author.website ? (
                    <Link
                      href={selectedComment.author.website}
                      target="_blank"
                      presets={["hover-underline"]}
                      className="text-primary break-all"
                    >
                      {selectedComment.author.website}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">IP：</span>
                  <span className="font-mono text-xs">
                    {selectedComment.ipAddress || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">位置：</span>
                  <span>
                    {selectedComment.location || (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">UA：</span>
                <span className="font-mono text-xs break-all">
                  {selectedComment.userAgent || "-"}
                </span>
              </div>
            </div>

            {/* 评论内容 */}
            <div className="space-y-2">
              <h3 className="font-medium text-foreground border-b border-border pb-1">
                评论内容
              </h3>
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {selectedComment.content}
              </p>
            </div>

            {/* ID 信息 */}
            <div className="space-y-1 text-xs text-muted-foreground">
              <div>
                评论 ID: <span className="font-mono">{selectedComment.id}</span>
              </div>
              {selectedComment.parentId && (
                <div>
                  父评论 ID:{" "}
                  <span className="font-mono">{selectedComment.parentId}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

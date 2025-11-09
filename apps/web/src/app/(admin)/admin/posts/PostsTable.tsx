"use client";

import { getPostsList, updatePosts, deletePosts } from "@/actions/post";
import GridTable, { ActionButton } from "@/components/GridTable";
import { TableColumn } from "@/ui/Table";
import { useEffect, useState } from "react";
import type { PostListItem } from "@repo/shared-types/api/post";
import { useBroadcast } from "@/hooks/useBroadcast";
import {
  RiCheckLine,
  RiCloseLine,
  RiEditLine,
  RiDeleteBinLine,
  RiFileEditLine,
  RiPushpinLine,
  RiUnpinLine,
  RiBarChartBoxLine,
  RiHistoryLine,
  RiEyeLine,
  RiCodeSSlashLine,
} from "@remixicon/react";
import { Dialog } from "@/ui/Dialog";
import { Input } from "@/ui/Input";
import { Select, SelectOption } from "@/ui/Select";
import { Checkbox } from "@/ui/Checkbox";
import { Button } from "@/ui/Button";
import { AlertDialog } from "@/ui/AlertDialog";
import { useToast } from "@/ui/Toast";
import Link, { useNavigateWithTransition } from "@/components/Link";

export default function PostsTable() {
  const toast = useToast();
  const [data, setData] = useState<PostListItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedPosts, setSelectedPosts] = useState<(string | number)[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostListItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPost, setDeletingPost] = useState<PostListItem | null>(null);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [batchStatusDialogOpen, setBatchStatusDialogOpen] = useState(false);
  const [batchNewStatus, setBatchNewStatus] = useState("PUBLISHED");
  const [batchCommentsDialogOpen, setBatchCommentsDialogOpen] = useState(false);
  const [batchNewCommentsStatus, setBatchNewCommentsStatus] = useState(true);
  const [batchPinnedDialogOpen, setBatchPinnedDialogOpen] = useState(false);
  const [batchNewPinnedStatus, setBatchNewPinnedStatus] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigateWithTransition();
  const [userRole, setUserRole] = useState<string | null>(null);

  // 从 localStorage 读取用户角色
  useEffect(() => {
    try {
      const userInfo = localStorage.getItem("user_info");
      if (userInfo) {
        const parsed = JSON.parse(userInfo);
        setUserRole(parsed.role);
      }
    } catch (error) {
      console.error("Failed to parse user_info from localStorage:", error);
    }
  }, []);

  // 编辑文章状态
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    status: "PUBLISHED",
    isPinned: false,
    allowComments: true,
    robotsIndex: true,
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    featuredImage: "",
    postMode: "MARKDOWN" as "MARKDOWN" | "MDX",
  });

  // 处理选中状态变化
  const handleSelectionChange = (selectedKeys: (string | number)[]) => {
    setSelectedPosts(selectedKeys);
    console.log("选中的文章 ID:", selectedKeys);
  };

  // 打开编辑对话框
  const openEditDialog = (post: PostListItem) => {
    setEditingPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      status: post.status,
      isPinned: post.isPinned,
      allowComments: post.allowComments,
      robotsIndex: post.robotsIndex,
      metaTitle: post.metaTitle || "",
      metaDescription: post.metaDescription || "",
      metaKeywords: post.metaKeywords || "",
      featuredImage: post.featuredImage || "",
      postMode: post.postMode,
    });
    setEditDialogOpen(true);
  };

  // 关闭编辑对话框
  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingPost(null);
  };

  // 处理表单字段变化
  const handleFieldChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // 保存文章编辑
  const handleSavePost = async () => {
    if (!editingPost) return;

    setIsSubmitting(true);
    try {
      const updateData: {
        ids: number[];
        title?: string;
        slug?: string;
        excerpt?: string;
        status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
        isPinned?: boolean;
        allowComments?: boolean;
        featuredImage?: string;
        metaTitle?: string;
        metaDescription?: string;
        metaKeywords?: string;
        robotsIndex?: boolean;
        postMode?: "MARKDOWN" | "MDX";
      } = {
        ids: [editingPost.id],
      };

      if (formData.title !== editingPost.title) {
        updateData.title = formData.title;
      }
      if (formData.slug !== editingPost.slug) {
        updateData.slug = formData.slug;
      }
      if (formData.excerpt !== (editingPost.excerpt || "")) {
        updateData.excerpt = formData.excerpt;
      }
      if (formData.status !== editingPost.status) {
        updateData.status = formData.status as
          | "DRAFT"
          | "PUBLISHED"
          | "ARCHIVED";
      }
      if (formData.isPinned !== editingPost.isPinned) {
        updateData.isPinned = formData.isPinned;
      }
      if (formData.allowComments !== editingPost.allowComments) {
        updateData.allowComments = formData.allowComments;
      }
      if (formData.featuredImage !== (editingPost.featuredImage || "")) {
        updateData.featuredImage = formData.featuredImage;
      }
      if (formData.metaTitle !== (editingPost.metaTitle || "")) {
        updateData.metaTitle = formData.metaTitle;
      }
      if (formData.metaDescription !== (editingPost.metaDescription || "")) {
        updateData.metaDescription = formData.metaDescription;
      }
      if (formData.metaKeywords !== (editingPost.metaKeywords || "")) {
        updateData.metaKeywords = formData.metaKeywords;
      }
      if (formData.robotsIndex !== editingPost.robotsIndex) {
        updateData.robotsIndex = formData.robotsIndex;
      }
      if (formData.postMode !== editingPost.postMode) {
        updateData.postMode = formData.postMode;
      }

      if (Object.keys(updateData).length === 1) {
        toast.info("没有字段被修改");
        setIsSubmitting(false);
        return;
      }

      const result = await updatePosts(updateData);

      if (result.success) {
        toast.success(`文章 "${editingPost.title}" 已更新`);
        closeEditDialog();
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast.error(result.message || "未知错误");
      }
    } catch (error) {
      console.error("更新文章失败:", error);
      toast.error("请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 打开删除单个文章对话框
  const openDeleteDialog = (post: PostListItem) => {
    setDeletingPost(post);
    setDeleteDialogOpen(true);
  };

  // 关闭删除对话框
  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeletingPost(null);
  };

  // 确认删除单个文章
  const handleConfirmDelete = async () => {
    if (!deletingPost) return;

    setIsSubmitting(true);
    try {
      const result = await deletePosts({
        ids: [deletingPost.id],
      });

      if (result.success) {
        toast.success(`文章 "${deletingPost.title}" 已删除`);
        closeDeleteDialog();
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast.error(result.message || "未知错误");
      }
    } catch (error) {
      console.error("删除文章失败:", error);
      toast.error("请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 打开批量删除对话框
  const openBatchDeleteDialog = () => {
    setBatchDeleteDialogOpen(true);
  };

  // 关闭批量删除对话框
  const closeBatchDeleteDialog = () => {
    setBatchDeleteDialogOpen(false);
  };

  // 确认批量删除
  const handleConfirmBatchDelete = async () => {
    setIsSubmitting(true);
    try {
      const result = await deletePosts({
        ids: selectedPosts.map((id) => Number(id)),
      });

      if (result.success) {
        toast.success(`已删除 ${result.data?.deleted || 0} 篇文章`);
        closeBatchDeleteDialog();
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast.error(result.message || "未知错误");
      }
    } catch (error) {
      console.error("批量删除失败:", error);
      toast.error("请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 打开批量更改状态对话框
  const openBatchStatusDialog = () => {
    setBatchStatusDialogOpen(true);
  };

  // 关闭批量更改状态对话框
  const closeBatchStatusDialog = () => {
    setBatchStatusDialogOpen(false);
  };

  // 确认批量更改状态
  const handleConfirmBatchStatus = async () => {
    setIsSubmitting(true);
    try {
      const result = await updatePosts({
        ids: selectedPosts.map((id) => Number(id)),
        status: batchNewStatus as "DRAFT" | "PUBLISHED" | "ARCHIVED",
      });

      if (result.success) {
        toast.success(`已更新 ${result.data?.updated || 0} 篇文章的状态`);
        closeBatchStatusDialog();
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast.error(result.message || "未知错误");
      }
    } catch (error) {
      console.error("批量更改状态失败:", error);
      toast.error("请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 打开批量更改评论状态对话框
  const openBatchCommentsDialog = () => {
    setBatchCommentsDialogOpen(true);
  };

  // 关闭批量更改评论状态对话框
  const closeBatchCommentsDialog = () => {
    setBatchCommentsDialogOpen(false);
  };

  // 确认批量更改评论状态
  const handleConfirmBatchComments = async () => {
    setIsSubmitting(true);
    try {
      const result = await updatePosts({
        ids: selectedPosts.map((id) => Number(id)),
        allowComments: batchNewCommentsStatus,
      });

      if (result.success) {
        toast.success(
          `已${batchNewCommentsStatus ? "开启" : "关闭"} ${result.data?.updated || 0} 篇文章的评论功能`,
        );
        closeBatchCommentsDialog();
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast.error(result.message || "未知错误");
      }
    } catch (error) {
      console.error("批量更改评论状态失败:", error);
      toast.error("请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 打开批量更改置顶状态对话框
  const openBatchPinnedDialog = () => {
    setBatchPinnedDialogOpen(true);
  };

  // 关闭批量更改置顶状态对话框
  const closeBatchPinnedDialog = () => {
    setBatchPinnedDialogOpen(false);
  };

  // 确认批量更改置顶状态
  const handleConfirmBatchPinned = async () => {
    setIsSubmitting(true);
    try {
      const result = await updatePosts({
        ids: selectedPosts.map((id) => Number(id)),
        isPinned: batchNewPinnedStatus,
      });

      if (result.success) {
        toast.success(
          `已${batchNewPinnedStatus ? "置顶" : "取消置顶"} ${result.data?.updated || 0} 篇文章`,
        );
        closeBatchPinnedDialog();
        setRefreshTrigger((prev) => prev + 1);
      } else {
        toast.error(result.message || "未知错误");
      }
    } catch (error) {
      console.error("批量更改置顶状态失败:", error);
      toast.error("请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 批量操作按钮
  const batchActions: ActionButton[] = [
    {
      label: "更改状态",
      onClick: openBatchStatusDialog,
      icon: <RiFileEditLine size="1em" />,
      variant: "ghost",
    },
    {
      label: "评论设置",
      onClick: openBatchCommentsDialog,
      icon: <RiCheckLine size="1em" />,
      variant: "ghost",
    },
    {
      label: "置顶设置",
      onClick: openBatchPinnedDialog,
      icon: <RiPushpinLine size="1em" />,
      variant: "ghost",
    },
    {
      label: "删除",
      onClick: openBatchDeleteDialog,
      icon: <RiDeleteBinLine size="1em" />,
      variant: "danger",
    },
  ];

  // 行操作按钮
  const rowActions = (record: PostListItem): ActionButton[] => [
    {
      onClick: () => navigate(`/admin/posts/${record.slug}/preview`),
      icon: <RiEyeLine size="1em" />,
      variant: "ghost",
    },
    {
      onClick: () => navigate(`/admin/posts/${record.slug}/source`),
      icon: <RiCodeSSlashLine size="1em" />,
      variant: "ghost",
    },
    {
      onClick: () => navigate("/admin/posts/" + record.slug),
      icon: <RiFileEditLine size="1em" />,
      variant: "ghost",
    },
    {
      onClick: () => openEditDialog(record),
      icon: <RiEditLine size="1em" />,
      variant: "ghost",
    },
    {
      onClick: () => navigate("/admin/posts/" + record.slug + "/history"),
      icon: <RiHistoryLine size="1em" />,
      variant: "ghost",
    },
    {
      onClick: () => navigate("/admin/analytics?postId=" + record.slug),
      icon: <RiBarChartBoxLine size="1em" />,
      variant: "ghost",
    },
    {
      onClick: () => openDeleteDialog(record),
      icon: <RiDeleteBinLine size="1em" />,
      variant: "danger",
    },
  ];

  // 处理行点击事件
  const handleRowClick = (
    record: PostListItem,
    index: number,
    event: React.MouseEvent,
  ) => {
    // 检查点击目标，避免在点击链接、按钮或操作区时触发
    const target = event.target as HTMLElement;
    const isClickable =
      target.tagName === "A" ||
      target.tagName === "BUTTON" ||
      target.closest("a") ||
      target.closest("button") ||
      target.closest('[role="button"]') ||
      target.closest('[data-action-cell="true"]'); // 排除操作列和复选框列

    if (!isClickable) {
      openEditDialog(record);
    }
  };

  // 处理排序变化
  const handleSortChange = (key: string, order: "asc" | "desc" | null) => {
    setSortKey(order ? key : null);
    setSortOrder(order);
    setPage(1);
  };

  // 处理搜索变化
  const handleSearchChange = (search: string) => {
    setSearchQuery(search);
    setPage(1);
  };

  // 监听广播刷新消息
  useBroadcast<{ type: string }>(async (message) => {
    if (message.type === "posts-refresh") {
      setRefreshTrigger((prev) => prev + 1);
    }
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const params: {
          page: number;
          pageSize: number;
          sortBy?: "id" | "title" | "publishedAt" | "updatedAt" | "createdAt";
          sortOrder?: "asc" | "desc";
          search?: string;
        } = {
          page,
          pageSize,
        };

        if (sortKey && sortOrder) {
          params.sortBy = sortKey as
            | "id"
            | "title"
            | "publishedAt"
            | "updatedAt"
            | "createdAt";
          params.sortOrder = sortOrder;
        }

        if (searchQuery && searchQuery.trim()) {
          params.search = searchQuery.trim();
        }

        const result = await getPostsList({
          ...params,
          sortBy: params.sortBy || "id",
          sortOrder: params.sortOrder || "desc",
        });

        if (result.success && result.data) {
          setData(result.data);
          setTotalRecords(result.meta?.total || 0);
          if (result.meta) {
            setTotalPages(result.meta.totalPages);
          }
        }
      } catch (error) {
        console.error("Failed to fetch posts list:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [page, pageSize, sortKey, sortOrder, searchQuery, refreshTrigger]);

  const columns: TableColumn<PostListItem>[] = [
    {
      key: "id",
      title: "ID",
      dataIndex: "id",
      align: "left",
      sortable: true,
      mono: true,
    },
    {
      key: "title",
      title: "标题",
      dataIndex: "title",
      align: "left",
      sortable: true,
      render: (value: unknown, record: PostListItem) => {
        return (
          <Link
            href={`/posts/${record.slug}`}
            className="truncate max-w-xs block"
            presets={["hover-underline"]}
            title={String(value)}
            target="_blank"
          >
            {String(value)}
          </Link>
        );
      },
    },
    {
      key: "author",
      title: "作者",
      dataIndex: "author",
      align: "left",
      render: (value: unknown, record: PostListItem) => {
        const author = record.author;
        return (
          <Link
            href={`/admin/users?search=${author.username}`}
            presets={["hover-underline"]}
            title={`@${author.username}`}
          >
            {author.nickname || `@${author.username}`}
          </Link>
        );
      },
    },
    {
      key: "categories",
      title: "分类",
      dataIndex: "categories",
      align: "center",
      render: (value: unknown) => {
        const categories = Array.isArray(value) ? value : [];
        return (
          <span className="text-sm truncate max-w-20 block">
            {categories.length > 0 ? categories.join(", ") : "-"}
          </span>
        );
      },
    },
    {
      key: "tags",
      title: "标签",
      dataIndex: "tags",
      align: "center",
      render: (value: unknown) => {
        const tags = Array.isArray(value) ? value : [];
        return (
          <span className="text-sm truncate max-w-20 block">
            {tags.length > 0 ? tags.join(", ") : "-"}
          </span>
        );
      },
    },
    {
      key: "status",
      title: "状态",
      dataIndex: "status",
      align: "center",
      render: (value: unknown) => {
        const status = String(value);
        const colorClass =
          status === "PUBLISHED"
            ? "bg-success/20 text-success"
            : status === "DRAFT"
              ? "bg-warning/20 text-warning"
              : "bg-muted/20 text-muted-foreground";
        const statusText =
          status === "PUBLISHED"
            ? "已发布"
            : status === "DRAFT"
              ? "草稿"
              : "已归档";
        return (
          <span
            className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${colorClass}`}
          >
            {statusText}
          </span>
        );
      },
    },
    {
      key: "isPinned",
      title: "置顶",
      dataIndex: "isPinned",
      align: "center",
      render: (value: unknown) => {
        return value === true ? (
          <span className="flex justify-center text-primary">
            <RiPushpinLine size="1.3em" />
          </span>
        ) : (
          <span className="flex justify-center">
            <RiUnpinLine size="1.3em" className="text-muted-foreground" />
          </span>
        );
      },
    },
    {
      key: "allowComments",
      title: "评论",
      dataIndex: "allowComments",
      align: "center",
      render: (value: unknown) => {
        return value === true ? (
          <span className="flex justify-center">
            <RiCheckLine size="1.5em" />
          </span>
        ) : (
          <span className="flex justify-center">
            <RiCloseLine size="1.5em" className="text-muted-foreground" />
          </span>
        );
      },
    },
    {
      key: "publishedAt",
      title: "发布时间",
      dataIndex: "publishedAt",
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
      key: "updatedAt",
      title: "更新时间",
      dataIndex: "updatedAt",
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
  ];

  const statusOptions: SelectOption[] = [
    { value: "PUBLISHED", label: "已发布" },
    { value: "DRAFT", label: "草稿" },
    { value: "ARCHIVED", label: "已归档" },
  ];

  const postModeOptions: SelectOption[] = [
    { value: "MARKDOWN", label: "Markdown" },
    { value: "MDX", label: "MDX" },
  ];

  return (
    <>
      <GridTable
        title={userRole === "AUTHOR" ? "我的文章" : "文章列表"}
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
        searchPlaceholder="搜索标题、Slug 或摘要..."
        striped
        hoverable
        bordered={false}
        size="sm"
        emptyText="暂无文章记录"
        stickyHeader
        maxHeight="100%"
        padding={2.5}
        enableActions={true}
        batchActions={batchActions}
        rowActions={rowActions}
        onSelectionChange={handleSelectionChange}
        onRowClick={handleRowClick}
      />

      {/* 编辑文章对话框 */}
      <Dialog
        open={editDialogOpen}
        onClose={closeEditDialog}
        title={`快速编辑 - ${editingPost?.title || ""}`}
        size="lg"
      >
        <div className="px-6 py-6 space-y-6">
          {/* 基本信息 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
              基本信息
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <Input
                label="标题"
                value={formData.title}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                required
                size="sm"
              />
              <Input
                label="Slug"
                value={formData.slug}
                onChange={(e) => handleFieldChange("slug", e.target.value)}
                required
                size="sm"
              />
              <p className="text-sm text-muted-foreground">
                更改 Slug 可能会影响搜索引擎收录和已有的外部链接，请谨慎修改。
              </p>
              <Input
                label="摘要"
                value={formData.excerpt}
                onChange={(e) => handleFieldChange("excerpt", e.target.value)}
                rows={3}
                size="sm"
              />
            </div>
          </div>

          {/* 发布设置 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
              发布设置
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-foreground mb-2">
                  状态
                </label>
                <Select
                  value={formData.status}
                  onChange={(value) =>
                    handleFieldChange("status", value as string)
                  }
                  options={statusOptions}
                  size="sm"
                />
                <p className="text-sm text-muted-foreground mt-4">
                  已发布：文章将在前台显示 <br />
                  草稿：文章仅后台可见，不会公开 <br />
                  已归档：文章不会显示在文章列表中，但仍可正常访问
                </p>
              </div>
              <div>
                <label className="block text-sm text-foreground mb-2">
                  编辑器模式
                </label>
                <Select
                  value={formData.postMode}
                  onChange={(value) =>
                    handleFieldChange("postMode", value as string)
                  }
                  options={postModeOptions}
                  size="sm"
                />
                <p className="text-sm text-muted-foreground mt-4">
                  Markdown：标准 Markdown 格式 <br />
                  MDX：支持在 Markdown 中使用 React 组件
                </p>
              </div>
              <div className="space-y-3 flex flex-col justify-center">
                <Checkbox
                  label="置顶文章"
                  checked={formData.isPinned}
                  onChange={(e) =>
                    handleFieldChange("isPinned", e.target.checked)
                  }
                />
                <Checkbox
                  label="允许评论"
                  checked={formData.allowComments}
                  onChange={(e) =>
                    handleFieldChange("allowComments", e.target.checked)
                  }
                />
              </div>
            </div>
          </div>

          {/* SEO 设置 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
              SEO 设置
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <Input
                label="SEO 标题"
                value={formData.metaTitle}
                onChange={(e) => handleFieldChange("metaTitle", e.target.value)}
                size="sm"
                helperText="留空则使用文章标题"
              />
              <Input
                label="SEO 描述"
                value={formData.metaDescription}
                onChange={(e) =>
                  handleFieldChange("metaDescription", e.target.value)
                }
                rows={2}
                size="sm"
                helperText="留空则使用文章摘要"
              />
              <Input
                label="SEO 关键词"
                value={formData.metaKeywords}
                onChange={(e) =>
                  handleFieldChange("metaKeywords", e.target.value)
                }
                size="sm"
                helperText="多个关键词用逗号分隔"
              />
              <Checkbox
                label="允许搜索引擎索引"
                checked={formData.robotsIndex}
                onChange={(e) =>
                  handleFieldChange("robotsIndex", e.target.checked)
                }
              />
            </div>
          </div>

          {/* 特色图片 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
              特色图片
            </h3>
            <Input
              label="特色图片 URL"
              value={formData.featuredImage}
              onChange={(e) =>
                handleFieldChange("featuredImage", e.target.value)
              }
              size="sm"
              helperText="https://example.com/image.jpg"
            />
          </div>

          {/* 操作按钮 */}
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
              onClick={handleSavePost}
              size="sm"
              loading={isSubmitting}
              loadingText="保存中..."
            />
          </div>
        </div>
      </Dialog>

      {/* 批量更改状态对话框 */}
      <Dialog
        open={batchStatusDialogOpen}
        onClose={closeBatchStatusDialog}
        title="批量更改状态"
        size="sm"
      >
        <div className="px-6 py-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            将为选中的 {selectedPosts.length} 篇文章更改状态
          </p>
          <div>
            <label className="block text-sm text-foreground mb-2">新状态</label>
            <Select
              value={batchNewStatus}
              onChange={(value) => setBatchNewStatus(value as string)}
              options={statusOptions}
              size="sm"
              direcation="down"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            已发布：文章将在前台显示 <br />
            草稿：文章仅后台可见，不会公开 <br />
            已归档：文章不会显示在文章列表中，但仍可正常访问
          </p>
          <div className="flex justify-end gap-4 pt-4 border-t border-foreground/10">
            <Button
              label="取消"
              variant="ghost"
              onClick={closeBatchStatusDialog}
              size="sm"
              disabled={isSubmitting}
            />
            <Button
              label="确认"
              variant="primary"
              onClick={handleConfirmBatchStatus}
              size="sm"
              loading={isSubmitting}
              loadingText="更新中..."
            />
          </div>
        </div>
      </Dialog>

      {/* 删除单个文章确认对话框 */}
      <AlertDialog
        open={deleteDialogOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
        title="确认删除文章"
        description={
          deletingPost ? `确定要删除文章 "${deletingPost.title}" 吗？` : ""
        }
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        loading={isSubmitting}
      />

      {/* 批量删除确认对话框 */}
      <AlertDialog
        open={batchDeleteDialogOpen}
        onClose={closeBatchDeleteDialog}
        onConfirm={handleConfirmBatchDelete}
        title="确认批量删除"
        description={`确定要删除选中的 ${selectedPosts.length} 篇文章吗？`}
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        loading={isSubmitting}
      />

      {/* 批量更改评论状态对话框 */}
      <Dialog
        open={batchCommentsDialogOpen}
        onClose={closeBatchCommentsDialog}
        title="批量更改评论状态"
        size="sm"
      >
        <div className="px-6 py-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            将为选中的 {selectedPosts.length} 篇文章更改评论状态
          </p>
          <div>
            <label className="block text-sm text-foreground mb-2">
              评论状态
            </label>
            <Select
              value={batchNewCommentsStatus ? "true" : "false"}
              onChange={(value) => setBatchNewCommentsStatus(value === "true")}
              options={[
                { value: "true", label: "允许评论" },
                { value: "false", label: "禁止评论" },
              ]}
              size="sm"
              direcation="down"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            允许评论：用户可以对文章发表评论 <br />
            禁止评论：文章将不显示评论区
          </p>
          <div className="flex justify-end gap-4 pt-4 border-t border-foreground/10">
            <Button
              label="取消"
              variant="ghost"
              onClick={closeBatchCommentsDialog}
              size="sm"
              disabled={isSubmitting}
            />
            <Button
              label="确认"
              variant="primary"
              onClick={handleConfirmBatchComments}
              size="sm"
              loading={isSubmitting}
              loadingText="更新中..."
            />
          </div>
        </div>
      </Dialog>

      {/* 批量更改置顶状态对话框 */}
      <Dialog
        open={batchPinnedDialogOpen}
        onClose={closeBatchPinnedDialog}
        title="批量更改置顶状态"
        size="sm"
      >
        <div className="px-6 py-6 space-y-6">
          <p className="text-sm text-muted-foreground">
            将为选中的 {selectedPosts.length} 篇文章更改置顶状态
          </p>
          <div>
            <label className="block text-sm text-foreground mb-2">
              置顶状态
            </label>
            <Select
              value={batchNewPinnedStatus ? "true" : "false"}
              onChange={(value) => setBatchNewPinnedStatus(value === "true")}
              options={[
                { value: "true", label: "置顶" },
                { value: "false", label: "取消置顶" },
              ]}
              size="sm"
              direcation="down"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            置顶：文章将显示在列表顶部 <br />
            取消置顶：文章按正常顺序排列
          </p>
          <div className="flex justify-end gap-4 pt-4 border-t border-foreground/10">
            <Button
              label="取消"
              variant="ghost"
              onClick={closeBatchPinnedDialog}
              size="sm"
              disabled={isSubmitting}
            />
            <Button
              label="确认"
              variant="primary"
              onClick={handleConfirmBatchPinned}
              size="sm"
              loading={isSubmitting}
              loadingText="更新中..."
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}

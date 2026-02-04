/**
 * 媒体表格共享类型定义
 */
import type { MediaDetail, MediaListItem } from "@repo/shared-types/api/media";

import type { FolderItem } from "@/actions/media";
import type { FilterConfig } from "@/components/ui/GridTable";

// 行操作按钮类型
export interface RowAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "danger" | "ghost" | "outline";
}

// 面包屑导航项
export interface BreadcrumbItem {
  id: number | null;
  name: string;
}

// 选中项类型
export interface SelectedItems {
  mediaIds: Set<number>;
  folderIds: Set<number>;
}

// 共享的 Props 类型 - 用于视图组件
export interface MediaViewProps {
  // 数据
  data: MediaListItem[];
  folders: FolderItem[];
  loading: boolean;
  hasMore: boolean;

  // 选中状态
  selectedItems: SelectedItems;
  onSelectMedia: (id: number, checked: boolean) => void;
  onSelectFolder: (id: number, checked: boolean) => void;

  // 操作回调
  onPreview: (media: MediaListItem) => void;
  onEdit: (media: MediaListItem) => void;
  onDelete: (media: MediaListItem) => void;
  onEnterFolder: (folderId: number) => void;

  // 加载更多
  onLoadMore: () => void;

  // 工具函数
  formatFileSize: (bytes: number) => string;
  getFileTypeIcon: (type: string) => React.ReactNode;

  // 用户信息
  currentUserId: number;
  isMobile: boolean;
}

// 网格视图额外 Props
export interface MediaGridViewProps extends MediaViewProps {
  // 视图切换
  viewModeToggle: React.ReactNode;

  // 搜索
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  onOpenSearchDialog: () => void;

  // 筛选
  hasActiveFilters: boolean;
  onOpenFilterDialog: () => void;

  // 批量操作
  batchActions: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: "primary" | "danger" | "ghost" | "outline";
    disabled?: boolean;
    loading?: boolean;
  }>;

  // 面包屑导航
  currentFolderId: number | null;
  breadcrumbItems: BreadcrumbItem[];
  onNavigateToBreadcrumb: (index: number) => void;
  onGoBack: () => void;

  // 新建文件夹
  onCreateFolder: (name: string) => Promise<boolean>;
  createFolderLoading: boolean;
}

// 表格视图额外 Props
// 表格视图使用 GridTable 的内置选择和分页系统
export interface MediaTableViewProps {
  // 数据
  data: MediaListItem[];
  loading: boolean;

  // 分页
  page: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;

  // 操作回调
  onPreview: (media: MediaListItem) => void;
  onEdit: (media: MediaListItem) => void;
  onDelete: (media: MediaListItem) => void;

  // 工具函数
  formatFileSize: (bytes: number) => string;
  getFileTypeIcon: (type: string) => React.ReactNode;

  // GridTable 需要的额外属性
  viewModeToggle: React.ReactNode;

  // 排序
  onSortChange: (key: string, order: "asc" | "desc" | null) => void;

  // 搜索
  onSearchChange: (search: string) => void;

  // 筛选
  filterConfig: FilterConfig[];
  onFilterChange: (
    filters: Record<
      string,
      string | string[] | { start?: string; end?: string }
    >,
  ) => void;

  // 批量操作
  batchActions: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: "primary" | "danger" | "ghost" | "outline";
    disabled?: boolean;
    loading?: boolean;
  }>;

  // 选中
  onSelectionChange: (selectedKeys: (string | number)[]) => void;
}

// 对话框状态类型
export interface DialogState {
  detailDialogOpen: boolean;
  editDialogOpen: boolean;
  deleteDialogOpen: boolean;
  batchDeleteDialogOpen: boolean;
  searchDialogOpen: boolean;
  filterDialogOpen: boolean;
}

// 媒体详情加载状态
export interface MediaDetailState {
  selectedMediaItem: MediaListItem | null;
  mediaDetail: MediaDetail | null;
  detailLoading: boolean;
}

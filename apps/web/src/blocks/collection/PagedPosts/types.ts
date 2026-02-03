import type { BaseBlockConfig } from "@/blocks/core/types/base";
import type { ProcessedImageData } from "@/lib/shared/image-common";

export interface PagedPostsBlockContent {
  filterBy: "all" | "tag" | "category"; // 筛选类型，"all" 表示不筛选
  sortBy?: string; // 排序方式
  pageSize?: number; // 每页数量
  searchable?: boolean; // 是否启用搜索功能
}

export interface PagedPostsBlockConfig extends BaseBlockConfig {
  block: "paged-posts";
  content: PagedPostsBlockContent;
}

export interface PostItem {
  title: string;
  slug: string;
  excerpt: string | null;
  isPinned: boolean;
  publishedAt: Date | null;
  categories: Array<{ name: string; slug: string }>;
  tags: Array<{ name: string; slug: string }>;
  coverData?: ProcessedImageData[];
}

export interface PagedPostsData {
  posts: PostItem[];
  totalPosts: number;
  currentPage: number;
  totalPages: number;
  basePath: string;
}

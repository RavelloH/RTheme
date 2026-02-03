import type { BaseBlockConfig } from "@/blocks/core/types/base";

export interface PaginationBlockContent {
  filterBy?: "all" | "tag" | "category"; // 筛选类型（用于计算 basePath）
}

export interface PaginationBlockConfig extends BaseBlockConfig {
  block: "pagination";
  content: PaginationBlockContent;
}

export interface PaginationData {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

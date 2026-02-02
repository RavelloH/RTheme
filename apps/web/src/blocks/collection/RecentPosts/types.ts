import type { BaseBlockConfig } from "@/blocks/core/types/base";
import type { ProcessedImageData } from "@/lib/shared/image-common";

export interface PostsBlockContent {
  layout?: { columns?: string };
  posts?: {
    sort?: "publishedAt_desc" | "publishedAt_asc" | "viewCount_desc";
    onlyWithCover?: boolean;
    showPinned?: boolean;
  };
  title?: {
    line1?: string;
    line2?: string;
  };
  footer?: {
    title?: string;
    description?: string;
    link?: string;
  };
  [key: string]: unknown;
}

export interface PostsData {
  displayPosts: Array<{
    title: string;
    slug: string;
    isPinned: boolean;
    publishedAt: string | Date | null;
    categories: { name: string; slug: string }[];
    tags: { name: string; slug: string }[];
    cover: ProcessedImageData[];
    excerpt?: string;
  }>;
  [key: string]: unknown;
}

export interface PostsBlockConfig extends BaseBlockConfig {
  block: "posts";
  content: PostsBlockContent;
  data?: unknown;
}

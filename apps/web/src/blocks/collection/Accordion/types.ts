import type { BaseBlockConfig } from "@/blocks/core/types/base";
import type { ProcessedImageData } from "@/lib/shared/image-common";

export interface AccordionBlockContent {
  title?: { value?: string };
  source?: "tags" | "categories" | "child-categories" | "posts"; // 数据来源
  layout?: {
    sortBy?: "name" | "count" | "recent";
  };
  limit?: number; // 显示数量，0 为全部显示
}

export interface AccordionBlockConfig extends BaseBlockConfig {
  block: "accordion";
  content: AccordionBlockContent;
}

export interface AccordionItem {
  slug: string;
  name: string;
  description: string | null;
  featuredImage: ProcessedImageData[] | null;
  postCount: number;
  projectCount: number;
}

export interface AccordionData {
  items: AccordionItem[];
  source: "tags" | "categories" | "child-categories" | "posts";
}

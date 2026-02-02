import type { BaseBlockConfig } from "@/blocks/core/types/base";

export interface TagsCategoriesBlockContent {
  footer?: {
    text?: string[];
  };
  [key: string]: unknown;
}

export interface TagsCategoriesBlockConfig extends BaseBlockConfig {
  block: "tags-categories";
  content: TagsCategoriesBlockContent;
}

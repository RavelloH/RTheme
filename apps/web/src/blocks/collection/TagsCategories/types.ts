import type { BaseBlockConfig } from "@/blocks/core/types/base";

export interface TagsCategoriesBlockContent {
  [key: string]: unknown;
}

export interface TagsCategoriesBlockConfig extends BaseBlockConfig {
  block: "tags-categories";
  content: TagsCategoriesBlockContent;
}

import type { BaseBlockConfig } from "@/blocks/types/base";

export interface TagsCategoriesBlockContent {
  [key: string]: unknown;
}

export interface TagsCategoriesBlockConfig extends BaseBlockConfig {
  block: "tags-categories";
  content: TagsCategoriesBlockContent;
}

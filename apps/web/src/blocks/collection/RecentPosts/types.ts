import type { BaseBlockConfig } from "@/blocks/core/types/base";

export interface PostsBlockContent {
  [key: string]: unknown;
}

export interface PostsBlockConfig extends BaseBlockConfig {
  block: "posts";
  content: PostsBlockContent;
}

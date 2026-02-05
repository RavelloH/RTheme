import type { BaseBlockConfig } from "@/blocks/core/types/base";

export interface QuoteBlockContent {
  /** 引用文本 */
  quote?: string;
  /** 作者 */
  author?: string;
  /** 来源（书名/文章名） */
  source?: string;
  /** 布局配置 */
  layout?: {
    /** 样式：classic / modern / minimal */
    style?: "classic" | "modern" | "minimal";
    /** 对齐：left / center */
    align?: "left" | "center";
    /** 宽高比 */
    ratio?: number;
  };
  [key: string]: unknown;
}

export interface QuoteBlockConfig extends BaseBlockConfig {
  block: "quote";
  content: QuoteBlockContent;
}

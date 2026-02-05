import type { BaseBlockConfig } from "@/blocks/core/types/base";

export interface DividerBlockContent {
  /** 样式：line / dotted / icon / text */
  style?: "line" | "dotted" | "icon" | "text";
  /** 分隔文字（当 style=text） */
  text?: string;
  /** 分隔图标（当 style=icon）：arrow / star / dot / diamond */
  icon?: "arrow" | "star" | "dot" | "diamond";
  /** 颜色：primary / muted / accent */
  color?: "primary" | "muted" | "accent" | "background";
  /** 背景颜色：background / primary */
  backgroundColor?: "background" | "primary";
  /** 布局配置 */
  layout?: {
    /** 宽度（0.05-0.3） */
    width?: number;
    /** 线条粗细（1-4） */
    thickness?: number;
  };
  [key: string]: unknown;
}

export interface DividerBlockConfig extends BaseBlockConfig {
  block: "divider";
  content: DividerBlockContent;
}

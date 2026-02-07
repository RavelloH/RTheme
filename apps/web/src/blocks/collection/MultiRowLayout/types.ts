import type { BaseBlockConfig } from "@/blocks/core/types/base";
import type { ProcessedImageData } from "@/lib/shared/image-common";

/** 单行配置 */
export interface RowConfig {
  /** 行类型 */
  type?: "text" | "image" | "marquee";
  /** 水平对齐 */
  horizontalAlign?: "left" | "center" | "right";
  /** 垂直对齐 */
  verticalAlign?: "top" | "center" | "bottom";
  /** 文字颜色 */
  textColor?: "default" | "muted" | "primary" | "background";
  /** 背景颜色 */
  backgroundColor?:
    | "default"
    | "muted"
    | "primary"
    | "secondary"
    | "transparent";
  /** 内边距 */
  padding?: "none" | "sm" | "md" | "lg" | "xl";
  /** 文字动画（仅文字类型） */
  textAnimation?: "none" | "fade" | "line-reveal" | "fade-word" | "fade-char";
  /** 内容（文字类型） */
  content?: string[];
  /** 背景图片（图片类型） */
  images?: string[];
  /** 标题（图片类型） */
  title?: string;
  /** 描述（图片类型） */
  description?: string;
  /** 跑马灯方向（跑马灯类型） */
  marqueeDirection?: "left" | "right";
  /** 跑马灯内容（跑马灯类型） */
  marqueeContent?: string;
  /** 跑马灯速度（跑马灯类型） */
  marqueeSpeed?: number;
}

export interface MultiRowLayoutBlockContent {
  /** 行数配置：1、2、3、4、6、12 */
  rowCount?: 1 | 2 | 3 | 4 | 6 | 12;
  /** 第1行（areas: 1-12 或 1-6） */
  row1?: RowConfig;
  /** 第2行（areas: 7-12 或 1-6） */
  row2?: RowConfig;
  /** 第3行（areas: 1-4） */
  row3?: RowConfig;
  /** 第4行（areas: 5-8） */
  row4?: RowConfig;
  /** 第5行（areas: 9-12） */
  row5?: RowConfig;
  /** 第6行（areas: 1-2） */
  row6?: RowConfig;
  /** 第7行（areas: 3-4） */
  row7?: RowConfig;
  /** 第8行（areas: 5-6） */
  row8?: RowConfig;
  /** 第9行（areas: 7-8） */
  row9?: RowConfig;
  /** 第10行（areas: 9-10） */
  row10?: RowConfig;
  /** 第11行（areas: 11-12） */
  row11?: RowConfig;
  /** 第12行（单个格子） */
  row12?: RowConfig;
  /** 整体布局配置 */
  layout?: {
    /** 宽高比 */
    ratio?: number;
    /** 行间距 */
    gap?: number;
  };
  [key: string]: unknown;
}

export interface MultiRowLayoutBlockConfig extends BaseBlockConfig {
  block: "multi-row-layout";
  content: MultiRowLayoutBlockContent;
}

export interface MultiRowLayoutData {
  /** 第1行处理后的图片 */
  row1?: ProcessedImageData[];
  /** 第2行处理后的图片 */
  row2?: ProcessedImageData[];
  /** 第3行处理后的图片 */
  row3?: ProcessedImageData[];
  /** 第4行处理后的图片 */
  row4?: ProcessedImageData[];
  /** 第5行处理后的图片 */
  row5?: ProcessedImageData[];
  /** 第6行处理后的图片 */
  row6?: ProcessedImageData[];
  /** 第7行处理后的图片 */
  row7?: ProcessedImageData[];
  /** 第8行处理后的图片 */
  row8?: ProcessedImageData[];
  /** 第9行处理后的图片 */
  row9?: ProcessedImageData[];
  /** 第10行处理后的图片 */
  row10?: ProcessedImageData[];
  /** 第11行处理后的图片 */
  row11?: ProcessedImageData[];
  /** 第12行处理后的图片 */
  row12?: ProcessedImageData[];
  /** 其他插值数据 */
  [key: string]: unknown;
}

import type { BaseBlockConfig } from "@/blocks/core/types/base";
import type { ProcessedImageData } from "@/lib/shared/image-common";

/** 连接模式类型 */
export type TimelineConnectionMode = "standalone" | "start" | "middle" | "end";

export interface TimelineItemBlockContent {
  /** 年份 */
  year?: string;
  /** 月日 */
  monthDay?: string;
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 图片 */
  image?: string;
  /** 链接 */
  link?: string;
  /** 布局配置 */
  layout?: {
    /** 宽高比 */
    ratio?: number;
    /** 交换时间与内容的位置 */
    swapPosition?: boolean;
    /** 未完成状态 */
    incomplete?: boolean;
    /** 连接模式：standalone(独立) / start(起始) / middle(连接) / end(终止) */
    connectionMode?: TimelineConnectionMode;
  };
  [key: string]: unknown;
}

export interface TimelineItemBlockConfig extends BaseBlockConfig {
  block: "timeline-item";
  content: TimelineItemBlockContent;
}

export interface TimelineItemData {
  /** 图片处理后的数据 */
  imageData?: ProcessedImageData;
  [key: string]: unknown;
}

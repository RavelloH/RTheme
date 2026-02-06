import type { BaseBlockConfig } from "@/blocks/core/types/base";
import type { ProcessedImageData } from "@/lib/shared/image-common";

export interface CTAButton {
  /** 按钮文本 */
  text?: string;
  /** 按钮链接 */
  link?: string;
}

export interface CallToActionBlockContent {
  /** 主标题 */
  title?: string;
  /** 副标题 */
  subtitle?: string;
  /** 描述文本（数组） */
  description?: string[];
  /** 主按钮 */
  primaryButton?: CTAButton;
  /** 次按钮 */
  secondaryButton?: CTAButton;
  /** 背景图 */
  backgroundImage?: string;
  /** 布局配置 */
  layout?: {
    /** 样式：minimal / bold / gradient */
    style?: "minimal" | "bold" | "gradient";
    /** 宽高比 */
    ratio?: number;
    /** 文字对齐 */
    align?: "left" | "center" | "right";
  };
  [key: string]: unknown;
}

export interface CallToActionBlockConfig extends BaseBlockConfig {
  block: "cta";
  content: CallToActionBlockContent;
}

export interface CallToActionData {
  /** 处理后的背景图数据 */
  backgroundImage?: ProcessedImageData;
  [key: string]: unknown;
}

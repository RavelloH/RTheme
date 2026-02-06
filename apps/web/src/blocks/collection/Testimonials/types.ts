import type { BaseBlockConfig } from "@/blocks/core/types/base";
import type { ProcessedImageData } from "@/lib/shared/image-common";

export interface TestimonialBlockContent {
  /** 评价内容 */
  quote?: string;
  /** 作者姓名 */
  author?: string;
  /** 职位/公司 */
  role?: string;
  /** 头像 */
  avatar?: string;
  /** 布局配置 */
  layout?: {
    /** 样式：cards / minimal / quote-focus */
    style?: "cards" | "minimal" | "quote-focus";
    /** 宽高比 */
    ratio?: number;
    /** 启用双行显示模式 */
    enableDualRow?: boolean;
    /** 卡片背景色 */
    background?: "muted" | "default";
  };
  /** 双行模式：第二个评价的内容 */
  quote2?: string;
  /** 双行模式：第二个作者姓名 */
  author2?: string;
  /** 双行模式：第二个职位/公司 */
  role2?: string;
  /** 双行模式：第二个头像 */
  avatar2?: string;
  [key: string]: unknown;
}

export interface TestimonialBlockConfig extends BaseBlockConfig {
  block: "testimonial";
  content: TestimonialBlockContent;
}

export interface TestimonialData {
  /** 头像处理后的数据 */
  avatarData?: ProcessedImageData;
  /** 双行模式：第二个头像处理后的数据 */
  avatar2Data?: ProcessedImageData;
  [key: string]: unknown;
}

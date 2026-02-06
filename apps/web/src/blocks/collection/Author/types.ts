import type { BaseBlockConfig } from "@/blocks/core/types/base";
import type { ProcessedImageData } from "@/lib/shared/image-common";

export interface SocialLinkItem {
  /** 平台类型 */
  platform?: string;
  /** 链接地址 */
  url?: string;
  /** 显示文本 */
  label?: string;
}

export interface AuthorBlockContent {
  /** 头像图片 */
  avatar?: string;
  /** 姓名 */
  name?: string;
  /** 职位/头衔 */
  title?: string;
  /** 简介（数组） */
  bio?: string[];
  /** 社交链接数组 */
  socialLinks?: SocialLinkItem[];
  /** 布局配置 */
  layout?: {
    /** 头像形状：circle / square / rounded */
    avatarShape?: "circle" | "square" | "rounded";
    /** 宽高比 */
    ratio?: number;
  };
  [key: string]: unknown;
}

export interface AuthorBlockConfig extends BaseBlockConfig {
  block: "author";
  content: AuthorBlockContent;
}

export interface AuthorData {
  /** 处理后的头像数据 */
  avatar?: ProcessedImageData;
  [key: string]: unknown;
}

import type { BaseBlockConfig } from "@/blocks/core/types/base";
import type { ProcessedImageData } from "@/lib/shared/image-common";

export interface GalleryBlockContent {
  /** 图片数组 */
  images?: string[];
  /** 布局配置 */
  layout?: {
    /** 样式：grid / masonry / carousel */
    style?: "grid" | "masonry" | "carousel";
    /** 间距 */
    gap?: number;
    /** 滤镜效果 */
    filter?: string;
    /** 视差速度，负值表示反向滚动，范围 -1 到 1 */
    parallaxSpeed?: number;
    /** 图片容器宽度比例，范围 0.1 到 1 */
    containerWidth?: number;
  };
  [key: string]: unknown;
}

export interface GalleryBlockConfig extends BaseBlockConfig {
  block: "gallery";
  content: GalleryBlockContent;
}

export interface GalleryData {
  /** 处理后的图片数据数组 */
  images?: ProcessedImageData[];
  [key: string]: unknown;
}

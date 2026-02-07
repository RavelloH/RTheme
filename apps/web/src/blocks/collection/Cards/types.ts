import type { BaseBlockConfig } from "@/blocks/core/types/base";
import type { ProcessedImageData } from "@/lib/shared/image-common";

export interface CardsBlockContent {
  /** 标题 */
  title?: string;
  /** 副标题 */
  subtitle?: string;
  /** 描述 */
  description?: string;
  /** 图片 URL（编辑器输入） */
  image?: string;
  /** 图标名称 */
  icon?: string;
  /** 链接 */
  link?: string;
  /** 链接文本（显示为按钮） */
  linkText?: string;
  /** 标签数组 */
  tags?: string[];
  /** 徽章文本（角标） */
  badge?: string;

  /** 图标设置 */
  iconSettings?: {
    /** 图标大小 */
    size?: "sm" | "md" | "lg" | "xl";
    /** 图标颜色 */
    color?: "primary" | "secondary" | "muted" | "inherit";
    /** 图标位置 */
    position?: "above-title" | "before-title" | "background";
    /** 图标背景 */
    background?: "none" | "circle" | "square" | "rounded";
  };

  /** 图片设置 */
  imageSettings?: {
    /** 图片适应方式 */
    objectFit?: "cover" | "contain" | "fill";
    /** 图片高度比例（图片在顶部时） */
    heightRatio?: "1/4" | "1/3" | "1/2" | "2/3" | "3/4";
    /** 图片滤镜 */
    filter?: "none" | "grayscale" | "sepia" | "contrast" | "brightness";
    /** 有图片时也显示图标 */
    showIconWithImage?: boolean;
    /** 图片叠加层 */
    overlay?:
      | "none"
      | "gradient-bottom"
      | "gradient-full"
      | "dark"
      | "light"
      | "blur"
      | "vignette";
  };

  /** 内容设置 */
  contentSettings?: {
    /** 水平对齐 */
    align?: "left" | "center" | "right";
    /** 垂直对齐 */
    verticalAlign?: "top" | "center" | "bottom";
    /** 内边距 */
    padding?: "none" | "sm" | "md" | "lg" | "xl";
    /** 标题大小 */
    titleSize?: "sm" | "md" | "lg" | "xl" | "2xl";
    /** 描述大小 */
    descriptionSize?: "xs" | "sm" | "md" | "lg";
  };

  /** 样式设置 */
  styleSettings?: {
    /** 圆角 */
    rounded?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
    /** 背景颜色 */
    bgColor?: "default" | "muted" | "primary" | "secondary" | "transparent";
    /** 悬停效果 */
    hoverEffect?: "none" | "lift" | "scale" | "glow";
  };

  /** 布局配置 */
  layout?: {
    /** 图片位置：top / left / right / background */
    imagePosition?: "top" | "left" | "right" | "background";
    /** 宽高比 */
    ratio?: number;
  };

  /** 动画设置 */
  animationSettings?: {
    /** 启用文字动画 */
    enableTextAnimation?: boolean;
  };

  [key: string]: unknown;
}

export interface CardsBlockConfig extends BaseBlockConfig {
  block: "cards";
  content: CardsBlockContent;
}

export interface CardsData {
  /** 处理后的图片数据（包含 width、height、blur） */
  image?: ProcessedImageData;
  [key: string]: unknown;
}

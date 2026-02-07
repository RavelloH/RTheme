import type { BaseBlockConfig } from "@/blocks/core/types/base";

/** 单个选项卡项（显式字段） */
export interface TabItem {
  /** 标签文本 */
  label?: string;
  /** 内容（数组，支持多行） */
  content?: string[];
}

/** 选项卡内容（显式 10 个字段） */
export interface TabContentField {
  /** 标签文本 */
  label?: string;
  /** 内容（数组，支持多行） */
  content?: string[];
}

export interface TabsBlockContent {
  /** 选项卡 1 */
  no1?: TabContentField;
  /** 选项卡 2 */
  no2?: TabContentField;
  /** 选项卡 3 */
  no3?: TabContentField;
  /** 选项卡 4 */
  no4?: TabContentField;
  /** 选项卡 5 */
  no5?: TabContentField;
  /** 选项卡 6 */
  no6?: TabContentField;
  /** 选项卡 7 */
  no7?: TabContentField;
  /** 选项卡 8 */
  no8?: TabContentField;
  /** 选项卡 9 */
  no9?: TabContentField;
  /** 选项卡 10 */
  no10?: TabContentField;
  /** 布局配置 */
  layout?: {
    /** 标签位置：top / left */
    tabPosition?: "top" | "left";
    /** 样式：underline / pills / bordered */
    style?: "underline" | "pills" | "bordered";
    /** 宽高比 */
    ratio?: number;
    /** 内容水平对齐 */
    contentAlign?: "left" | "center" | "right";
    /** 内容垂直对齐 */
    contentVerticalAlign?: "top" | "center" | "bottom";
    /** 标签栏居中 */
    tabsCentered?: boolean;
  };
  [key: string]: unknown;
}

export interface TabsBlockConfig extends BaseBlockConfig {
  block: "tabs";
  content: TabsBlockContent;
}

export interface TabsData {
  [key: string]: unknown;
}

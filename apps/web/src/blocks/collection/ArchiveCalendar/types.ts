import type { BaseBlockConfig } from "@/blocks/core/types/base";

export interface MonthData {
  month: number;
  count: number;
}

export interface DayData {
  date: string; // YYYY-MM-DD 格式
  count: number;
}

export interface YearData {
  year: number;
  months: MonthData[];
  days: DayData[]; // 全年每一天的数据
  total: number;
}

export interface ArchiveCalendarBlockContent {
  /** 数据源：posts / custom */
  dataSource?: "posts" | "custom";
  /** 显示年份数量 */
  years?: number;
  /** 布局配置 */
  layout?: {
    /** 样式：calendar / heatmap / list */
    style?: "calendar" | "heatmap" | "list";
    /** 显示统计 */
    showStats?: boolean;
    /** 单年宽高比 */
    ratio?: number;
  };
  [key: string]: unknown;
}

export interface ArchiveCalendarBlockConfig extends BaseBlockConfig {
  block: "archive-calendar";
  content: ArchiveCalendarBlockContent;
}

export interface ArchiveCalendarData {
  archiveData?: YearData[];
  [key: string]: unknown;
}

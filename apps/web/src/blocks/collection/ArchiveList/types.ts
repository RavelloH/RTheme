import type { BaseBlockConfig } from "@/blocks/core/types/base";

export type ArchiveListSortMode = "publishedAt_desc" | "publishedAt_asc";
export type ArchiveListLayoutMode = "vertical" | "horizontal";

export interface ArchiveListBlockContent {
  dataSource?: "posts";
  sort?: ArchiveListSortMode;
  layout?: {
    mode?: ArchiveListLayoutMode;
  };
  [key: string]: unknown;
}

export interface ArchiveListItem {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  year: number;
  month: number;
  day: number;
  monthDay: string;
  yearMonthKey: string;
}

export interface ArchiveListMonthGroup {
  key: string;
  year: number;
  month: number;
  label: string;
  items: ArchiveListItem[];
}

export interface ArchiveListData {
  items: ArchiveListItem[];
  monthGroups: ArchiveListMonthGroup[];
  [key: string]: unknown;
}

export interface ArchiveListBlockConfig extends BaseBlockConfig {
  block: "archive-list";
  content: ArchiveListBlockContent;
}

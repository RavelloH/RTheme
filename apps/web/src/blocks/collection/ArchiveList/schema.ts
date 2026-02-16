import type { BlockFormConfig } from "@/blocks/core/types/field-config";

export const ARCHIVE_LIST_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "archive-list",
  displayName: "归档列表",
  description: "按月份列或横向时间线展示文章归档。",
  author: {
    name: "RavelloH",
    url: "https://ravelloh.com",
  },
  theme: {
    name: "neutral",
    url: "https://neutralpress.net",
  },
  actions: {
    db: 1,
    config: 0,
  },
  fields: [
    {
      label: "数据源",
      path: "dataSource",
      type: "select",
      options: [{ label: "文章", value: "posts" }],
      defaultValue: "posts",
    },
    {
      label: "排序",
      path: "sort",
      type: "select",
      options: [
        { label: "最新优先", value: "publishedAt_desc" },
        { label: "最早优先", value: "publishedAt_asc" },
      ],
      defaultValue: "publishedAt_desc",
    },
    {
      label: "排列方式",
      path: "layout.mode",
      type: "select",
      options: [
        { label: "竖向排列", value: "vertical" },
        { label: "横向排列", value: "horizontal" },
      ],
      defaultValue: "vertical",
    },
  ],
  groups: [
    {
      title: "数据",
      description: "归档数据与排序",
      fields: ["dataSource", "sort"],
    },
    {
      title: "布局",
      description: "控制归档排列方式与尺寸",
      fields: ["layout.mode"],
    },
  ],
  previewData: {
    dataSource: "posts",
    sort: "publishedAt_desc",
    layout: {
      mode: "vertical",
    },
  },
};

import type { BlockFormConfig } from "@/blocks/core/types/field-config";

export const ARCHIVE_CALENDAR_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "archive-calendar",
  displayName: "归档日历区块",
  description: "展示文章归档日历或热力图，显示每月发布统计。",
  author: {
    name: "RavelloH",
    url: "https://ravelloh.com",
  },
  theme: {
    name: "neutral",
    url: "https://docs.ravelloh.com",
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
      options: [
        { label: "文章", value: "posts" },
        { label: "自定义", value: "custom" },
      ],
      defaultValue: "posts",
    },
    {
      label: "显示年份数",
      path: "years",
      type: "number",
      defaultValue: 3,
      helperText: "显示最近几年的数据",
    },
    {
      label: "样式",
      path: "layout.style",
      type: "select",
      options: [
        { label: "日历", value: "calendar" },
        { label: "热力图", value: "heatmap" },
        { label: "列表", value: "list" },
      ],
      defaultValue: "calendar",
    },
    {
      label: "显示统计",
      path: "layout.showStats",
      type: "toggle",
      defaultValue: true,
    },
    {
      label: "单年宽高比",
      path: "layout.ratio",
      type: "number",
      defaultValue: 0.6,
    },
  ],
  groups: [
    {
      title: "数据",
      description: "设置数据来源",
      fields: ["dataSource", "years"],
    },
    {
      title: "布局",
      description: "控制日历的外观",
      fields: ["layout.style", "layout.showStats", "layout.ratio"],
    },
  ],
  previewData: {
    dataSource: "posts",
    years: 3,
    layout: { style: "calendar", showStats: true, ratio: 0.6 },
  },
};

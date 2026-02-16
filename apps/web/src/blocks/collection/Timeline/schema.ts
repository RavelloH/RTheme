import type { BlockFormConfig } from "@/blocks/core/types/field-config";

export const TIMELINE_ITEM_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "timeline-item",
  displayName: "时间线节点",
  description: "展示单个时间线节点。可添加多个区块来构建完整的时间线。",
  author: {
    name: "RavelloH",
    url: "https://ravelloh.com",
  },
  theme: {
    name: "neutral",
    url: "https://neutralpress.net",
  },
  actions: {
    db: 0,
    config: 0,
  },
  fields: [
    {
      label: "年份",
      path: "year",
      type: "text",
      helperText: "时间点的年份（如：2024）",
      placeholder: "2024",
      required: true,
    },
    {
      label: "月日",
      path: "monthDay",
      type: "text",
      helperText: "时间点的月份和日期（如：3.27、1月15日）",
      placeholder: "3.27",
    },
    {
      label: "标题",
      path: "title",
      type: "text",
      helperText: "时间点的标题",
      placeholder: "项目启动",
    },
    {
      label: "描述",
      path: "description",
      type: "textarea",
      helperText: "时间点的详细描述",
      placeholder: "描述这个时间点发生了什么...",
    },
    {
      label: "图片",
      path: "image",
      type: "image",
      helperText: "时间点的配图",
    },
    {
      label: "链接",
      path: "link",
      type: "text",
      helperText: "相关链接",
      placeholder: "/blog/post-1",
    },
    {
      label: "交换位置",
      path: "layout.swapPosition",
      type: "toggle",
      defaultValue: false,
      helperText: "交换时间与内容的位置",
    },
    {
      label: "未完成",
      path: "layout.incomplete",
      type: "toggle",
      defaultValue: false,
      helperText: "标记为未完成状态，使用中性颜色",
    },
    {
      label: "连接模式",
      path: "layout.connectionMode",
      type: "select",
      options: [
        { label: "独立", value: "standalone" },
        { label: "起始", value: "start" },
        { label: "连接", value: "middle" },
        { label: "终止", value: "end" },
      ],
      defaultValue: "standalone",
      helperText: "控制时间线节点之间的连接方式（仅桌面端生效）",
    },
    {
      label: "宽高比",
      path: "layout.ratio",
      type: "number",
      defaultValue: 0.4,
      helperText: "时间点的宽高比",
    },
  ],
  groups: [
    {
      title: "时间信息",
      description: "设置时间点的年份和月日",
      fields: ["year", "monthDay"],
    },
    {
      title: "内容",
      description: "设置标题、描述、图片和链接",
      fields: ["title", "description", "image", "link"],
    },
    {
      title: "布局",
      description: "控制时间点的样式和布局",
      fields: [
        "layout.swapPosition",
        "layout.incomplete",
        "layout.connectionMode",
        "layout.ratio",
      ],
    },
  ],
  previewData: {
    year: "2020",
    monthDay: "7.17",
    title: "开始开发",
    description:
      "2020年7月17日，NeutralPress 项目（当时还叫做 RTheme）仓库创建。",
    layout: {
      ratio: 0.4,
      swapPosition: false,
      incomplete: false,
      connectionMode: "standalone",
    },
  },
};

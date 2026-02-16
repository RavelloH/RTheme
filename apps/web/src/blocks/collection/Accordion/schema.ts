import type { BlockFormConfig } from "@/blocks/core/types/field-config";

/**
 * AccordionBlock 表单配置
 */
export const ACCORDION_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "accordion",
  displayName: "手风琴列表",
  description: "展示标签、分类等内容的网格布局",
  author: {
    name: "RavelloH",
    url: "https://ravelloh.com",
  },
  theme: {
    name: "neutral",
    url: "https://neutralpress.net",
  },
  actions: {
    db: 1, // 1 次数据库查询获取数据
    config: 0,
  },
  fields: [
    {
      label: "数据来源",
      path: "source",
      type: "select",
      helperText: "选择要展示的数据类型",
      options: [
        { value: "tags", label: "标签" },
        { value: "categories", label: "分类（根分类）" },
        { value: "child-categories", label: "子分类（当前分类的子项）" },
        { value: "posts", label: "文章" },
      ],
      defaultValue: "tags",
    },
    {
      label: "排序方式",
      path: "layout.sortBy",
      type: "select",
      helperText: "选择列表的排序方式",
      options: [
        { value: "name", label: "按名称" },
        { value: "count", label: "按文章数" },
        { value: "recent", label: "按最新" },
      ],
      defaultValue: "count",
    },
    {
      label: "显示数量",
      path: "limit",
      type: "number",
      helperText: "限制显示的数量，0 或留空表示显示全部",
      defaultValue: 0,
    },
  ],
  groups: [
    {
      title: "数据源",
      description: "配置要展示的数据类型和排序方式",
      fields: ["source", "layout.sortBy", "limit"],
    },
  ],
  previewData: {
    source: "tags",
    layout: {
      sortBy: "count",
    },
    limit: 8,
  },
};

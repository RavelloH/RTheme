import type { BlockFormConfig } from "@/blocks/core/types/field-config";

/**
 * PagedPostsBlock 表单配置
 */
export const PAGED_POSTS_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "paged-posts",
  displayName: "分页文章列表",
  description: "展示标签或分类下的文章列表，支持分页",
  author: {
    name: "RavelloH",
    url: "https://ravelloh.com",
  },
  theme: {
    name: "neutral",
    url: "https://neutralpress.net",
  },
  actions: {
    db: 2, // 2 次数据库查询（文章列表 + 总数）
    config: 0,
  },
  fields: [
    {
      label: "筛选类型",
      path: "filterBy",
      type: "select",
      helperText: "选择筛选条件类型",
      options: [
        { value: "all", label: "不筛选" },
        { value: "tag", label: "标签" },
        { value: "category", label: "分类" },
      ],
      defaultValue: "all",
    },
    {
      label: "排序方式",
      path: "sortBy",
      type: "select",
      helperText: "选择文章的排序方式",
      options: [
        { value: "isPinned_desc", label: "置顶优先" },
        { value: "publishedAt_desc", label: "发布日期（新→旧）" },
        { value: "publishedAt_asc", label: "发布日期（旧→新）" },
        { value: "updatedAt_desc", label: "更新日期（新→旧）" },
        { value: "title_asc", label: "标题（A→Z）" },
        { value: "title_desc", label: "标题（Z→A）" },
      ],
      defaultValue: "isPinned_desc",
    },
    {
      label: "每页数量",
      path: "pageSize",
      type: "number",
      helperText: "每页显示的文章数量",
      defaultValue: 20,
    },
    {
      label: "启用搜索",
      path: "searchable",
      type: "toggle",
      defaultValue: false,
      helperText: "是否启用文章搜索功能",
    },
  ],
  groups: [
    {
      title: "数据源",
      description: "配置筛选条件和显示方式",
      fields: ["filterBy", "sortBy", "pageSize", "searchable"],
    },
  ],
  previewData: {
    filterBy: "all",
    sortBy: "isPinned_desc",
    pageSize: 20,
  },
};

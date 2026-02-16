import type { BlockFormConfig } from "@/blocks/core/types/field-config";

/**
 * PaginationBlock 表单配置
 */
export const PAGINATION_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "pagination",
  displayName: "分页导航",
  description: "显示分页导航（与 PagedPostsBlock 配合使用）",
  author: {
    name: "RavelloH",
    url: "https://ravelloh.com",
  },
  theme: {
    name: "neutral",
    url: "https://neutralpress.net",
  },
  actions: {
    db: 0, // 无数据库查询
    config: 0,
  },
  fields: [
    {
      label: "筛选类型",
      path: "filterBy",
      type: "select",
      helperText: "选择筛选条件类型（用于生成分页链接）",
      options: [
        { value: "all", label: "不筛选" },
        { value: "tag", label: "标签" },
        { value: "category", label: "分类" },
      ],
      defaultValue: "all",
    },
  ],
  groups: [
    {
      title: "配置",
      description: "分页导航配置",
      fields: ["filterBy"],
    },
  ],
  previewData: {
    filterBy: "tag",
  },
};

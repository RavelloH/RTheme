import type { BlockFormConfig } from "@/blocks/core/types/field-config";

export const PROJECTS_LIST_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "projects-list",
  displayName: "项目列表",
  description: "图片与详细信息交替展示的项目列表区块。",
  author: {
    name: "RavelloH",
    url: "https://ravelloh.com",
  },
  theme: {
    name: "neutral",
    url: "https://neutralpress.net",
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
      label: "项目排序方式",
      path: "projects.sort",
      type: "select",
      options: [
        { label: "最新发布", value: "publishedAt_desc" },
        { label: "最早发布", value: "publishedAt_asc" },
        { label: "最近更新", value: "updatedAt_desc" },
        { label: "最新创建", value: "createdAt_desc" },
        { label: "自定义排序", value: "sortOrder_asc" },
        { label: "Stars 数最多", value: "stars_desc" },
        { label: "Forks 数最多", value: "forks_desc" },
      ],
      defaultValue: "publishedAt_desc",
    },
    {
      label: "显示数量",
      path: "projects.limit",
      type: "number",
      helperText: "设为 0 时显示全部项目",
      defaultValue: 6,
    },
    {
      label: "显示置顶项目",
      path: "projects.showFeatured",
      type: "toggle",
      defaultValue: true,
    },
  ],
  groups: [
    {
      title: "数据源",
      description: "配置筛选条件",
      fields: ["filterBy"],
    },
    {
      title: "项目查询",
      fields: ["projects.sort", "projects.limit", "projects.showFeatured"],
    },
  ],
  actions: {
    db: 1,
    config: 0,
  },
  previewData: {
    filterBy: "all",
    projects: {
      sort: "publishedAt_desc",
      limit: 6,
      showFeatured: true,
    },
  },
};

import type { BlockFormConfig } from "@/blocks/core/types/field-config";

export const FEATURED_PROJECTS_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "featured-projects",
  displayName: "特色项目",
  description: "大图遮罩样式的特色项目区块。",
  author: {
    name: "RavelloH",
    url: "https://ravelloh.com",
  },
  theme: {
    name: "neutral",
    url: "https://docs.ravelloh.com",
  },
  fields: [
    {
      label: "展示数量",
      path: "projects.count",
      type: "number",
      helperText: "建议 1-8",
      defaultValue: 3,
    },
    {
      label: "仅显示置顶项目",
      path: "projects.onlyFeatured",
      type: "toggle",
      defaultValue: true,
    },
  ],
  groups: [
    {
      title: "项目查询",
      fields: ["projects.count", "projects.onlyFeatured"],
    },
  ],
  actions: {
    db: 1,
    config: 0,
  },
  previewData: {
    projects: {
      count: 3,
      onlyFeatured: true,
    },
  },
};

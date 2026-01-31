import type { BlockFormConfig } from "@/blocks/types/field-config";

export const TAGS_CATEGORIES_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "tags-categories",
  displayName: "Tags & Categories",
  description: "显示最热门的标签和分类统计。",
  author: {
    name: "RavelloH",
    url: "https://ravelloh.com",
  },
  theme: {
    name: "neutral",
    url: "https://docs.ravelloh.com",
  },
  fields: [],
  actions: {
    db: 2,
    config: 0,
  },
  previewData: {},
};

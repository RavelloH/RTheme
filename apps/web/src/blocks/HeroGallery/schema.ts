import type { BlockFormConfig } from "@/blocks/types/field-config";

export const HERO_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "hero",
  displayName: "Hero Gallery",
  description: "首页 Hero 区域，展示站点标题、标语和精选图片画廊。",
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
    db: 1,
    config: 1,
  },
  previewData: {},
};

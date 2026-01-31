import type { BlockFormConfig } from "@/blocks/types/field-config";

export const POSTS_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "posts",
  displayName: "Recent Posts",
  description: "显示最新发布的文章列表，自动包含分类和标签信息。",
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

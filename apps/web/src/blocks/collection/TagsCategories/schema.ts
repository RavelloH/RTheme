import type { BlockFormConfig } from "@/blocks/core/types/field-config";

export const TAGS_CATEGORIES_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "tags-categories",
  displayName: "热门标签与分类",
  description: "显示最热门的标签和分类统计",
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
      label: "底部文本",
      path: "footer.text",
      type: "array",
      helperText: "显示在标签和分类列表底部的文本内容",
      defaultValue: ["Tags &", "Categories"],
    },
  ],
  actions: {
    db: 2,
    config: 0,
  },
  previewData: {
    footer: {
      text: ["Tags &", "CATEGORIES"],
    },
  },
};

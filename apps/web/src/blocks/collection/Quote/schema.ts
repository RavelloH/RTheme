import type { BlockFormConfig } from "@/blocks/core/types/field-config";

/**
 * Quote 区块的表单配置
 */
export const QUOTE_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "quote",
  displayName: "引用区块",
  description:
    "展示引用文本，支持作者和来源信息。适用于名言、书摘、用户评价等场景。",
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
      label: "引用文本",
      path: "quote",
      type: "textarea",
      helperText: "引用的主要内容",
      placeholder: "输入引用文本...",
      required: true,
    },
    {
      label: "作者",
      path: "author",
      type: "text",
      helperText: "引用的作者",
      placeholder: "作者姓名",
    },
    {
      label: "来源",
      path: "source",
      type: "text",
      helperText: "引用来源（如书名、文章名）",
      placeholder: "《书名》或文章标题",
    },
    {
      label: "样式",
      path: "layout.style",
      type: "select",
      options: [
        {
          label: "经典",
          value: "classic",
        },
        {
          label: "现代",
          value: "modern",
        },
        {
          label: "极简",
          value: "minimal",
        },
      ],
      defaultValue: "classic",
    },
    {
      label: "对齐方式",
      path: "layout.align",
      type: "select",
      options: [
        {
          label: "左对齐",
          value: "left",
        },
        {
          label: "居中",
          value: "center",
        },
      ],
      defaultValue: "left",
    },
    {
      label: "宽高比",
      path: "layout.ratio",
      type: "number",
      defaultValue: 1,
      helperText: "当高度为 1 时，宽度为高度的多少倍",
    },
  ],
  groups: [
    {
      title: "引用内容",
      description: "设置引用的文本、作者和来源",
      fields: ["quote", "author", "source"],
    },
    {
      title: "布局",
      description: "控制区块的样式和布局",
      fields: ["layout.style", "layout.align", "layout.ratio"],
    },
  ],
  previewData: {
    quote: "设计不仅仅是外观和感觉，设计是产品如何工作的。",
    author: "—— Steve Jobs",
    source: "2003，《纽约时报》采访",
    layout: {
      style: "classic",
      align: "left",
      ratio: 1,
    },
  },
};

import type { BlockFormConfig } from "@/blocks/types/field-config";

/**
 * 默认区块的表单配置
 */
export const DEFAULT_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "default",
  displayName: "默认区块",
  description: "默认区块，提供基础文字显示功能。包含标题、正文和底部链接。",
  author: {
    name: "RavelloH",
    url: "https://ravelloh.com",
  },
  theme: {
    name: "neutral",
    url: "https://docs.ravelloh.com",
  },
  actions: {
    db: 0,
    config: 0,
  },
  fields: [
    {
      label: "顶部文本",
      path: "header",
      type: "text",
      helperText: "顶部显示文本，自动大写、粗体",
    },
    {
      label: "标题",
      path: "title",
      type: "text",
      helperText: "区块主标题",
    },
    {
      label: "正文（顶部）",
      path: "content.top",
      type: "array",
      helperText: "显示在正文区域，向上对齐。",
    },
    {
      label: "正文（底部）",
      path: "content.bottom",
      type: "array",
      helperText: "显示在正文区域，向下对齐",
    },
    {
      label: "底部文本",
      path: "footer.text",
      type: "text",
      helperText: "显示在底部，需要与底部文本链接配合使用",
    },
    {
      label: "底部文本链接",
      path: "footer.link",
      type: "text",
      helperText: "例如：/about",
    },
  ],
  groups: [
    {
      title: "顶栏",
      description:
        "顶栏出现在区块的最上方，通常用于显示简短的提示信息。不填则不显示",
      fields: ["header"],
    },
    {
      title: "正文",
      description: "正文文本，分别显示在正文顶部和底部，自动添加动画效果",
      fields: ["title", "content.top", "content.bottom"],
    },
    {
      title: "底栏",
      description: "底栏出现在区块的最下方，通常用于显示操作链接。不填则不显示",
      fields: ["footer.text", "footer.link"],
    },
  ],
  previewData: {
    header: "WELCOME",
    title: "示例标题",
    content: {
      top: ["这是正文顶部的示例文本，", "用于展示预览效果。"],
      bottom: ["正文底部的示例文本", "会在下方显示。"],
    },
    footer: {
      text: "了解更多",
      link: "/about",
    },
  },
};

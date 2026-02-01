import type { BlockFormConfig } from "@/blocks/core/types/field-config";

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
      path: "header.value",
      type: "text",
      helperText: "顶部显示文本，自动大写、粗体",
    },
    {
      label: "顶栏对齐方式",
      path: "header.align",
      type: "select",
      options: [
        {
          label: "居中",
          value: "center",
        },
        {
          label: "左对齐",
          value: "left",
        },
        {
          label: "右对齐",
          value: "right",
        },
      ],
      defaultValue: "left",
    },
    {
      label: "标题",
      path: "title.value",
      type: "text",
      helperText: "区块主标题",
    },
    {
      label: "标题对齐方式",
      path: "title.align",
      type: "select",
      options: [
        {
          label: "居中",
          value: "center",
        },
        {
          label: "左对齐",
          value: "left",
        },
        {
          label: "右对齐",
          value: "right",
        },
      ],
      defaultValue: "left",
    },
    {
      label: "正文（顶部）",
      path: "content.top.value",
      type: "array",
      helperText: "显示在正文区域顶部。",
    },
    {
      label: "正文（顶部）对齐方式",
      path: "content.top.align",
      type: "select",
      options: [
        {
          label: "居中",
          value: "center",
        },
        {
          label: "左对齐",
          value: "left",
        },
        {
          label: "右对齐",
          value: "right",
        },
      ],
      defaultValue: "left",
    },
    {
      label: "正文（底部）",
      path: "content.bottom.value",
      type: "array",
      helperText: "显示在正文区域底部",
    },
    {
      label: "正文（底部）对齐方式",
      path: "content.bottom.align",
      type: "select",
      options: [
        {
          label: "居中",
          value: "center",
        },
        {
          label: "左对齐",
          value: "left",
        },
        {
          label: "右对齐",
          value: "right",
        },
      ],
      defaultValue: "left",
    },
    {
      label: "底部链接文本",
      path: "footer.text",
      type: "text",
      helperText: "控制底部链接的文本，需要与底部文本链接配合使用",
    },
    {
      label: "底部链接",
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
      fields: ["header.value", "header.align"],
    },
    {
      title: "正文",
      description: "正文文本，分别显示在正文顶部和底部，自动添加动画效果",
      fields: [
        "title.value",
        "title.align",
        "content.top.value",
        "content.top.align",
        "content.bottom.value",
        "content.bottom.align",
      ],
    },
    {
      title: "底栏",
      description: "底栏出现在区块的最下方，通常用于显示操作链接。不填则不显示",
      fields: ["footer.text", "footer.link"],
    },
  ],
  previewData: {
    header: { value: "WELCOME", align: "center" },
    title: { value: "示例标题", align: "left" },
    content: {
      top: {
        value: ["这是正文顶部的示例文本，", "用于展示预览效果。"],
        align: "left",
      },
      bottom: {
        value: ["正文底部的示例文本", "会在下方显示。"],
        align: "left",
      },
    },
    footer: {
      text: "了解更多",
      link: "/about",
    },
  },
};

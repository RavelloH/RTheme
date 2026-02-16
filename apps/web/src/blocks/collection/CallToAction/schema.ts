import type { BlockFormConfig } from "@/blocks/core/types/field-config";

/**
 * CallToAction 区块的表单配置
 */
export const CTA_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "cta",
  displayName: "行动号召区块",
  description:
    "用于引导用户采取行动的区块。包含标题、描述和按钮，适用于订阅、下载、注册等场景。",
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
      label: "主标题",
      path: "title",
      type: "text",
      helperText: "醒目的标题文字",
      placeholder: "输入主标题...",
    },
    {
      label: "副标题",
      path: "subtitle",
      type: "text",
      helperText: "补充说明文字",
      placeholder: "输入副标题...",
    },
    {
      label: "描述",
      path: "description",
      type: "array",
      helperText: "详细描述文字，每行一条",
    },
    {
      label: "主按钮文本",
      path: "primaryButton.text",
      type: "text",
      placeholder: "立即开始",
    },
    {
      label: "主按钮链接",
      path: "primaryButton.link",
      type: "text",
      placeholder: "/signup",
    },
    {
      label: "次按钮文本",
      path: "secondaryButton.text",
      type: "text",
      placeholder: "了解更多",
    },
    {
      label: "次按钮链接",
      path: "secondaryButton.link",
      type: "text",
      placeholder: "/about",
    },
    {
      label: "背景图片",
      path: "backgroundImage",
      type: "image",
      condition: {
        and: [
          {
            field: "layout.style",
            value: "minimal",
          },
        ],
      },
    },
    {
      label: "样式",
      path: "layout.style",
      type: "select",
      options: [
        {
          label: "极简",
          value: "minimal",
        },
        {
          label: "醒目",
          value: "bold",
        },
        {
          label: "渐变",
          value: "gradient",
        },
      ],
      defaultValue: "minimal",
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
        {
          label: "右对齐",
          value: "right",
        },
      ],
      defaultValue: "center",
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
      title: "内容",
      description: "设置标题和描述文字",
      fields: ["title", "subtitle", "description"],
    },
    {
      title: "按钮",
      description: "设置行动按钮",
      fields: [
        "primaryButton.text",
        "primaryButton.link",
        "secondaryButton.text",
        "secondaryButton.link",
      ],
    },
    {
      title: "样式",
      description: "控制区块的外观和布局，极简模式下可设置背景图",
      fields: [
        "layout.style",
        "backgroundImage",
        "layout.align",
        "layout.ratio",
      ],
    },
  ],
  previewData: {
    title: "准备好开始了吗",
    subtitle: "加入我们，开启全新体验",
    description: ["简单易用的界面", "强大的功能支持", "专业的技术团队"],
    primaryButton: {
      text: "立即开始",
      link: "/signup",
    },
    secondaryButton: {
      text: "了解更多",
      link: "/about",
    },
    layout: {
      style: "minimal",
      align: "center",
      ratio: 1,
    },
  },
};

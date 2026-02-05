import type { BlockFormConfig } from "@/blocks/core/types/field-config";

/**
 * Divider 区块的表单配置
 */
export const DIVIDER_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "divider",
  displayName: "分隔线区块",
  description:
    "用于分隔页面内容的装饰性区块。支持线条、点线、图标和文字等样式。",
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
      label: "样式",
      path: "style",
      type: "select",
      options: [
        {
          label: "实线",
          value: "line",
        },
        {
          label: "点线",
          value: "dotted",
        },
        {
          label: "图标",
          value: "icon",
        },
        {
          label: "文字",
          value: "text",
        },
      ],
      defaultValue: "line",
    },
    {
      label: "分隔文字",
      path: "text",
      type: "text",
      helperText: "显示在分隔线中间的文字",
      placeholder: "输入分隔文字...",
      condition: {
        and: [
          {
            field: "style",
            value: "text",
          },
        ],
      },
    },
    {
      label: "图标",
      path: "icon",
      type: "select",
      options: [
        {
          label: "箭头",
          value: "arrow",
        },
        {
          label: "星星",
          value: "star",
        },
        {
          label: "圆点",
          value: "dot",
        },
        {
          label: "菱形",
          value: "diamond",
        },
      ],
      defaultValue: "arrow",
      condition: {
        and: [
          {
            field: "style",
            value: "icon",
          },
        ],
      },
    },
    {
      label: "内容颜色",
      path: "color",
      type: "select",
      options: [
        {
          label: "主色",
          value: "primary",
        },
        {
          label: "柔和",
          value: "muted",
        },
        {
          label: "强调",
          value: "accent",
        },
        {
          label: "背景色",
          value: "background",
        },
      ],
      defaultValue: "muted",
    },
    {
      label: "背景颜色",
      path: "backgroundColor",
      type: "select",
      options: [
        {
          label: "常规背景",
          value: "background",
        },
        {
          label: "主色背景",
          value: "primary",
        },
      ],
      defaultValue: "background",
    },
    {
      label: "宽度",
      path: "layout.width",
      type: "number",
      defaultValue: 0.1,
      helperText: "分隔区块的宽度比例（0.05-0.3）",
    },
    {
      label: "线条粗细",
      path: "layout.thickness",
      type: "number",
      defaultValue: 1,
      helperText: "线条粗细（1-4）",
    },
  ],
  groups: [
    {
      title: "样式",
      description: "设置分隔线的样式和内容",
      fields: ["style", "text", "icon", "color", "backgroundColor"],
    },
    {
      title: "布局",
      description: "控制分隔线的尺寸",
      fields: ["layout.width", "layout.thickness"],
    },
  ],
  previewData: {
    text: "learn more about this",
    color: "accent",
    style: "text",
    layout: {
      width: 0.1,
      thickness: 1,
    },
    backgroundColor: "background",
  },
};

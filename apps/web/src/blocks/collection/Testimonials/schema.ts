import type { BlockFormConfig } from "@/blocks/core/types/field-config";

export const TESTIMONIAL_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "testimonial",
  displayName: "用户评价",
  description: "展示单个用户评价和推荐语。可添加多个区块来展示多个推荐。",
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
      label: "评价内容",
      path: "quote",
      type: "textarea",
      helperText: "用户评价的正文内容",
      placeholder: "输入用户评价...",
      required: true,
    },
    {
      label: "作者姓名",
      path: "author",
      type: "text",
      helperText: "评价者的姓名",
      placeholder: "作者姓名",
    },
    {
      label: "职位/公司",
      path: "role",
      type: "text",
      helperText: "评价者的职位或所属公司",
      placeholder: "产品经理 · ABC 公司",
    },
    {
      label: "头像",
      path: "avatar",
      type: "image",
      helperText: "评价者的头像图片",
    },
    {
      label: "双行显示模式",
      path: "layout.enableDualRow",
      type: "toggle",
      helperText: "开启后将显示两行评价，分别占据左右两侧",
      defaultValue: false,
    },
    {
      label: "评价内容（第二行）",
      path: "quote2",
      type: "textarea",
      helperText: "第二个用户评价的正文内容",
      placeholder: "输入第二个用户评价...",
      condition: {
        and: [
          {
            field: "layout.enableDualRow",
            value: true,
          },
        ],
      },
    },
    {
      label: "作者姓名（第二行）",
      path: "author2",
      type: "text",
      helperText: "第二个评价者的姓名",
      placeholder: "作者姓名",
      condition: {
        and: [
          {
            field: "layout.enableDualRow",
            value: true,
          },
        ],
      },
    },
    {
      label: "职位/公司（第二行）",
      path: "role2",
      type: "text",
      helperText: "第二个评价者的职位或所属公司",
      placeholder: "产品经理 · ABC 公司",
      condition: {
        and: [
          {
            field: "layout.enableDualRow",
            value: true,
          },
        ],
      },
    },
    {
      label: "头像（第二行）",
      path: "avatar2",
      type: "image",
      helperText: "第二个评价者的头像图片",
      condition: {
        and: [
          {
            field: "layout.enableDualRow",
            value: true,
          },
        ],
      },
    },
    {
      label: "样式",
      path: "layout.style",
      type: "select",
      options: [
        { label: "卡片", value: "cards" },
        { label: "极简", value: "minimal" },
        { label: "引用聚焦", value: "quote-focus" },
      ],
      defaultValue: "cards",
    },
    {
      label: "宽高比",
      path: "layout.ratio",
      type: "number",
      defaultValue: 0.8,
      helperText: "区块的宽高比",
    },
    {
      label: "卡片背景",
      path: "layout.background",
      type: "select",
      options: [
        { label: "柔和", value: "muted" },
        { label: "默认", value: "default" },
      ],
      defaultValue: "muted",
      helperText: "卡片样式的背景颜色（仅对卡片样式生效）",
    },
  ],
  groups: [
    {
      title: "评价内容（第一行）",
      description: "设置第一个评价的文本、作者和头像",
      fields: ["quote", "author", "role", "avatar"],
    },
    {
      title: "评价内容（第二行）",
      description: "设置第二个评价的文本、作者和头像（需开启双行显示模式）",
      fields: ["layout.enableDualRow", "quote2", "author2", "role2", "avatar2"],
    },
    {
      title: "布局",
      description: "控制区块的样式和布局",
      fields: ["layout.style", "layout.ratio", "layout.background"],
    },
  ],
  previewData: {
    quote: "这个产品彻底改变了我的工作方式，强烈推荐！",
    author: "张三",
    role: "产品经理 · ABC 公司",
    layout: {
      ratio: 0.8,
      style: "cards",
      background: "default",
    },
  },
};

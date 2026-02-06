import type { BlockFormConfig } from "@/blocks/core/types/field-config";

export const AUTHOR_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "author",
  displayName: "作者简介区块",
  description: "展示作者或个人信息卡片，包含头像、姓名、简介",
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
      label: "头像",
      path: "avatar",
      type: "image",
    },
    {
      label: "姓名",
      path: "name",
      type: "text",
      placeholder: "作者姓名",
    },
    {
      label: "职位/头衔",
      path: "title",
      type: "text",
      placeholder: "前端工程师",
    },
    {
      label: "简介",
      path: "bio",
      type: "array",
      helperText: "个人简介，每行一条",
    },
    {
      label: "头像形状",
      path: "layout.avatarShape",
      type: "select",
      options: [
        { label: "圆形", value: "circle" },
        { label: "方形", value: "square" },
        { label: "圆角", value: "rounded" },
      ],
      defaultValue: "circle",
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
      title: "基本信息",
      description: "设置作者的基本信息",
      fields: ["avatar", "name", "title", "bio"],
    },
    {
      title: "布局",
      description: "控制区块的外观",
      fields: ["layout.avatarShape", "layout.ratio"],
    },
  ],
  previewData: {
    avatar: "",
    name: "RavelloH",
    title: "全栈工程师",
    bio: ["热爱开源，专注于 Web 技术。", "NeutralPress 开发者。"],
    layout: { avatarShape: "circle", ratio: 1 },
  },
};

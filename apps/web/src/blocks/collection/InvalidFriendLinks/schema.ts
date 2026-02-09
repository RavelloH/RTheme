import type { BlockFormConfig } from "@/blocks/core/types/field-config";

export const INVALID_FRIEND_LINKS_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "invalid-friend-links",
  displayName: "失效友情链接",
  description:
    "展示 DISCONNECT 与 NO_BACKLINK 的友情链接，支持标题、自定义数量、超链接开关和有效时间开关。",
  author: {
    name: "RavelloH",
    url: "https://ravelloh.com",
  },
  theme: {
    name: "neutral",
    url: "https://docs.ravelloh.com",
  },
  actions: {
    db: 1,
    config: 0,
  },
  fields: [
    {
      label: "顶部文字",
      path: "headerText",
      type: "text",
      placeholder: "失效友情链接",
      defaultValue: "失效友情链接",
      helperText: "显示在列表上方的文字",
    },
    {
      label: "显示数量",
      path: "limit",
      type: "number",
      defaultValue: 20,
      helperText: "限制显示数量；0 或留空表示显示全部",
    },
    {
      label: "显示为超链接",
      path: "showAsLink",
      type: "toggle",
      defaultValue: false,
      helperText: "默认关闭，仅显示纯文本名称；开启后名称可点击跳转",
    },
    {
      label: "显示有效时间",
      path: "showDuration",
      type: "toggle",
      defaultValue: true,
      helperText: "控制是否显示从生效到失效的持续时间",
    },
  ],
  groups: [
    {
      title: "展示配置",
      description: "配置标题和显示数量",
      fields: ["headerText", "limit"],
    },
    {
      title: "行为配置",
      description: "配置链接与时长显示行为",
      fields: ["showAsLink", "showDuration"],
    },
  ],
  previewData: {
    headerText: "失效友情链接",
    limit: 20,
    showAsLink: false,
    showDuration: true,
  },
};

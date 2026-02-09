import type { BlockFormConfig } from "@/blocks/core/types/field-config";

export const FRIEND_LINKS_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "friend-links",
  displayName: "友情链接",
  description: "展示友情链接列表，支持分组筛选、显示数量控制和组内随机排序。",
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
      label: "显示数量",
      path: "limit",
      type: "number",
      defaultValue: 12,
      helperText: "限制显示数量；0 或留空表示显示全部",
    },
    {
      label: "筛选分组",
      path: "group",
      type: "text",
      placeholder: "例如：技术 / 设计 / 朋友",
      helperText: "填写后仅显示该分组；留空显示全部分组",
    },
    {
      label: "启用随机",
      path: "random",
      type: "toggle",
      defaultValue: true,
      helperText:
        "先按 order 分组，再在同 order 的组内随机排序；关闭后按 order + ID 稳定排序",
    },
  ],
  groups: [
    {
      title: "数据源",
      description: "配置显示数量、分组筛选与排序方式",
      fields: ["limit", "group", "random"],
    },
  ],
  previewData: {
    limit: 12,
    group: "",
    random: true,
  },
};

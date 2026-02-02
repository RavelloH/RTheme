import type { BlockFormConfig } from "@/blocks/core/types/field-config";

export const POSTS_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "posts",
  displayName: "最新文章",
  description: "显示最新发布的文章列表，自动包含分类、标签等信息。",
  author: {
    name: "RavelloH",
    url: "https://ravelloh.com",
  },
  theme: {
    name: "neutral",
    url: "https://docs.ravelloh.com",
  },
  fields: [
    {
      label: "Marquee 标题（第一行）",
      path: "title.line1",
      type: "text",
      helperText: "第一行跑马灯标题",
      defaultValue: "POSTS",
    },
    {
      label: "Marquee 标题（第二行）",
      path: "title.line2",
      type: "text",
      helperText: "第二行跑马灯标题",
      defaultValue: "文章",
    },
    {
      label: "显示文章列数",
      path: "layout.columns",
      type: "select",
      options: [
        { label: "1 列（1 篇文章）", value: "1" },
        { label: "2 列（5 篇文章）", value: "2" },
        { label: "3 列（9 篇文章", value: "3" },
        { label: "4 列（13 篇文章）", value: "4" },
      ],
      defaultValue: "2",
    },
    {
      label: "文章排序方式",
      path: "posts.sort",
      type: "select",
      options: [
        { label: "最新发布", value: "publishedAt_desc" },
        { label: "最早发布", value: "publishedAt_asc" },
        { label: "最多浏览", value: "viewCount_desc" },
      ],
      defaultValue: "publishedAt_desc",
    },
    {
      label: "仅显示有封面的文章",
      path: "posts.onlyWithCover",
      type: "toggle",
      defaultValue: false,
    },
    {
      label: "显示置顶文章",
      path: "posts.showPinned",
      type: "toggle",
      defaultValue: true,
    },
    {
      label: "底栏链接标题",
      path: "footer.title",
      type: "text",
      helperText: "底栏链接的显示标题",
      defaultValue: "查看全部文章",
    },
    {
      label: "底栏链接描述",
      path: "footer.description",
      type: "text",
      helperText: "底栏链接的显示描述",
      defaultValue: "共 {posts} 篇文章",
    },
    {
      label: "底栏链接",
      path: "footer.link",
      type: "text",
      helperText: "底栏链接的跳转地址",
      defaultValue: "/posts",
    },
  ],
  groups: [
    {
      title: "布局",
      fields: [
        "title.line1",
        "title.line2",
        "layout.columns",
        "footer.title",
        "footer.description",
        "footer.link",
      ],
    },
    {
      title: "文章",
      fields: ["posts.sort", "posts.onlyWithCover", "posts.showPinned"],
    },
  ],
  actions: {
    db: 1,
    config: 0,
  },
  previewData: {},
};

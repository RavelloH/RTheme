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
    url: "https://neutralpress.net",
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
      defaultValue: "",
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
      defaultValue: [],
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
      defaultValue: [],
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
      label: "数据源",
      path: "dataSource",
      type: "select",
      helperText: "选择页面类型，用于决定占位符的数据来源",
      options: [
        {
          label: "常规",
          value: "normal",
        },
        {
          label: "文章索引",
          value: "posts-index",
        },
        {
          label: "分类索引",
          value: "categories-index",
        },
        {
          label: "分类详情",
          value: "category-detail",
        },
        {
          label: "标签索引",
          value: "tags-index",
        },
        {
          label: "标签详情",
          value: "tag-detail",
        },
        {
          label: "项目索引",
          value: "projects-index",
        },
      ],
      defaultValue: "normal",
    },
    {
      label: "Footer 类型",
      path: "footer.type",
      type: "select",
      helperText: "选择底部链接的类型（随机链接会根据数据源自动选择）",
      options: [
        {
          label: "常规链接",
          value: "normal",
        },
        {
          label: "随机链接",
          value: "random",
        },
        {
          label: "返回链接",
          value: "back",
        },
      ],
      defaultValue: "normal",
    },
    {
      label: "底部链接文本",
      path: "footer.text",
      type: "text",
      helperText: "控制底部链接的文本，需要与底部文本链接配合使用",
      defaultValue: "",
    },
    {
      label: "底部链接",
      path: "footer.link",
      type: "text",
      helperText: "例如：/about",
      defaultValue: "",
      condition: {
        and: [
          {
            field: "footer.type",
            value: "normal",
          },
        ],
      },
    },
    {
      label: "竖直居中显示",
      path: "layout.verticalCenter",
      type: "toggle",
      defaultValue: false,
    },
    {
      label: "宽高比",
      path: "layout.ratio",
      type: "number",
      defaultValue: 1,
      helperText: "当高度为 1 时，宽度为高度的多少倍",
    },
    {
      label: "显示搜索栏",
      path: "showSearchBar",
      type: "toggle",
      defaultValue: false,
      helperText: "是否在标题下方显示搜索栏",
    },
  ],
  groups: [
    {
      title: "数据模式",
      description: "选择区块所使用的数据源类型",
      fields: ["dataSource"],
    },
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
      fields: ["footer.type", "footer.text", "footer.link"],
    },
    {
      title: "布局",
      description: "控制区块的布局方式",
      fields: ["layout.verticalCenter", "showSearchBar", "layout.ratio"],
    },
  ],
  previewData: {
    header: { value: "WELCOME", align: "left" },
    title: { value: "示例标题", align: "left" },
    content: {
      top: {
        value: [
          "这是正文顶部的示例文本，",
          "用于展示预览效果。",
          "使用 **Markdown** 来格式化文本或添加[链接](https://ravelloh.com)。",
        ],
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

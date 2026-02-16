import type { BlockFormConfig } from "@/blocks/core/types/field-config";

/**
 * Cards 区块的表单配置
 * 每个 block 实例对应一张卡片
 */
export const CARDS_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "cards",
  displayName: "卡片区块",
  description: "高度可定制的信息卡片。支持多种样式、图标、图片和动画效果。",
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
    // ===== 内容 =====
    {
      label: "标题",
      path: "title",
      type: "text",
      placeholder: "输入卡片标题",
    },
    {
      label: "副标题",
      path: "subtitle",
      type: "text",
      placeholder: "输入副标题",
    },
    {
      label: "描述",
      path: "description",
      type: "textarea",
      placeholder: "输入卡片描述",
    },
    {
      label: "链接",
      path: "link",
      type: "text",
      placeholder: "/page-slug 或 https://example.com",
    },
    {
      label: "链接按钮文本",
      path: "linkText",
      type: "text",
      placeholder: "了解更多",
      helperText: "填写后显示为按钮，留空则整个卡片可点击",
    },
    {
      label: "徽章",
      path: "badge",
      type: "text",
      placeholder: "NEW、HOT、推荐...",
      helperText: "显示在卡片右上角的角标",
    },
    {
      label: "标签",
      path: "tags",
      type: "array",
      helperText: "卡片底部标签，每行一个",
    },

    // ===== 图标 =====
    {
      label: "图标",
      path: "icon",
      type: "text",
      placeholder: "star-fill、heart-line...",
      helperText: "Remix Icon 图标名，查看 remixicon.com",
    },
    {
      label: "图标大小",
      path: "iconSettings.size",
      type: "select",
      options: [
        { label: "小", value: "sm" },
        { label: "中", value: "md" },
        { label: "大", value: "lg" },
        { label: "特大", value: "xl" },
      ],
      defaultValue: "lg",
    },
    {
      label: "图标颜色",
      path: "iconSettings.color",
      type: "select",
      options: [
        { label: "主色", value: "primary" },
        { label: "次要色", value: "secondary" },
        { label: "柔和", value: "muted" },
        { label: "继承", value: "inherit" },
      ],
      defaultValue: "primary",
    },
    {
      label: "图标位置",
      path: "iconSettings.position",
      type: "select",
      options: [
        { label: "标题上方", value: "above-title" },
        { label: "标题前", value: "before-title" },
        { label: "背景装饰", value: "background" },
      ],
      defaultValue: "above-title",
    },
    {
      label: "图标背景",
      path: "iconSettings.background",
      type: "select",
      options: [
        { label: "无", value: "none" },
        { label: "圆形", value: "circle" },
        { label: "方形", value: "square" },
        { label: "圆角方形", value: "rounded" },
      ],
      defaultValue: "none",
    },

    // ===== 图片 =====
    {
      label: "图片",
      path: "image",
      type: "image",
    },
    {
      label: "图片位置",
      path: "layout.imagePosition",
      type: "select",
      options: [
        { label: "顶部", value: "top" },
        { label: "左侧", value: "left" },
        { label: "右侧", value: "right" },
        { label: "背景", value: "background" },
      ],
      defaultValue: "top",
    },
    {
      label: "图片适应方式",
      path: "imageSettings.objectFit",
      type: "select",
      options: [
        { label: "覆盖（裁剪填满）", value: "cover" },
        { label: "包含（完整显示）", value: "contain" },
        { label: "填充（拉伸）", value: "fill" },
      ],
      defaultValue: "cover",
    },
    {
      label: "图片高度比例",
      path: "imageSettings.heightRatio",
      type: "select",
      options: [
        { label: "1/4", value: "1/4" },
        { label: "1/3", value: "1/3" },
        { label: "1/2", value: "1/2" },
        { label: "2/3", value: "2/3" },
        { label: "3/4", value: "3/4" },
      ],
      defaultValue: "1/2",
      helperText: "图片在顶部时的高度比例",
    },
    {
      label: "图片滤镜",
      path: "imageSettings.filter",
      type: "select",
      options: [
        { label: "无", value: "none" },
        { label: "灰度", value: "grayscale" },
        { label: "复古", value: "sepia" },
        { label: "高对比", value: "contrast" },
        { label: "暗化", value: "brightness" },
      ],
      defaultValue: "none",
    },
    {
      label: "图片叠加层",
      path: "imageSettings.overlay",
      type: "select",
      options: [
        { label: "无", value: "none" },
        { label: "底部渐变", value: "gradient-bottom" },
        { label: "全覆盖渐变", value: "gradient-full" },
        { label: "暗色遮罩", value: "dark" },
        { label: "亮色遮罩", value: "light" },
        { label: "模糊", value: "blur" },
        { label: "晕影", value: "vignette" },
      ],
      defaultValue: "none",
    },
    {
      label: "有图片时显示图标",
      path: "imageSettings.showIconWithImage",
      type: "toggle",
      defaultValue: false,
    },

    // ===== 内容排版 =====
    {
      label: "水平对齐",
      path: "contentSettings.align",
      type: "select",
      options: [
        { label: "左对齐", value: "left" },
        { label: "居中", value: "center" },
        { label: "右对齐", value: "right" },
      ],
      defaultValue: "left",
    },
    {
      label: "垂直对齐",
      path: "contentSettings.verticalAlign",
      type: "select",
      options: [
        { label: "顶部", value: "top" },
        { label: "居中", value: "center" },
        { label: "底部", value: "bottom" },
      ],
      defaultValue: "center",
    },
    {
      label: "内边距",
      path: "contentSettings.padding",
      type: "select",
      options: [
        { label: "无", value: "none" },
        { label: "小", value: "sm" },
        { label: "中", value: "md" },
        { label: "大", value: "lg" },
        { label: "特大", value: "xl" },
      ],
      defaultValue: "md",
    },
    {
      label: "标题大小",
      path: "contentSettings.titleSize",
      type: "select",
      options: [
        { label: "小", value: "sm" },
        { label: "中", value: "md" },
        { label: "大", value: "lg" },
        { label: "特大", value: "xl" },
        { label: "超大", value: "2xl" },
      ],
      defaultValue: "lg",
    },
    {
      label: "描述大小",
      path: "contentSettings.descriptionSize",
      type: "select",
      options: [
        { label: "极小", value: "xs" },
        { label: "小", value: "sm" },
        { label: "中", value: "md" },
        { label: "大", value: "lg" },
      ],
      defaultValue: "sm",
    },

    // ===== 样式 =====
    {
      label: "圆角",
      path: "styleSettings.rounded",
      type: "select",
      options: [
        { label: "无", value: "none" },
        { label: "小", value: "sm" },
        { label: "中", value: "md" },
        { label: "大", value: "lg" },
        { label: "特大", value: "xl" },
        { label: "超大", value: "2xl" },
        { label: "全圆", value: "full" },
      ],
      defaultValue: "lg",
    },
    {
      label: "背景颜色",
      path: "styleSettings.bgColor",
      type: "select",
      options: [
        { label: "默认", value: "default" },
        { label: "柔和", value: "muted" },
        { label: "主色", value: "primary" },
        { label: "次要色", value: "secondary" },
        { label: "透明", value: "transparent" },
      ],
      defaultValue: "default",
    },
    {
      label: "悬停效果",
      path: "styleSettings.hoverEffect",
      type: "select",
      options: [
        { label: "无", value: "none" },
        { label: "上浮", value: "lift" },
        { label: "放大", value: "scale" },
        { label: "发光", value: "glow" },
      ],
      defaultValue: "lift",
    },

    // ===== 布局 =====
    {
      label: "宽高比",
      path: "layout.ratio",
      type: "number",
      defaultValue: 1,
      helperText: "当高度为 1 时，宽度为高度的多少倍",
    },

    // ===== 动画 =====
    {
      label: "启用文字动画",
      path: "animationSettings.enableTextAnimation",
      type: "toggle",
      defaultValue: true,
      helperText: "标题逐字显示、描述逐行显示",
    },
  ],
  groups: [
    {
      title: "内容",
      description: "卡片的文本内容",
      fields: [
        "title",
        "subtitle",
        "description",
        "link",
        "linkText",
        "badge",
        "tags",
      ],
    },
    {
      title: "图标",
      description: "图标及其样式设置",
      fields: [
        "icon",
        "iconSettings.size",
        "iconSettings.color",
        "iconSettings.position",
        "iconSettings.background",
      ],
    },
    {
      title: "图片",
      description: "图片及其显示设置",
      fields: [
        "image",
        "layout.imagePosition",
        "imageSettings.objectFit",
        "imageSettings.heightRatio",
        "imageSettings.filter",
        "imageSettings.overlay",
        "imageSettings.showIconWithImage",
      ],
    },
    {
      title: "内容排版",
      description: "文本对齐和大小设置",
      fields: [
        "contentSettings.align",
        "contentSettings.verticalAlign",
        "contentSettings.padding",
        "contentSettings.titleSize",
        "contentSettings.descriptionSize",
      ],
    },
    {
      title: "样式",
      description: "卡片外观和悬停效果",
      fields: [
        "styleSettings.rounded",
        "styleSettings.bgColor",
        "styleSettings.shadow",
        "styleSettings.hoverEffect",
      ],
    },
    {
      title: "布局与动画",
      description: "尺寸和动画效果",
      fields: ["layout.ratio", "animationSettings.enableTextAnimation"],
    },
  ],
  previewData: {
    icon: "article-line",
    link: "/posts",
    tags: ["标签", "标签", "标签", "标签"],
    badge: "BADGE",
    image: "/avatar.jpg",
    title: "查看更多文章",
    layout: {
      imagePosition: "top",
    },
    linkText: "继续阅读",
    subtitle: "共 {posts} 篇文章，最近更新于 {lastPublishDays}",
    description: "这是一段描述...",
    iconSettings: {
      position: "background",
    },
    imageSettings: {
      filter: "none",
      overlay: "vignette",
      heightRatio: "1/2",
      showIconWithImage: true,
    },
    styleSettings: {
      hoverEffect: "lift",
    },
    contentSettings: {
      align: "left",
      padding: "xl",
      titleSize: "2xl",
      verticalAlign: "center",
      descriptionSize: "md",
    },
  },
};

import type { BlockFormConfig } from "@/blocks/core/types/field-config";

export const HERO_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "hero",
  displayName: "Hero Gallery",
  description: "首页 Hero 区域，展示站点标题、标语和最多九张精选图片画廊。",
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
      label: "第一行文本",
      path: "line1.value",
      type: "text",
      helperText: "图片下的第一行文本，不填则使用站点标题",
    },
    {
      label: "第一行文本粗体",
      path: "line1.bold",
      type: "toggle",
      helperText: "是否将第一行文本显示为粗体",
      defaultValue: true,
    },
    {
      label: "第二行文本",
      path: "line2.value",
      type: "text",
      helperText: "图片下的第二行文本，不填则使用站点标语",
    },
    {
      label: "第二行文本粗体",
      path: "line2.bold",
      type: "toggle",
      helperText: "是否将第二行文本显示为粗体",
      defaultValue: false,
    },
    {
      label: "左下角图片",
      path: "logoImage",
      type: "image",
      helperText: "桌面端第二行文字左侧的图片，不填则使用默认头像",
    },
    {
      label: "上方图集来源",
      path: "galleryImagesOrigin",
      type: "select",
      options: [
        { label: "最新文章图片", value: "latestPosts" },
        { label: "最新照片墙图片", value: "latestGallery" },
        { label: "自定义图片", value: "custom" },
      ],
      defaultValue: "latestPosts",
      helperText: "上方展示的图片集合来源",
    },
    {
      label: "自定义上方图集",
      path: "galleryImages",
      type: "imageArray",
      helperText: "上方展示的图片集合",
      maxCount: 9,
      condition: {
        and: [
          {
            field: "galleryImagesOrigin",
            value: "custom",
          },
        ],
      },
    },
    {
      label: "上方图集图片滤镜",
      path: "galleryImageFilter",
      type: "select",
      options: [
        { label: "无滤镜", value: "none" },
        { label: "主色调色相滤镜", value: "mix-blend-hue" },
        { label: "暗色滤镜", value: "dark" },
        { label: "灰度滤镜", value: "gray" },
        { label: "暖色调滤镜", value: "warm" },
        { label: "冷色调滤镜", value: "cool" },
        { label: "复古风滤镜", value: "vintage" },
        { label: "高对比度滤镜", value: "contrast" },
        { label: "怀旧褐色滤镜", value: "sepia" },
        { label: "高饱和度滤镜", value: "saturate" },
        { label: "胶片感滤镜", value: "film" },
        { label: "戏剧性滤镜", value: "dramatic" },
        { label: "柔和滤镜", value: "soft" },
        { label: "褪色滤镜", value: "fade" },
        { label: "电影感滤镜", value: "cinematic" },
        { label: "黑色电影滤镜", value: "noire" },
        { label: "泛光滤镜", value: "bloom" },
        { label: "反色滤镜", value: "inverted" },
        { label: "双色调滤镜", value: "duotone" },
      ],
      defaultValue: "mix-blend-hue",
      helperText: "为上方图集图片添加的滤镜效果",
    },
  ],
  groups: [
    {
      title: "文字内容",
      fields: ["line1.value", "line1.bold", "line2.value", "line2.bold"],
      description: "配置 Hero 区域的标题和标语文本内容。",
    },
    {
      title: "图片配置",
      fields: [
        "logoImage",
        "galleryImagesOrigin",
        "galleryImages",
        "galleryImageFilter",
      ],
      description: "配置 Hero 区域的图片内容和效果。",
    },
  ],
  actions: {
    db: 1,
    config: 2,
  },
  previewData: {},
};

import type { BlockFormConfig } from "@/blocks/core/types/field-config";

export const GALLERY_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "gallery",
  displayName: "图片画廊区块",
  description: "展示多张图片的画廊组件。支持网格、瀑布流等布局。",
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
      label: "图片",
      path: "images",
      type: "imageArray",
      helperText: "选择要展示的图片",
    },
    {
      label: "样式",
      path: "layout.style",
      type: "select",
      options: [
        { label: "网格", value: "grid" },
        { label: "瀑布流", value: "masonry" },
      ],
      defaultValue: "grid",
    },
    {
      label: "间距",
      path: "layout.gap",
      type: "number",
      defaultValue: 4,
      helperText: "图片之间的间距",
    },
    {
      label: "滤镜效果",
      path: "layout.filter",
      type: "select",
      options: [
        { label: "无", value: "none" },
        { label: "混合色相", value: "mix-blend-hue" },
        { label: "灰度", value: "gray" },
        { label: "复古", value: "vintage" },
        { label: "电影感", value: "cinematic" },
      ],
      defaultValue: "none",
    },
    {
      label: "视差速度",
      path: "layout.parallaxSpeed",
      type: "number",
      defaultValue: -0.6,
      helperText:
        "范围 -1 到 0，其中 -1 创建图片固定效果、0 禁用视差。仅网格模式生效",
    },
    {
      label: "容器宽度比例",
      path: "layout.containerWidth",
      type: "number",
      defaultValue: 0.333,
      helperText: "当高度为 1 时，单张照片的宽度为高度的多少倍",
    },
  ],
  groups: [
    {
      title: "内容",
      description: "选择要展示的图片",
      fields: ["images"],
    },
    {
      title: "布局",
      description: "控制画廊的外观",
      fields: [
        "layout.style",
        "layout.gap",
        "layout.filter",
        "layout.parallaxSpeed",
        "layout.containerWidth",
      ],
    },
  ],
  previewData: {
    images: [
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=600&h=900&fit=crop",
      "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&h=500&fit=crop",
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&h=700&fit=crop",
      "https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=600&h=800&fit=crop",
      "https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=600&h=600&fit=crop",
      "https://images.unsplash.com/photo-1770273786039-974fac264caa?w=600&h=600&fit=crop",
    ],
    layout: {
      style: "masonry",
      gap: 4,
      filter: "none",
      parallaxSpeed: -0.6,
      containerWidth: 0.333,
    },
  },
};

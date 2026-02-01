import type { BlockFormConfig } from "@/blocks/core/types/field-config";

/**
 * 作品区块的说明文字（用于 UI 显示）
 */
export const PROJECTS_BLOCK_SCHEMA = {
  worksDescription: {
    header: "Header",
    content: "Content",
    _description:
      "作品上的自定义组件，显示在作品中间，可自定义头部和正文（单行）。正文将会居中显示",
  },
  worksSummary: {
    content: "Summary Content",
    footer: "Footer",
    _description:
      "作品上的自定义组件，显示在最后，可自定义正文（多行）和底部链接",
  },
} as const;

/**
 * 作品区块的表单配置
 */
export const PROJECTS_BLOCK_FORM_CONFIG: BlockFormConfig = {
  blockType: "projects",
  displayName: "Recent Projects Block",
  description: "作品展示区块",
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
      label: "Works Description Header",
      path: "worksDescription.header.value",
      type: "text",
      helperText: PROJECTS_BLOCK_SCHEMA.worksDescription.header,
      placeholder: "Enter header text",
    },
    {
      label: "Works Description Content",
      path: "worksDescription.content",
      type: "text",
      helperText: PROJECTS_BLOCK_SCHEMA.worksDescription.content,
      placeholder: "Enter content (will be centered)",
    },
    {
      label: "Works Summary Content",
      path: "worksSummary.content",
      type: "array",
      helperText: "Summary paragraphs",
      separatorHint: "One paragraph per line",
    },
    {
      label: "Footer Link Text",
      path: "worksSummary.footer.text",
      type: "text",
      helperText: "Link text",
      placeholder: "e.g., View All Projects",
    },
    {
      label: "Footer Link URL",
      path: "worksSummary.footer.link",
      type: "text",
      helperText: "Link URL",
      placeholder: "e.g., /projects",
    },
  ],
  groups: [
    {
      title: "Works Description",
      description: PROJECTS_BLOCK_SCHEMA.worksDescription._description,
      fields: ["worksDescription.header.value", "worksDescription.content"],
    },
    {
      title: "Works Summary",
      description: PROJECTS_BLOCK_SCHEMA.worksSummary._description,
      fields: [
        "worksSummary.content",
        "worksSummary.footer.text",
        "worksSummary.footer.link",
      ],
    },
  ],
  previewData: {
    worksDescription: {
      header: "Header",
      content:
        "A / B / C / D / E / F / G / H / I / J / K / L / M / N / O / P / Q / R / S / T / U / V / W / X / Y / Z",
    },
    worksSummary: {
      content: [
        "Summary Content",
        "这里展示了最新的个人项目和技术实践。",
        "每个项目都体现了对技术的深入探索和创新思维。",
      ],
      footer: {
        text: "Footer",
        link: "/works",
      },
    },
  },
};

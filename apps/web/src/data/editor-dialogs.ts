import type { SelectedTag } from "@/components/client/features/tags/TagInput";
import type { DialogConfig } from "@/types/editor-config";

/**
 * Post 详细信息对话框配置
 */
export const POST_DETAILS_DIALOG_CONFIG: DialogConfig = {
  id: "post-details",
  type: "details",
  title: "文章详细信息",
  size: "lg",
  fieldGroups: [
    {
      title: "基本信息",
      fields: [
        {
          name: "title",
          label: "标题",
          type: "text",
          required: true,
          placeholder: "请输入文章标题",
        },
        {
          name: "slug",
          label: "Slug",
          type: "text",
          helperText: "URL 路径，例如：my-first-post。留空将从标题自动生成",
          placeholder: "my-first-post",
        },
        {
          name: "excerpt",
          label: "摘要",
          type: "textarea",
          rows: 3,
          placeholder: "简短描述文章内容...",
        },
      ],
    },
    {
      title: "分类与标签",
      fields: [
        {
          name: "category",
          label: "分类",
          type: "category",
          helperText: "选择文章所属分类",
        },
        {
          name: "tags",
          label: "标签",
          type: "tags",
          helperText: "输入关键词搜索现有标签，或直接创建新标签",
          multiple: true,
        },
      ],
    },
    {
      title: "发布设置",
      fields: [
        {
          name: "status",
          label: "文章状态",
          type: "select",
          options: [
            { value: "DRAFT", label: "草稿" },
            { value: "PUBLISHED", label: "已发布" },
            { value: "ARCHIVED", label: "已归档" },
          ],
        },
        {
          name: "isPinned",
          label: "置顶文章",
          type: "checkbox",
        },
        {
          name: "allowComments",
          label: "允许评论",
          type: "checkbox",
        },
      ],
    },
    {
      title: "SEO 设置",
      fields: [
        {
          name: "metaDescription",
          label: "SEO 描述",
          type: "textarea",
          rows: 2,
          helperText: "留空则使用文章摘要",
        },
        {
          name: "metaKeywords",
          label: "SEO 关键词",
          type: "text",
          helperText: "多个关键词用逗号分隔",
        },
        {
          name: "robotsIndex",
          label: "允许搜索引擎索引",
          type: "checkbox",
        },
      ],
    },
    {
      title: "特色图片",
      fields: [
        {
          name: "featuredImage",
          label: "特色图片",
          type: "media",
          helperText: "选择或上传文章特色图片",
          multiple: false,
        },
      ],
    },
  ],
};

/**
 * Project 详细信息对话框配置
 */
export const PROJECT_DETAILS_DIALOG_CONFIG: DialogConfig = {
  id: "project-details",
  type: "details",
  title: "项目详细信息",
  size: "lg",
  fieldGroups: [
    {
      title: "基本信息",
      fields: [
        {
          name: "title",
          label: "标题",
          type: "text",
          required: true,
          placeholder: "请输入项目标题",
        },
        {
          name: "slug",
          label: "Slug",
          type: "text",
          helperText:
            "URL 路径，例如：my-awesome-project。留空将从标题自动生成",
          placeholder: "my-awesome-project",
        },
        {
          name: "description",
          label: "描述",
          type: "textarea",
          required: true,
          rows: 3,
          placeholder: "简短描述项目内容...",
        },
        {
          name: "techStack",
          label: "技术栈",
          type: "text",
          helperText: "多个技术栈用逗号分隔",
          placeholder: "React, TypeScript, Tailwind CSS",
        },
      ],
    },
    {
      title: "分类与标签",
      fields: [
        {
          name: "category",
          label: "分类",
          type: "category",
          helperText: "选择项目所属分类",
        },
        {
          name: "tags",
          label: "标签",
          type: "tags",
          helperText: "输入关键词搜索现有标签，或直接创建新标签",
          multiple: true,
        },
      ],
    },
    {
      title: "链接信息",
      fields: [
        {
          name: "demoUrl",
          label: "Demo URL",
          type: "text",
          placeholder: "https://example.com",
        },
        {
          name: "repoUrl",
          label: "仓库 URL",
          type: "text",
          helperText: "https://github.com/user/repo",
          placeholder: "https://github.com/user/repo",
        },
      ],
    },
    {
      title: "发布设置",
      fields: [
        {
          name: "status",
          label: "项目状态",
          type: "select",
          options: [
            { value: "DRAFT", label: "草稿" },
            { value: "PUBLISHED", label: "已发布" },
            { value: "ARCHIVED", label: "已归档" },
            { value: "Developing", label: "开发中" },
          ],
        },
        {
          name: "startedAt",
          label: "开始时间",
          type: "date",
        },
      ],
    },
    {
      title: "GitHub 同步",
      fields: [
        {
          name: "repoPath",
          label: "仓库路径",
          type: "text",
          helperText: "用于 GitHub API 同步，例如：RavelloH/NeutralPress",
          placeholder: "RavelloH/NeutralPress",
        },
        {
          name: "license",
          label: "开源许可证",
          type: "text",
          helperText: "项目的开源许可证类型，例如：MIT",
          placeholder: "MIT",
        },
        {
          name: "enableGithubSync",
          label: "启用 GitHub 同步",
          type: "checkbox",
        },
        {
          name: "enableConentSync",
          label: "同步 README 到内容",
          type: "checkbox",
        },
      ],
    },
    {
      title: "特色图片",
      fields: [
        {
          name: "featuredImages",
          label: "特色图片",
          type: "media",
          helperText: "选择或上传项目的特色图片",
          multiple: true,
        },
      ],
    },
  ],
};

/**
 * Post 确认对话框配置
 */
export const createPostConfirmDialogConfig = (
  isEditMode: boolean,
  action: "draft" | "publish",
): DialogConfig => ({
  id: "post-confirm",
  type: "confirm",
  title: isEditMode
    ? "确认保存"
    : action === "publish"
      ? "确认发布"
      : "确认保存为草稿",
  size: "lg",
});

/**
 * Project 确认对话框配置
 */
export const createProjectConfirmDialogConfig = (
  isEditMode: boolean,
  action: "draft" | "publish",
): DialogConfig => ({
  id: "project-confirm",
  type: "confirm",
  title: isEditMode
    ? "确认保存"
    : action === "publish"
      ? "确认发布"
      : "确认保存为草稿",
  size: "lg",
});

/**
 * 默认 Post 表单数据
 */
export const createDefaultPostFormData = () => ({
  title: "",
  slug: "",
  excerpt: "",
  status: "DRAFT",
  isPinned: false,
  allowComments: true,
  robotsIndex: true,
  metaDescription: "",
  metaKeywords: "",
  featuredImage: "",
  category: null as string | null,
  tags: [] as SelectedTag[],
});

/**
 * 默认 Project 表单数据
 */
export const createDefaultProjectFormData = () => ({
  title: "",
  slug: "",
  description: "",
  status: "DRAFT",
  demoUrl: "",
  repoUrl: "",
  techStack: [] as string[],
  repoPath: "",
  license: "",
  enableGithubSync: false,
  enableConentSync: false,
  featuredImages: [] as string[],
  startedAt: "",
  category: null as string | null,
  tags: [] as SelectedTag[],
});

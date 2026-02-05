import { createPost, updatePost } from "@/actions/post";
import { createProject, updateProject } from "@/actions/project";
import type { EditorConfig } from "@/types/editor-config";

/**
 * Post 编辑器预设配置
 */
export const POST_EDITOR_CONFIG: EditorConfig = {
  entityType: "post",
  storageKey: "post",
  availableModes: ["visual", "markdown", "mdx"],
  defaultMode: "visual",

  fieldConfig: {
    basic: {
      title: true,
      slug: true,
      excerpt: true,
    },
    taxonomy: {
      category: true,
      tags: true,
    },
    publish: {
      status: true,
      isPinned: true,
      allowComments: true,
    },
    seo: {
      metaDescription: true,
      metaKeywords: true,
      robotsIndex: true,
    },
    featuredImage: {
      enabled: true,
      multiple: false,
    },
  },

  extraActions: [],

  saveConfig: {
    createAction: createPost,
    updateAction: updatePost,
    successRedirectPath: "/admin/posts",
    commitMessageEnabled: true,
  },
};

/**
 * Project 编辑器预设配置
 */
export const PROJECT_EDITOR_CONFIG: EditorConfig = {
  entityType: "project",
  storageKey: "project",
  availableModes: ["visual", "markdown"], // 不支持 MDX
  defaultMode: "visual",

  fieldConfig: {
    basic: {
      title: true,
      slug: true,
      description: true,
    },
    taxonomy: {
      category: true,
      tags: true,
    },
    publish: {
      status: true,
    },
    featuredImage: {
      enabled: true,
      multiple: true, // 支持多张图片
    },
    project: {
      demoUrl: true,
      repoUrl: true,
      techStack: true,
      startedAt: true,
      githubSettings: true,
      license: true,
    },
  },

  extraActions: [
    {
      id: "github-sync",
      label: "GitHub 同步",
      icon: null, // 将在使用处提供
      variant: "ghost" as const,
      onClick: async () => {
        // 实际实现在 Editor 组件中通过 onExtraAction 回调处理
      },
      showWhen: (formData) => {
        return Boolean(formData.enableGithubSync && formData.repoPath);
      },
    },
  ],

  saveConfig: {
    createAction: createProject,
    updateAction: updateProject,
    successRedirectPath: "/admin/projects",
    commitMessageEnabled: false,
  },
};

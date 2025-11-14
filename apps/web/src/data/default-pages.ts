/**
 * 默认页面数据
 * 定义系统初始化时创建的默认页面
 */

// Prisma Json 类型定义
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

export interface DefaultPage {
  id: string;
  title: string;
  slug: string;
  content: string; // Markdown/HTML/MDX 文本内容
  contentType?: "MARKDOWN" | "HTML" | "MDX";
  config?: JsonValue; // 页面配置（用于系统页面的显示设置）
  excerpt?: string;
  status: "DRAFT" | "ACTIVE" | "SUSPENDED";
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  isSystemPage?: boolean; // 是否为系统预设页面
}

/**
 * 默认页面列表
 * 系统页面（isSystemPage: true）：由系统逻辑渲染，可通过 config 配置显示行为
 * 自定义页面（isSystemPage: false）：通过 content 字段存储用户自定义内容
 */
export const defaultPages: DefaultPage[] = [
  {
    id: "home-page",
    title: "首页",
    slug: "/",
    content: "",
    contentType: "MARKDOWN",
    config: {},
    excerpt: "欢迎来到 NeutralPress - 现代化的内容管理系统",
    status: "ACTIVE",
    isSystemPage: true,
  },
  {
    id: "projects-page",
    title: "作品",
    slug: "/projects",
    content: "",
    contentType: "MARKDOWN",
    config: {},
    excerpt: "作品展示页面",
    status: "ACTIVE",
    isSystemPage: true,
  },
  {
    id: "posts-page",
    title: "文章",
    slug: "/posts",
    content: "",
    contentType: "MARKDOWN",
    config: {},
    excerpt: "文章列表页面",
    status: "ACTIVE",
    isSystemPage: true,
  },
  {
    id: "categories-page",
    title: "分类",
    slug: "/categories",
    content: "",
    contentType: "MARKDOWN",
    config: {},
    excerpt: "文章分类页面",
    status: "ACTIVE",
    isSystemPage: true,
  },
  {
    id: "tags-page",
    title: "标签",
    slug: "/tags",
    content: "",
    contentType: "MARKDOWN",
    config: {},
    excerpt: "文章标签页面",
    status: "ACTIVE",
    isSystemPage: true,
  },
  {
    id: "friends-page",
    title: "友链",
    slug: "/friends",
    content: "",
    contentType: "MARKDOWN",
    config: {},
    excerpt: "友情链接页面",
    status: "ACTIVE",
    isSystemPage: true,
  },
  {
    id: "about-page",
    title: "关于",
    slug: "/about",
    content: "",
    contentType: "MARKDOWN",
    config: {},
    excerpt: "关于页面",
    status: "ACTIVE",
    isSystemPage: true,
  },
];

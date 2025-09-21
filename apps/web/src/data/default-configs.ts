/**
 * 默认配置数据
 * 这些配置将在首次运行时添加到数据库中
 */

// Prisma Json 类型定义
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

export interface DefaultConfig {
  key: string;
  value: JsonValue;
  description?: string;
}

export interface DefaultPage {
  id: string;
  title: string;
  slug: string;
  content: JsonValue;
  excerpt?: string;
  status: "DRAFT" | "ACTIVE" | "SUSPENDED";
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  isDefault?: boolean;
}

export interface DefaultMenu {
  id: string;
  name: string;
  icon?: string;
  link?: string;
  slug?: string;
  status: "ACTIVE" | "SUSPENDED";
  order: number;
  category: "MAIN" | "COMMON" | "OUTSITE";
  pageId?: string;
}

// 网站基础配置
export const defaultConfigs: DefaultConfig[] = [
  // =====================================
  // 网站基础配置
  // =====================================
  {
    key: "site.title",
    value: { default: "NeutralPress" },
    description: "网站标题",
  },
  {
    key: "site.url",
    value: { default: "https://example.com" },
    description: "网站主域名地址",
  },
  {
    key: "site.author",
    value: { default: "RavelloH" },
    description: "网站作者或团队名称",
  },
  {
    key: "site.theme_color",
    value: { default: "#000000" },
    description: "网站主题颜色，影响浏览器UI",
  },
  // =====================================
  // 网站SEO配置
  // =====================================
  {
    key: "site.seo.description",
    value: { default: "一个现代化的内容管理系统" },
    description: "网站默认SEO描述",
  },
  {
    key: "site.seo.keywords",
    value: { default: ["CMS", "Blog", "NeutralPress"] },
    description: "网站SEO关键词",
  },
  {
    key: "site.seo.category",
    value: { default: "Technology" },
    description: "网站分类，用于SEO优化（可留空）",
  },
  {
    key: "site.seo.country",
    value: { default: "China" },
    description: "网站所属国家，用于SEO优化（可留空）",
  },

  {
    key: "site.seo.twitter_site",
    value: { default: "@neutralpress" },
    description: "官方Twitter账号（不带@符号，可留空）",
  },
  {
    key: "site.seo.twitter_creator",
    value: { default: "@neutralpress" },
    description: "内容创建者Twitter账号（不带@符号，可留空）",
  },
  {
    key: "site.seo.google_verification",
    value: { default: "" },
    description: "Google Search Console网站验证码（可留空）",
  },
  // =====================================
  // 用户相关配置
  // =====================================
  {
    key: "user.registration.enabled",
    value: { default: true },
    description: "是否允许用户注册",
  },
  {
    key: "user.email.verification.required",
    value: { default: true },
    description: "是否需要邮箱验证",
  },
  // =====================================
  // 内容相关配置
  // =====================================
  {
    key: "content.comments.enabled",
    value: { default: true },
    description: "是否启用评论功能",
  },
  // =====================================
  // 媒体相关配置
  // =====================================
  {
    key: "media.upload.allowed_types",
    value: { default: ["image/jpeg", "image/png", "image/gif", "image/webp"] },
    description: "允许上传的媒体文件类型",
  },
];

// 默认页面数据
export const defaultPages: DefaultPage[] = [
  {
    id: "home-page",
    title: "首页",
    slug: "/",
    content: {},
    excerpt: "欢迎来到 NeutralPress - 现代化的内容管理系统",
    status: "ACTIVE",
    isDefault: true,
  },
  {
    id: "works-page",
    title: "作品",
    slug: "/works",
    content: {},
    excerpt: "作品展示页面",
    status: "ACTIVE",
    isDefault: true,
  },
  {
    id: "posts-page",
    title: "文章",
    slug: "/posts",
    content: {},
    excerpt: "文章列表页面",
    status: "ACTIVE",
    isDefault: true,
  },
  {
    id: "categories-page",
    title: "分类",
    slug: "/categories",
    content: {},
    excerpt: "文章分类页面",
    status: "ACTIVE",
    isDefault: true,
  },
  {
    id: "tags-page",
    title: "标签",
    slug: "/tags",
    content: {},
    excerpt: "文章标签页面",
    status: "ACTIVE",
    isDefault: true,
  },
  {
    id: "friends-page",
    title: "友链",
    slug: "/friends",
    content: {},
    excerpt: "友情链接页面",
    status: "ACTIVE",
    isDefault: true,
  },
  {
    id: "about-page",
    title: "关于",
    slug: "/about",
    content: {},
    excerpt: "关于页面",
    status: "ACTIVE",
    isDefault: true,
  },
];

// 默认菜单数据
export const defaultMenus: DefaultMenu[] = [
  {
    id: "menu-home",
    name: "首页",
    status: "ACTIVE",
    order: 1,
    category: "MAIN",
    pageId: "home-page",
  },
  {
    id: "menu-works",
    name: "作品",
    status: "ACTIVE",
    order: 2,
    category: "MAIN",
    pageId: "works-page",
  },
  {
    id: "menu-posts",
    name: "文章",
    status: "ACTIVE",
    order: 3,
    category: "MAIN",
    pageId: "posts-page",
  },
  {
    id: "menu-categories",
    name: "分类",
    status: "ACTIVE",
    order: 4,
    category: "MAIN",
    pageId: "categories-page",
  },
  {
    id: "menu-tags",
    name: "标签",
    status: "ACTIVE",
    order: 5,
    category: "MAIN",
    pageId: "tags-page",
  },
  {
    id: "menu-friends",
    name: "友链",
    status: "ACTIVE",
    order: 6,
    category: "MAIN",
    pageId: "friends-page",
  },
  {
    id: "menu-about",
    name: "关于",
    status: "ACTIVE",
    order: 7,
    category: "MAIN",
    pageId: "about-page",
  },
];

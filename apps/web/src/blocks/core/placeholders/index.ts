/**
 * 插值器索引
 * 导出所有可用的插值器
 */

export { postsInterpolator } from "./posts";
export { projectsInterpolator } from "./projects";
export { tagPostsInterpolator } from "./tag-posts";
export { tagsInterpolator } from "./tags";

/**
 * 插值器类型定义
 * 支持接收可选的参数对象
 */
export type Interpolator = (
  params?: Record<string, string>,
) => Promise<Record<string, unknown>>;

/**
 * 插值器加载器类型
 */
export type InterpolatorLoader = () => Promise<{ [key: string]: Interpolator }>;

/**
 * 插值器映射表
 * key: 占位符名称（不含花括号）
 * value: 返回该数据的插值器函数加载器
 */
export const interpolatorMap: Record<string, InterpolatorLoader> = {
  posts: () => import("./posts"),
  projects: () => import("./projects"),
  tagPosts: () => import("./tag-posts"),
  tags: () => import("./tags"),
};

/**
 * 占位符参数元数据
 */
export interface PlaceholderParamMeta {
  name: string;
  description: string;
}

/**
 * 占位符元数据类型
 */
export interface PlaceholderMeta {
  /** 占位符名称（不含花括号） */
  name: string;
  /** 占位符描述 */
  description: string;
  /** 对应的插值器 key */
  interpolator: string;
  /** 是否为子占位符（由插值器返回的对象字段） */
  isSubField?: boolean;
  /** 占位符参数列表（用于参数化占位符） */
  params?: PlaceholderParamMeta[];
}

/**
 * 占位符注册表
 * 统一注册所有可用的占位符及其描述
 */
export const PLACEHOLDER_REGISTRY: PlaceholderMeta[] = [
  // Posts 插值器占位符
  {
    name: "posts",
    description: "显示当前总文章数",
    interpolator: "posts",
  },
  // Projects 插值器占位符
  {
    name: "projects",
    description: "显示当前总项目数",
    interpolator: "projects",
  },
  // TagPosts 插值器占位符（参数化）
  // {
  //   name: "tagPosts",
  //   description: "显示单个标签的详细信息（参数：slug, page）",
  //   interpolator: "tagPosts",
  //   params: [
  //     { name: "slug", description: "标签 slug" },
  //     { name: "page", description: "页码（默认 1）" },
  //   ],
  // },
  {
    name: "tag",
    description: "标签名称",
    interpolator: "tagPosts",
    isSubField: true,
  },
  {
    name: "tagDescription",
    description: "标签描述",
    interpolator: "tagPosts",
    isSubField: true,
  },
  {
    name: "page",
    description: "当前页码",
    interpolator: "tagPosts",
    isSubField: true,
  },
  {
    name: "totalPage",
    description: "总页数",
    interpolator: "tagPosts",
    isSubField: true,
  },
  {
    name: "firstPage",
    description: "当前页第一篇文章序号",
    interpolator: "tagPosts",
    isSubField: true,
  },
  {
    name: "lastPage",
    description: "当前页最后一篇文章序号",
    interpolator: "tagPosts",
    isSubField: true,
  },
  // Tags 插值器占位符
  {
    name: "tags",
    description: "显示当前总标签数",
    interpolator: "tags",
  },
  {
    name: "lastUpdatedDays",
    description: "显示最近更新于几天前",
    interpolator: "tags",
    isSubField: true,
  },
  {
    name: "pageInfo",
    description: "显示当前页面信息",
    interpolator: "tags",
    isSubField: true,
  },
];

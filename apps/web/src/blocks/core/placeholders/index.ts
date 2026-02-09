/**
 * 插值器索引
 * 导出所有可用的插值器
 */

export { categoriesInterpolator } from "./categories";
export { categoryPostsInterpolator } from "./category-posts";
export { postsInterpolator } from "./posts";
export { projectsInterpolator } from "./projects";
export { tagPostsInterpolator } from "./tag-posts";
export { tagsInterpolator } from "./tags";
export { postsListInterpolator } from "./posts-list";
export { lastPublishDaysInterpolator } from "./last-publish-days";
export { friendsInterpolator } from "./friends";
export { pageInfoInterpolator } from "./page-info";

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
  categories: () => import("./categories"),
  categoryPosts: () => import("./category-posts"),
  posts: () => import("./posts"),
  projects: () => import("./projects"),
  tagPosts: () => import("./tag-posts"),
  tags: () => import("./tags"),
  postsList: () => import("./posts-list"),
  lastPublishDays: () => import("./last-publish-days"),
  pageInfo: () => import("./page-info"),
  friends: () => import("./friends"),
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
 * 规范：
 * 1. 每个插值器只负责一个字段或高度关联的字段组
 * 2. 相同名称的占位符只注册一次，避免重复
 * 3. 需要参数的占位符必须显式声明所有可选参数
 * 4. 占位符命名遵循统一风格：全局统计用简洁名称，上下文相关添加前缀
 */
export const PLACEHOLDER_REGISTRY: PlaceholderMeta[] = [
  // === 全局统计（无需上下文） ===
  {
    name: "lastPublishDays",
    description: "最近更新日期（全局统一，显示最后一篇更新文章的时间）",
    interpolator: "lastPublishDays",
  },
  {
    name: "pageInfo",
    description: "页面信息（需要 page 参数）",
    interpolator: "pageInfo",
    params: [
      {
        name: "page",
        description:
          "页面类型：category-index, category-detail, tag-index, tag-detail, posts-index, normal",
      },
      {
        name: "slug",
        description: "分类或标签的 slug（用于详情页）",
      },
    ],
  },
  {
    name: "posts",
    description: "显示当前总文章数",
    interpolator: "posts",
  },
  {
    name: "projects",
    description: "显示当前总项目数",
    interpolator: "projects",
  },

  // === 分类相关（categories 插值器） ===
  {
    name: "categories",
    description: "显示当前总分类数",
    interpolator: "categories",
  },
  {
    name: "rootCategories",
    description: "显示根分类数",
    interpolator: "categories",
    isSubField: true,
  },
  {
    name: "childCategories",
    description: "显示子分类数",
    interpolator: "categories",
    isSubField: true,
  },
  {
    name: "categoriesList",
    description: "分类链接列表（用于随机跳转）",
    interpolator: "categories",
    isSubField: true,
  },

  // === 分类相关（categoryPosts 插值器） ===
  {
    name: "category",
    description: "分类名称",
    interpolator: "categoryPosts",
    isSubField: true,
  },
  {
    name: "categoryName",
    description: "分类名称",
    interpolator: "categoryPosts",
    isSubField: true,
  },
  {
    name: "categoryDescription",
    description: "分类描述",
    interpolator: "categoryPosts",
    isSubField: true,
  },
  {
    name: "categorySubcategoryCount",
    description: "当前分类的子分类数",
    interpolator: "categoryPosts",
    isSubField: true,
  },
  {
    name: "categoryPostCount",
    description: "当前分类下的文章数",
    interpolator: "categoryPosts",
    isSubField: true,
  },
  {
    name: "categoryPage",
    description: "分类详情页当前页码",
    interpolator: "categoryPosts",
    isSubField: true,
  },
  {
    name: "categoryTotalPage",
    description: "分类详情页总页数",
    interpolator: "categoryPosts",
    isSubField: true,
  },
  {
    name: "categoryFirstPage",
    description: "分类详情页当前页第一篇文章序号",
    interpolator: "categoryPosts",
    isSubField: true,
  },
  {
    name: "categoryLastPage",
    description: "分类详情页当前页最后一篇文章序号",
    interpolator: "categoryPosts",
    isSubField: true,
  },

  // === 文章列表相关（postsList 插值器） ===
  {
    name: "postsList",
    description: "文章链接列表（用于随机跳转）",
    interpolator: "postsList",
    isSubField: true,
  },
  {
    name: "firstPublishAt",
    description: "首次发布日期",
    interpolator: "postsList",
    isSubField: true,
  },
  {
    name: "postsListPage",
    description: "文章列表页当前页码",
    interpolator: "postsList",
    isSubField: true,
  },
  {
    name: "postsListTotalPage",
    description: "文章列表页总页数",
    interpolator: "postsList",
    isSubField: true,
  },
  {
    name: "postsListFirstPage",
    description: "文章列表页当前页第一篇文章序号",
    interpolator: "postsList",
    isSubField: true,
  },
  {
    name: "postsListLastPage",
    description: "文章列表页当前页最后一篇文章序号",
    interpolator: "postsList",
    isSubField: true,
  },

  // === 标签相关（tags 插值器） ===
  {
    name: "tags",
    description: "显示当前总标签数",
    interpolator: "tags",
  },
  {
    name: "tagsList",
    description: "标签链接列表（用于随机跳转）",
    interpolator: "tags",
    isSubField: true,
  },

  // === 标签相关（tagPosts 插值器） ===
  {
    name: "tag",
    description: "标签名称",
    interpolator: "tagPosts",
    isSubField: true,
  },
  {
    name: "tagName",
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
    name: "tagPostCount",
    description: "当前标签下的文章数",
    interpolator: "tagPosts",
    isSubField: true,
  },
  {
    name: "tagPage",
    description: "标签详情页当前页码",
    interpolator: "tagPosts",
    isSubField: true,
  },
  {
    name: "tagTotalPage",
    description: "标签详情页总页数",
    interpolator: "tagPosts",
    isSubField: true,
  },
  {
    name: "tagFirstPage",
    description: "标签详情页当前页第一篇文章序号",
    interpolator: "tagPosts",
    isSubField: true,
  },
  {
    name: "tagLastPage",
    description: "标签详情页当前页最后一篇文章序号",
    interpolator: "tagPosts",
    isSubField: true,
  },

  // === 友链相关（friends 插值器） ===
  {
    name: "friends",
    description: "显示当前友链总数",
    interpolator: "friends",
  },
];

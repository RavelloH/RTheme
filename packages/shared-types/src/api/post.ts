import { z } from "zod";
import { createSuccessResponseSchema, registerSchema } from "./common.js";

/*
    getPostsTrends() Schema
*/
export const GetPostsTrendsSchema = z.object({
  access_token: z.string().optional(),
  days: z.number().int().positive().default(365),
  count: z.number().int().positive().default(30),
});
export type GetPostsTrends = z.infer<typeof GetPostsTrendsSchema>;
registerSchema("GetPostsTrends", GetPostsTrendsSchema);

export const PostTrendItemSchema = z.object({
  time: z.string(),
  data: z.object({
    total: z.number().int().nonnegative(),
    new: z.number().int().nonnegative(),
    draft: z.number().int().nonnegative(),
  }),
});
export type PostTrendItem = z.infer<typeof PostTrendItemSchema>;

export const GetPostsTrendsSuccessResponseSchema = createSuccessResponseSchema(
  z.array(PostTrendItemSchema),
);
export type GetPostsTrendsSuccessResponse = z.infer<
  typeof GetPostsTrendsSuccessResponseSchema
>;
registerSchema(
  "GetPostsTrendsSuccessResponse",
  GetPostsTrendsSuccessResponseSchema,
);

/*
    getPostsList() Schema
*/
export const GetPostsListSchema = z.object({
  access_token: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(25),
  sortBy: z
    .enum(["id", "title", "publishedAt", "updatedAt", "createdAt"])
    .optional()
    .default("id"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  search: z.string().optional(),
});
export type GetPostsList = z.infer<typeof GetPostsListSchema>;
registerSchema("GetPostsList", GetPostsListSchema);

export const PostListItemSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  isPinned: z.boolean(),
  allowComments: z.boolean(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: z.object({
    uid: z.number().int(),
    username: z.string(),
    nickname: z.string().nullable(),
  }),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  // SEO 和其他字段
  featuredImage: z.string().nullable(),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  metaKeywords: z.string().nullable(),
  robotsIndex: z.boolean(),
  postMode: z.enum(["MARKDOWN", "MDX"]),
});
export type PostListItem = z.infer<typeof PostListItemSchema>;

export const GetPostsListSuccessResponseSchema = createSuccessResponseSchema(
  z.array(PostListItemSchema),
);
export type GetPostsListSuccessResponse = z.infer<
  typeof GetPostsListSuccessResponseSchema
>;
registerSchema(
  "GetPostsListSuccessResponse",
  GetPostsListSuccessResponseSchema,
);

/*
    getPostDetail() Schema
*/
export const GetPostDetailSchema = z.object({
  access_token: z.string().optional(),
  slug: z.string().min(1, "slug 不能为空"),
});
export type GetPostDetail = z.infer<typeof GetPostDetailSchema>;
registerSchema("GetPostDetail", GetPostDetailSchema);

export const PostDetailSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  excerpt: z.string().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  isPinned: z.boolean(),
  allowComments: z.boolean(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: z.object({
    uid: z.number().int(),
    username: z.string(),
    nickname: z.string().nullable(),
  }),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  featuredImage: z.string().nullable(),
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  metaKeywords: z.string().nullable(),
  robotsIndex: z.boolean(),
  postMode: z.enum(["MARKDOWN", "MDX"]),
});
export type PostDetail = z.infer<typeof PostDetailSchema>;

export const GetPostDetailSuccessResponseSchema =
  createSuccessResponseSchema(PostDetailSchema);
export type GetPostDetailSuccessResponse = z.infer<
  typeof GetPostDetailSuccessResponseSchema
>;
registerSchema(
  "GetPostDetailSuccessResponse",
  GetPostDetailSuccessResponseSchema,
);

/*
    updatePosts() Schema
*/
export const UpdatePostsSchema = z.object({
  access_token: z.string().optional(),
  ids: z.array(z.number().int().positive()).min(1, "必须提供至少一个文章 ID"),
  // 批量操作字段
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  isPinned: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  // 单个文章编辑字段
  title: z.string().optional(),
  slug: z.string().optional(),
  excerpt: z.string().max(500).optional(),
  featuredImage: z.string().max(255).optional(),
  metaTitle: z.string().max(60).optional(),
  metaDescription: z.string().max(160).optional(),
  metaKeywords: z.string().max(255).optional(),
  robotsIndex: z.boolean().optional(),
  postMode: z.enum(["MARKDOWN", "MDX"]).optional(),
});
export type UpdatePosts = z.infer<typeof UpdatePostsSchema>;
registerSchema("UpdatePosts", UpdatePostsSchema);

export const UpdatePostsResultSchema = z.object({
  updated: z.number().int().nonnegative(),
});
export type UpdatePostsResult = z.infer<typeof UpdatePostsResultSchema>;

export const UpdatePostsSuccessResponseSchema = createSuccessResponseSchema(
  UpdatePostsResultSchema,
);
export type UpdatePostsSuccessResponse = z.infer<
  typeof UpdatePostsSuccessResponseSchema
>;
registerSchema("UpdatePostsSuccessResponse", UpdatePostsSuccessResponseSchema);

/*
    createPost() Schema
*/
export const CreatePostSchema = z.object({
  access_token: z.string().optional(),
  title: z.string().min(1, "标题不能为空").max(255, "标题过长"),
  slug: z.string().min(1, "slug 不能为空").max(255, "slug 过长"),
  content: z.string().min(1, "内容不能为空"),
  excerpt: z.string().max(500, "摘要过长").optional(),
  featuredImage: z.string().max(255, "图片 URL 过长").optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  isPinned: z.boolean().default(false),
  allowComments: z.boolean().default(true),
  publishedAt: z.string().optional(), // ISO 时间字符串
  metaTitle: z.string().max(60, "SEO 标题过长").optional(),
  metaDescription: z.string().max(160, "SEO 描述过长").optional(),
  metaKeywords: z.string().max(255, "SEO 关键词过长").optional(),
  robotsIndex: z.boolean().default(true),
  categories: z.array(z.string()).optional(), // 分类名称数组
  tags: z.array(z.string()).optional(), // 标签名称数组
  commitMessage: z.string().optional(), // 版本提交信息（可选）
  postMode: z.enum(["MARKDOWN", "MDX"]).default("MARKDOWN"), // 编辑器模式
});
export type CreatePost = z.infer<typeof CreatePostSchema>;
registerSchema("CreatePost", CreatePostSchema);

export const CreatePostResultSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
});
export type CreatePostResult = z.infer<typeof CreatePostResultSchema>;

export const CreatePostSuccessResponseSchema = createSuccessResponseSchema(
  CreatePostResultSchema,
);
export type CreatePostSuccessResponse = z.infer<
  typeof CreatePostSuccessResponseSchema
>;
registerSchema("CreatePostSuccessResponse", CreatePostSuccessResponseSchema);

/*
    updatePost() Schema - 更新单篇文章
*/
export const UpdatePostSchema = z.object({
  access_token: z.string().optional(),
  slug: z.string().min(1, "slug 不能为空"), // 用于标识要更新的文章
  title: z.string().min(1, "标题不能为空").max(255, "标题过长").optional(),
  newSlug: z.string().min(1, "slug 不能为空").max(255, "slug 过长").optional(), // 新的 slug（如果要修改）
  content: z.string().min(1, "内容不能为空").optional(),
  excerpt: z.string().max(500, "摘要过长").optional(),
  featuredImage: z.string().max(255, "图片 URL 过长").optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  isPinned: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  publishedAt: z.string().optional(), // ISO 时间字符串
  metaTitle: z.string().max(60, "SEO 标题过长").optional(),
  metaDescription: z.string().max(160, "SEO 描述过长").optional(),
  metaKeywords: z.string().max(255, "SEO 关键词过长").optional(),
  robotsIndex: z.boolean().optional(),
  categories: z.array(z.string()).optional(), // 分类名称数组
  tags: z.array(z.string()).optional(), // 标签名称数组
  commitMessage: z.string().optional(), // 版本提交信息（可选）
  postMode: z.enum(["MARKDOWN", "MDX"]).optional(), // 编辑器模式
});
export type UpdatePost = z.infer<typeof UpdatePostSchema>;
registerSchema("UpdatePost", UpdatePostSchema);

export const UpdatePostResultSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
});
export type UpdatePostResult = z.infer<typeof UpdatePostResultSchema>;

export const UpdatePostSuccessResponseSchema = createSuccessResponseSchema(
  UpdatePostResultSchema,
);
export type UpdatePostSuccessResponse = z.infer<
  typeof UpdatePostSuccessResponseSchema
>;
registerSchema("UpdatePostSuccessResponse", UpdatePostSuccessResponseSchema);

/*
    deletePosts() Schema
*/
export const DeletePostsSchema = z.object({
  access_token: z.string().optional(),
  ids: z.array(z.number().int().positive()).min(1, "必须提供至少一个文章 ID"),
});
export type DeletePosts = z.infer<typeof DeletePostsSchema>;
registerSchema("DeletePosts", DeletePostsSchema);

export const DeletePostsResultSchema = z.object({
  deleted: z.number().int().nonnegative(),
});
export type DeletePostsResult = z.infer<typeof DeletePostsResultSchema>;

export const DeletePostsSuccessResponseSchema = createSuccessResponseSchema(
  DeletePostsResultSchema,
);
export type DeletePostsSuccessResponse = z.infer<
  typeof DeletePostsSuccessResponseSchema
>;
registerSchema("DeletePostsSuccessResponse", DeletePostsSuccessResponseSchema);

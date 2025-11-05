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

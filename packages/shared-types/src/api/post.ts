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
    personal: z.number().int().nonnegative(),
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
    .enum(["id", "title", "publishedAt", "updatedAt", "createdAt", "viewCount"])
    .optional()
    .default("id"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  status: z.array(z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"])).optional(),
  search: z.string().optional(),
  // 筛选参数
  id: z.number().int().optional(),
  authorUid: z.number().int().optional(),
  isPinned: z.array(z.boolean()).optional(),
  allowComments: z.array(z.boolean()).optional(),
  robotsIndex: z.array(z.boolean()).optional(),
  publishedAtStart: z.string().datetime().optional(),
  publishedAtEnd: z.string().datetime().optional(),
  updatedAtStart: z.string().datetime().optional(),
  updatedAtEnd: z.string().datetime().optional(),
  createdAtStart: z.string().datetime().optional(),
  createdAtEnd: z.string().datetime().optional(),
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
  tags: z.array(
    z.object({
      name: z.string(),
      slug: z.string(),
    }),
  ),
  // SEO 和其他字段
  featuredImage: z.string().nullable(),
  metaDescription: z.string().nullable(),
  metaKeywords: z.string().nullable(),
  robotsIndex: z.boolean(),
  postMode: z.enum(["MARKDOWN", "MDX"]),
  // 统计数据
  viewCount: z.number().int().default(0),
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
  slug: z.string().max(255, "slug 过长").optional(), // 可选，未提供时从标题自动生成
  content: z.string().min(1, "内容不能为空"),
  excerpt: z.string().max(500, "摘要过长").optional(),
  featuredImage: z.string().max(255, "图片 URL 过长").optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  isPinned: z.boolean().default(false),
  allowComments: z.boolean().default(true),
  publishedAt: z.string().optional(), // ISO 时间字符串
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

/*
    getPostHistory() Schema - 获取文章历史版本列表
*/
export const GetPostHistorySchema = z.object({
  access_token: z.string().optional(),
  slug: z.string().min(1, "slug 不能为空"),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(500).default(25),
  sortBy: z.enum(["timestamp"]).optional().default("timestamp"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});
export type GetPostHistory = z.infer<typeof GetPostHistorySchema>;
registerSchema("GetPostHistory", GetPostHistorySchema);

export const PostHistoryItemSchema = z.object({
  versionName: z.string(), // 完整版本名: userUid:timestamp:commitMessage
  timestamp: z.string(), // ISO 日期字符串，用作版本唯一标识
  commitMessage: z.string(), // 提交信息
  userUid: z.number().int(), // 提交者 UID
  username: z.string(), // 提交者用户名
  nickname: z.string().nullable(), // 提交者昵称
  isSnapshot: z.boolean(), // 是否为快照版本
});
export type PostHistoryItem = z.infer<typeof PostHistoryItemSchema>;

// 文章历史统计信息
export const PostHistoryStatsSchema = z.object({
  totalEdits: z.number().int().nonnegative(), // 总编辑次数
  editTimestamps: z.array(z.string()), // 编辑时间列表（ISO 日期字符串）
  editors: z.array(
    z.object({
      userUid: z.number().int(),
      username: z.string(),
      nickname: z.string().nullable(),
    }),
  ), // 编辑人列表（去重）
});
export type PostHistoryStats = z.infer<typeof PostHistoryStatsSchema>;

// 带统计信息的历史响应数据
export const PostHistoryWithStatsSchema = z.object({
  stats: PostHistoryStatsSchema, // 统计信息
  versions: z.array(PostHistoryItemSchema), // 版本列表（已分页）
});
export type PostHistoryWithStats = z.infer<typeof PostHistoryWithStatsSchema>;

export const GetPostHistorySuccessResponseSchema = createSuccessResponseSchema(
  PostHistoryWithStatsSchema,
);
export type GetPostHistorySuccessResponse = z.infer<
  typeof GetPostHistorySuccessResponseSchema
>;
registerSchema(
  "GetPostHistorySuccessResponse",
  GetPostHistorySuccessResponseSchema,
);

/*
    getPostVersion() Schema - 获取指定版本的内容
*/
export const GetPostVersionSchema = z.object({
  access_token: z.string().optional(),
  slug: z.string().min(1, "slug 不能为空"),
  timestamp: z.string().optional(), // ISO 日期字符串，未提供时返回最新版本
});
export type GetPostVersion = z.infer<typeof GetPostVersionSchema>;
registerSchema("GetPostVersion", GetPostVersionSchema);

export const PostVersionDetailSchema = z.object({
  versionName: z.string(),
  timestamp: z.string(),
  commitMessage: z.string(),
  userUid: z.number().int(),
  username: z.string(),
  nickname: z.string().nullable(),
  isSnapshot: z.boolean(),
  content: z.string(), // 该版本的完整内容
});
export type PostVersionDetail = z.infer<typeof PostVersionDetailSchema>;

export const GetPostVersionSuccessResponseSchema = createSuccessResponseSchema(
  PostVersionDetailSchema,
);
export type GetPostVersionSuccessResponse = z.infer<
  typeof GetPostVersionSuccessResponseSchema
>;
registerSchema(
  "GetPostVersionSuccessResponse",
  GetPostVersionSuccessResponseSchema,
);

/*
    resetPostToVersion() Schema - 重置文章到指定版本
*/
export const ResetPostToVersionSchema = z.object({
  access_token: z.string().optional(),
  slug: z.string().min(1, "slug 不能为空"),
  timestamp: z.string().min(1, "timestamp 不能为空"),
});
export type ResetPostToVersion = z.infer<typeof ResetPostToVersionSchema>;
registerSchema("ResetPostToVersion", ResetPostToVersionSchema);

export const ResetPostToVersionResultSchema = z.object({
  slug: z.string(),
  deletedVersionsCount: z.number().int().nonnegative(),
});
export type ResetPostToVersionResult = z.infer<
  typeof ResetPostToVersionResultSchema
>;

export const ResetPostToVersionSuccessResponseSchema =
  createSuccessResponseSchema(ResetPostToVersionResultSchema);
export type ResetPostToVersionSuccessResponse = z.infer<
  typeof ResetPostToVersionSuccessResponseSchema
>;
registerSchema(
  "ResetPostToVersionSuccessResponse",
  ResetPostToVersionSuccessResponseSchema,
);

/*
    squashPostToVersion() Schema - 压缩历史到指定版本
*/
export const SquashPostToVersionSchema = z.object({
  access_token: z.string().optional(),
  slug: z.string().min(1, "slug 不能为空"),
  timestamp: z.string().min(1, "timestamp 不能为空"),
});
export type SquashPostToVersion = z.infer<typeof SquashPostToVersionSchema>;
registerSchema("SquashPostToVersion", SquashPostToVersionSchema);

export const SquashPostToVersionResultSchema = z.object({
  slug: z.string(),
  compressedVersionsCount: z.number().int().nonnegative(),
});
export type SquashPostToVersionResult = z.infer<
  typeof SquashPostToVersionResultSchema
>;

export const SquashPostToVersionSuccessResponseSchema =
  createSuccessResponseSchema(SquashPostToVersionResultSchema);
export type SquashPostToVersionSuccessResponse = z.infer<
  typeof SquashPostToVersionSuccessResponseSchema
>;
registerSchema(
  "SquashPostToVersionSuccessResponse",
  SquashPostToVersionSuccessResponseSchema,
);

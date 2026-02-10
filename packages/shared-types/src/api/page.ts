import { z } from "zod";
import { createSuccessResponseSchema, registerSchema } from "./common.js";

/*
    getPagesStats() Schema
*/
export const GetPagesStatsSchema = z.object({
  access_token: z.string().optional(),
  force: z.boolean().default(false),
});
export type GetPagesStats = z.infer<typeof GetPagesStatsSchema>;
registerSchema("GetPagesStats", GetPagesStatsSchema);

export const PagesStatsDataSchema = z.object({
  updatedAt: z.string(),
  cache: z.boolean(),
  total: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    suspended: z.number().int().nonnegative(),
    system: z.number().int().nonnegative(),
    custom: z.number().int().nonnegative(),
  }),
});
export type PagesStatsData = z.infer<typeof PagesStatsDataSchema>;

export const GetPagesStatsSuccessResponseSchema =
  createSuccessResponseSchema(PagesStatsDataSchema);
export type GetPagesStatsSuccessResponse = z.infer<
  typeof GetPagesStatsSuccessResponseSchema
>;
registerSchema(
  "GetPagesStatsSuccessResponse",
  GetPagesStatsSuccessResponseSchema,
);

/*
    getPagesList() Schema
*/
export const GetPagesListSchema = z.object({
  access_token: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(25),
  sortBy: z
    .enum(["id", "title", "slug", "createdAt", "updatedAt"])
    .optional()
    .default("id"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  status: z.array(z.enum(["ACTIVE", "SUSPENDED"])).optional(),
  search: z.string().optional(),
  // 筛选参数
  isSystemPage: z.array(z.boolean()).optional(),
  robotsIndex: z.array(z.boolean()).optional(),
  createdAtStart: z.string().optional(),
  createdAtEnd: z.string().optional(),
  updatedAtStart: z.string().optional(),
  updatedAtEnd: z.string().optional(),
});
export type GetPagesList = z.infer<typeof GetPagesListSchema>;
registerSchema("GetPagesList", GetPagesListSchema);

export const PageListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  contentType: z.enum(["MARKDOWN", "HTML", "MDX", "BLOCK", "BUILDIN"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: z.object({
    uid: z.number().int().nullable(),
    username: z.string().nullable(),
    nickname: z.string().nullable(),
  }),
  // SEO 和其他字段
  metaDescription: z.string().nullable(),
  metaKeywords: z.string().nullable(),
  robotsIndex: z.boolean(),
  isSystemPage: z.boolean(),
  config: z.any().nullable(),
});
export type PageListItem = z.infer<typeof PageListItemSchema>;

export const GetPagesListSuccessResponseSchema = createSuccessResponseSchema(
  z.array(PageListItemSchema),
);
export type GetPagesListSuccessResponse = z.infer<
  typeof GetPagesListSuccessResponseSchema
>;
registerSchema(
  "GetPagesListSuccessResponse",
  GetPagesListSuccessResponseSchema,
);

/*
    getPageDetail() Schema
*/
export const GetPageDetailSchema = z.object({
  access_token: z.string().optional(),
  slug: z.string().min(1, "slug 不能为空"),
});
export type GetPageDetail = z.infer<typeof GetPageDetailSchema>;
registerSchema("GetPageDetail", GetPageDetailSchema);

export const PageDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  content: z.string(),
  contentType: z.enum(["MARKDOWN", "HTML", "MDX", "BLOCK", "BUILDIN"]),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: z.object({
    uid: z.number().int().nullable(),
    username: z.string().nullable(),
    nickname: z.string().nullable(),
  }),
  config: z.any().nullable(),
  metaDescription: z.string().nullable(),
  metaKeywords: z.string().nullable(),
  robotsIndex: z.boolean(),
  isSystemPage: z.boolean(),
});
export type PageDetail = z.infer<typeof PageDetailSchema>;

export const GetPageDetailSuccessResponseSchema =
  createSuccessResponseSchema(PageDetailSchema);
export type GetPageDetailSuccessResponse = z.infer<
  typeof GetPageDetailSuccessResponseSchema
>;
registerSchema(
  "GetPageDetailSuccessResponse",
  GetPageDetailSuccessResponseSchema,
);

/*
    updatePages() Schema
*/
export const UpdatePagesSchema = z.object({
  access_token: z.string().optional(),
  ids: z
    .array(z.string().min(1, "必须提供至少一个页面 ID"))
    .min(1, "必须提供至少一个页面 ID"),
  // 批量操作字段
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  robotsIndex: z.boolean().optional(),
  // 单个页面编辑字段
  title: z.string().optional(),
  newSlug: z.string().optional(),
  contentType: z
    .enum(["MARKDOWN", "HTML", "MDX", "BLOCK", "BUILDIN"])
    .optional(),
  content: z.string().optional(),
  config: z.any().optional(),
  metaDescription: z.string().max(160).optional(),
  metaKeywords: z.string().max(255).optional(),
});
export type UpdatePages = z.infer<typeof UpdatePagesSchema>;
registerSchema("UpdatePages", UpdatePagesSchema);

export const UpdatePagesResultSchema = z.object({
  updated: z.number().int().nonnegative(),
});
export type UpdatePagesResult = z.infer<typeof UpdatePagesResultSchema>;

export const UpdatePagesSuccessResponseSchema = createSuccessResponseSchema(
  UpdatePagesResultSchema,
);
export type UpdatePagesSuccessResponse = z.infer<
  typeof UpdatePagesSuccessResponseSchema
>;
registerSchema("UpdatePagesSuccessResponse", UpdatePagesSuccessResponseSchema);

/*
    updatePage() Schema - 更新单个页面
*/
export const UpdatePageSchema = z.object({
  access_token: z.string().optional(),
  slug: z.string().min(1, "slug 不能为空"), // 用于标识要更新的页面
  title: z.string().min(1, "标题不能为空").max(255, "标题过长").optional(),
  newSlug: z.string().min(1, "slug 不能为空").max(255, "slug 过长").optional(), // 新的 slug（如果要修改）
  content: z.string().optional(),
  contentType: z
    .enum(["MARKDOWN", "HTML", "MDX", "BLOCK", "BUILDIN"])
    .optional(),
  config: z.any().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  metaDescription: z.string().max(160, "SEO 描述过长").optional(),
  metaKeywords: z.string().max(255, "SEO 关键词过长").optional(),
  robotsIndex: z.boolean().optional(),
});
export type UpdatePage = z.infer<typeof UpdatePageSchema>;
registerSchema("UpdatePage", UpdatePageSchema);

export const UpdatePageResultSchema = z.object({
  id: z.string(),
  slug: z.string(),
});
export type UpdatePageResult = z.infer<typeof UpdatePageResultSchema>;

export const UpdatePageSuccessResponseSchema = createSuccessResponseSchema(
  UpdatePageResultSchema,
);
export type UpdatePageSuccessResponse = z.infer<
  typeof UpdatePageSuccessResponseSchema
>;
registerSchema("UpdatePageSuccessResponse", UpdatePageSuccessResponseSchema);

/*
    createPage() Schema
*/
export const CreatePageSchema = z.object({
  access_token: z.string().optional(),
  title: z.string().min(1, "标题不能为空").max(255, "标题过长"),
  slug: z.string().min(1, "slug 不能为空").max(255, "slug 过长"),
  content: z.string().optional(),
  contentType: z
    .enum(["MARKDOWN", "HTML", "MDX", "BLOCK", "BUILDIN"])
    .default("MARKDOWN"),
  config: z.any().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).default("ACTIVE"),
  metaDescription: z.string().max(160, "SEO 描述过长").optional(),
  metaKeywords: z.string().max(255, "SEO 关键词过长").optional(),
  robotsIndex: z.boolean().default(true),
  isSystemPage: z.boolean().default(false),
});
export type CreatePage = z.infer<typeof CreatePageSchema>;
registerSchema("CreatePage", CreatePageSchema);

export const CreatePageResultSchema = z.object({
  id: z.string(),
  slug: z.string(),
});
export type CreatePageResult = z.infer<typeof CreatePageResultSchema>;

export const CreatePageSuccessResponseSchema = createSuccessResponseSchema(
  CreatePageResultSchema,
);
export type CreatePageSuccessResponse = z.infer<
  typeof CreatePageSuccessResponseSchema
>;
registerSchema("CreatePageSuccessResponse", CreatePageSuccessResponseSchema);

/*
    deletePages() Schema
*/
export const DeletePagesSchema = z.object({
  access_token: z.string().optional(),
  ids: z
    .array(z.string().min(1, "必须提供至少一个页面 ID"))
    .min(1, "必须提供至少一个页面 ID"),
});
export type DeletePages = z.infer<typeof DeletePagesSchema>;
registerSchema("DeletePages", DeletePagesSchema);

export const DeletePagesResultSchema = z.object({
  deleted: z.number().int().nonnegative(),
});
export type DeletePagesResult = z.infer<typeof DeletePagesResultSchema>;

export const DeletePagesSuccessResponseSchema = createSuccessResponseSchema(
  DeletePagesResultSchema,
);
export type DeletePagesSuccessResponse = z.infer<
  typeof DeletePagesSuccessResponseSchema
>;
registerSchema("DeletePagesSuccessResponse", DeletePagesSuccessResponseSchema);

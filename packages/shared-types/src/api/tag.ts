import { z } from "zod";
import { createSuccessResponseSchema, registerSchema } from "./common.js";

/*
    getTagsList() Schema
*/
export const GetTagsListSchema = z.object({
  access_token: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(25),
  sortBy: z
    .enum(["slug", "name", "postCount", "createdAt", "updatedAt"])
    .optional()
    .default("postCount"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().optional(),
  // 筛选参数
  hasZeroPosts: z.boolean().optional(), // 筛选无文章关联的标签
  createdAtStart: z.string().datetime().optional(),
  createdAtEnd: z.string().datetime().optional(),
  updatedAtStart: z.string().datetime().optional(),
  updatedAtEnd: z.string().datetime().optional(),
});
export type GetTagsList = z.infer<typeof GetTagsListSchema>;
registerSchema("GetTagsList", GetTagsListSchema);

export const TagListItemSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  postCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TagListItem = z.infer<typeof TagListItemSchema>;

export const GetTagsListSuccessResponseSchema = createSuccessResponseSchema(
  z.array(TagListItemSchema),
);
export type GetTagsListSuccessResponse = z.infer<
  typeof GetTagsListSuccessResponseSchema
>;
registerSchema("GetTagsListSuccessResponse", GetTagsListSuccessResponseSchema);

/*
    getTagDetail() Schema
*/
export const GetTagDetailSchema = z.object({
  access_token: z.string().optional(),
  slug: z.string().min(1, "标签 slug 不能为空"),
});
export type GetTagDetail = z.infer<typeof GetTagDetailSchema>;
registerSchema("GetTagDetail", GetTagDetailSchema);

export const TagDetailSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  postCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  posts: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      slug: z.string(),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    }),
  ),
});
export type TagDetail = z.infer<typeof TagDetailSchema>;

export const GetTagDetailSuccessResponseSchema =
  createSuccessResponseSchema(TagDetailSchema);
export type GetTagDetailSuccessResponse = z.infer<
  typeof GetTagDetailSuccessResponseSchema
>;
registerSchema(
  "GetTagDetailSuccessResponse",
  GetTagDetailSuccessResponseSchema,
);

/*
    createTag() Schema
*/
export const CreateTagSchema = z.object({
  access_token: z.string().optional(),
  name: z.string().min(1, "标签名不能为空").max(100, "标签名最多100个字符"),
  slug: z.string().max(200, "Slug 最多200个字符").optional(), // slug 可选，如果不提供则自动生成
  description: z.string().max(255, "描述最多255个字符").optional().nullable(),
});
export type CreateTag = z.infer<typeof CreateTagSchema>;
registerSchema("CreateTag", CreateTagSchema);

export const CreateTagSuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
);
export type CreateTagSuccessResponse = z.infer<
  typeof CreateTagSuccessResponseSchema
>;
registerSchema("CreateTagSuccessResponse", CreateTagSuccessResponseSchema);

/*
    updateTag() Schema
*/
export const UpdateTagSchema = z.object({
  access_token: z.string().optional(),
  slug: z.string().min(1, "标签 slug 不能为空"), // 使用 slug 作为标识
  newSlug: z
    .string()
    .min(1, "新 slug 不能为空")
    .max(200, "Slug 最多200个字符")
    .optional(),
  newName: z
    .string()
    .min(1, "新标签名不能为空")
    .max(100, "标签名最多100个字符")
    .optional(),
  description: z.string().max(255, "描述最多255个字符").optional().nullable(),
});
export type UpdateTag = z.infer<typeof UpdateTagSchema>;
registerSchema("UpdateTag", UpdateTagSchema);

export const UpdateTagSuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    updatedAt: z.string(),
  }),
);
export type UpdateTagSuccessResponse = z.infer<
  typeof UpdateTagSuccessResponseSchema
>;
registerSchema("UpdateTagSuccessResponse", UpdateTagSuccessResponseSchema);

/*
    deleteTags() Schema
*/
export const DeleteTagsSchema = z.object({
  access_token: z.string().optional(),
  slugs: z.array(z.string()).min(1, "至少需要一个标签 slug"),
});
export type DeleteTags = z.infer<typeof DeleteTagsSchema>;
registerSchema("DeleteTags", DeleteTagsSchema);

export const DeleteTagsSuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    deleted: z.number().int().nonnegative(),
    slugs: z.array(z.string()),
  }),
);
export type DeleteTagsSuccessResponse = z.infer<
  typeof DeleteTagsSuccessResponseSchema
>;
registerSchema("DeleteTagsSuccessResponse", DeleteTagsSuccessResponseSchema);

/*
    getTagsDistribution() Schema - 用于环形图展示
*/
export const GetTagsDistributionSchema = z.object({
  access_token: z.string().optional(),
  limit: z.number().int().positive().default(10), // 默认返回前10个标签
});
export type GetTagsDistribution = z.infer<typeof GetTagsDistributionSchema>;
registerSchema("GetTagsDistribution", GetTagsDistributionSchema);

export const TagDistributionItemSchema = z.object({
  name: z.string(),
  postCount: z.number().int().nonnegative(),
  percentage: z.number().nonnegative(),
});
export type TagDistributionItem = z.infer<typeof TagDistributionItemSchema>;

export const GetTagsDistributionSuccessResponseSchema =
  createSuccessResponseSchema(z.array(TagDistributionItemSchema));
export type GetTagsDistributionSuccessResponse = z.infer<
  typeof GetTagsDistributionSuccessResponseSchema
>;
registerSchema(
  "GetTagsDistributionSuccessResponse",
  GetTagsDistributionSuccessResponseSchema,
);

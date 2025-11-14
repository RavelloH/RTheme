import { z } from "zod";
import { createSuccessResponseSchema, registerSchema } from "./common.js";

/*
    getUsersStats() Schema
*/
export const GetUsersStatsSchema = z.object({
  access_token: z.string().optional(),
  force: z.boolean().default(false),
});
export type GetUsersStats = z.infer<typeof GetUsersStatsSchema>;
registerSchema("GetUsersStats", GetUsersStatsSchema);

export const GetUsersStatsSuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    updatedAt: z.iso.datetime(),
    cache: z.boolean(),
    total: z.object({
      total: z.number().int().nonnegative(),
      user: z.number().int().nonnegative(),
      admin: z.number().int().nonnegative(),
      editor: z.number().int().nonnegative(),
      author: z.number().int().nonnegative(),
    }),
    active: z.object({
      lastDay: z.number().int().nonnegative(),
      last7Days: z.number().int().nonnegative(),
      last30Days: z.number().int().nonnegative(),
    }),
    new: z.object({
      lastDay: z.number().int().nonnegative(),
      last7Days: z.number().int().nonnegative(),
      last30Days: z.number().int().nonnegative(),
    }),
  }),
);

export type GetUsersStatsSuccessResponse = z.infer<
  typeof GetUsersStatsSuccessResponseSchema
>;
registerSchema(
  "GetUsersStatsSuccessResponse",
  GetUsersStatsSuccessResponseSchema,
);

/*
    getAuditStats() Schema
*/
export const GetAuditStatsSchema = z.object({
  access_token: z.string().optional(),
  force: z.boolean().default(false),
});
export type GetAuditStats = z.infer<typeof GetAuditStatsSchema>;
registerSchema("GetAuditStats", GetAuditStatsSchema);

export const GetAuditStatsSuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    updatedAt: z.iso.datetime(),
    cache: z.boolean(),
    total: z.object({
      logs: z.number().int().nonnegative(),
      activeUsers: z.number().int().nonnegative(),
    }),
    recent: z.object({
      lastDay: z.number().int().nonnegative(),
      last7Days: z.number().int().nonnegative(),
      last30Days: z.number().int().nonnegative(),
    }),
  }),
);

export type GetAuditStatsSuccessResponse = z.infer<
  typeof GetAuditStatsSuccessResponseSchema
>;
registerSchema(
  "GetAuditStatsSuccessResponse",
  GetAuditStatsSuccessResponseSchema,
);

/*
    getPostsStats() Schema
*/
export const GetPostsStatsSchema = z.object({
  access_token: z.string().optional(),
  force: z.boolean().default(false),
});
export type GetPostsStats = z.infer<typeof GetPostsStatsSchema>;
registerSchema("GetPostsStats", GetPostsStatsSchema);

export const GetPostsStatsSuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    updatedAt: z.iso.datetime(),
    cache: z.boolean(),
    total: z.object({
      total: z.number().int().nonnegative(),
      published: z.number().int().nonnegative(),
      draft: z.number().int().nonnegative(),
      archived: z.number().int().nonnegative(),
    }),
    new: z.object({
      last7Days: z.number().int().nonnegative(),
      last30Days: z.number().int().nonnegative(),
      lastYear: z.number().int().nonnegative(),
    }),
    lastPublished: z.iso.datetime().nullable(),
    firstPublished: z.iso.datetime().nullable(),
    averageDaysBetweenPosts: z.number().nullable(),
  }),
);

export type GetPostsStatsSuccessResponse = z.infer<
  typeof GetPostsStatsSuccessResponseSchema
>;
registerSchema(
  "GetPostsStatsSuccessResponse",
  GetPostsStatsSuccessResponseSchema,
);

/*
    getTagsStats() Schema
*/
export const GetTagsStatsSchema = z.object({
  access_token: z.string().optional(),
  force: z.boolean().default(false),
});
export type GetTagsStats = z.infer<typeof GetTagsStatsSchema>;
registerSchema("GetTagsStats", GetTagsStatsSchema);

export const GetTagsStatsSuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    updatedAt: z.iso.datetime(),
    cache: z.boolean(),
    total: z.object({
      total: z.number().int().nonnegative(),
      withPosts: z.number().int().nonnegative(),
      withoutPosts: z.number().int().nonnegative(),
    }),
    new: z.object({
      last7Days: z.number().int().nonnegative(),
      last30Days: z.number().int().nonnegative(),
      lastYear: z.number().int().nonnegative(),
    }),
  }),
);

export type GetTagsStatsSuccessResponse = z.infer<
  typeof GetTagsStatsSuccessResponseSchema
>;
registerSchema(
  "GetTagsStatsSuccessResponse",
  GetTagsStatsSuccessResponseSchema,
);

/*
    getCategoriesStats() Schema
*/
export const GetCategoriesStatsSchema = z.object({
  access_token: z.string().optional(),
  force: z.boolean().default(false),
});
export type GetCategoriesStats = z.infer<typeof GetCategoriesStatsSchema>;
registerSchema("GetCategoriesStats", GetCategoriesStatsSchema);

export const GetCategoriesStatsSuccessResponseSchema =
  createSuccessResponseSchema(
    z.object({
      updatedAt: z.iso.datetime(),
      cache: z.boolean(),
      total: z.object({
        total: z.number().int().nonnegative(),
        topLevel: z.number().int().nonnegative(), // 顶级分类数
        withPosts: z.number().int().nonnegative(),
        withoutPosts: z.number().int().nonnegative(),
      }),
      depth: z.object({
        maxDepth: z.number().int().nonnegative(), // 最大层级深度
        avgDepth: z.number().nonnegative(), // 平均层级深度
      }),
      new: z.object({
        last7Days: z.number().int().nonnegative(),
        last30Days: z.number().int().nonnegative(),
        lastYear: z.number().int().nonnegative(),
      }),
    }),
  );

export type GetCategoriesStatsSuccessResponse = z.infer<
  typeof GetCategoriesStatsSuccessResponseSchema
>;
registerSchema(
  "GetCategoriesStatsSuccessResponse",
  GetCategoriesStatsSuccessResponseSchema,
);

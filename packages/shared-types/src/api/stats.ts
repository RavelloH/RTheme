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

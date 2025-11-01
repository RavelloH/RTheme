import { z } from "zod";
import { createSuccessResponseSchema, registerSchema } from "./common.js";

/*
    getAuditLogs() Schema
*/
export const GetAuditLogsSchema = z.object({
  access_token: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(500).default(10),
  sortBy: z
    .enum(["id", "timestamp", "action", "resource", "userUid"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  // 过滤条件
  action: z.string().optional(),
  resource: z.string().optional(),
  userUid: z.number().int().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  // 通用搜索（搜索描述、资源ID、IP地址等）
  search: z.string().optional(),
});
export type GetAuditLogs = z.infer<typeof GetAuditLogsSchema>;
registerSchema("GetAuditLogs", GetAuditLogsSchema);

export const AuditLogItemSchema = z.object({
  id: z.number(),
  timestamp: z.iso.datetime(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string(),
  userUid: z.number().nullable(),
  ipAddress: z.string(),
  userAgent: z.string().nullable(),
  oldData: z.any().nullable(),
  newData: z.any().nullable(),
  description: z.string().nullable(),
  // 关联的用户信息
  user: z
    .object({
      uid: z.number(),
      username: z.string(),
      nickname: z.string().nullable(),
    })
    .nullable(),
});
export type AuditLogItem = z.infer<typeof AuditLogItemSchema>;

export const GetAuditLogsSuccessResponseSchema = createSuccessResponseSchema(
  z.array(AuditLogItemSchema),
);
export type GetAuditLogsSuccessResponse = z.infer<
  typeof GetAuditLogsSuccessResponseSchema
>;
registerSchema(
  "GetAuditLogsSuccessResponse",
  GetAuditLogsSuccessResponseSchema,
);

/*
    getAuditTrends() Schema
*/
export const GetAuditTrendsSchema = z.object({
  access_token: z.string().optional(),
  days: z.number().int().positive().max(365).default(30),
  count: z.number().int().positive().max(1000).default(30),
  groupBy: z.enum(["action", "resource"]).default("action"),
});
export type GetAuditTrends = z.infer<typeof GetAuditTrendsSchema>;
registerSchema("GetAuditTrends", GetAuditTrendsSchema);

export const AuditTrendItemSchema = z.object({
  time: z.string(),
  data: z.record(z.string(), z.number()), // 动态的键值对，如 { "LOGIN": 10, "CREATE": 5 }
});
export type AuditTrendItem = z.infer<typeof AuditTrendItemSchema>;

export const GetAuditTrendsSuccessResponseSchema = createSuccessResponseSchema(
  z.array(AuditTrendItemSchema),
);
export type GetAuditTrendsSuccessResponse = z.infer<
  typeof GetAuditTrendsSuccessResponseSchema
>;
registerSchema(
  "GetAuditTrendsSuccessResponse",
  GetAuditTrendsSuccessResponseSchema,
);

import { z } from "zod";
import { createSuccessResponseSchema, registerSchema } from "./common.js";

/*
    安全概览 Schema
*/
export const GetSecurityOverviewSchema = z.object({
  access_token: z.string().optional(),
  force: z.boolean().optional(), // 强制刷新，忽略缓存
});
export type GetSecurityOverview = z.infer<typeof GetSecurityOverviewSchema>;
registerSchema("GetSecurityOverview", GetSecurityOverviewSchema);

export const SecurityOverviewDataSchema = z.object({
  // 当前活跃IP数（有速率限制记录的）
  activeIPs: z.number(),
  // 被封禁的IP数
  bannedIPs: z.number(),
  // 当前小时请求总数
  currentHourRequests: z.number(),
  // 最近24小时请求趋势（每小时）
  hourlyTrends: z.array(
    z.object({
      hour: z.string(),
      count: z.number(),
    }),
  ),
  // 被限流的IP数（请求数接近或达到限制）
  rateLimitedIPs: z.number(),
  // 总请求数（累计）
  totalRequests: z.number().optional(),
  // 总成功请求数
  totalSuccess: z.number().optional(),
  // 总错误请求数（超过速率限制）
  totalError: z.number().optional(),
  // 最近24小时成功请求数
  last24hSuccess: z.number().optional(),
  // 最近24小时错误请求数（超过速率限制）
  last24hError: z.number().optional(),
  // 最近24小时实际有数据的小时数
  last24hActiveHours: z.number().optional(),
  // 最近30天成功请求数
  last30dSuccess: z.number().optional(),
  // 最近30天错误请求数（超过速率限制）
  last30dError: z.number().optional(),
  // 最近30天实际有数据的天数
  last30dActiveDays: z.number().optional(),
  // 缓存信息
  cache: z.boolean(), // 是否来自缓存
  updatedAt: z.string(), // 数据更新时间
});
export type SecurityOverviewData = z.infer<typeof SecurityOverviewDataSchema>;

export const GetSecurityOverviewSuccessResponseSchema =
  createSuccessResponseSchema(SecurityOverviewDataSchema);
export type GetSecurityOverviewSuccessResponse = z.infer<
  typeof GetSecurityOverviewSuccessResponseSchema
>;
registerSchema(
  "GetSecurityOverviewSuccessResponse",
  GetSecurityOverviewSuccessResponseSchema,
);

/*
    获取IP列表 Schema（包含速率限制和封禁状态）
*/
export const GetIPListSchema = z.object({
  access_token: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
  filter: z.enum(["all", "banned", "rate-limited", "active"]).default("all"),
  sortBy: z
    .enum([
      "ip",
      "requestCount",
      "realtimeCount",
      "last24hCount",
      "lastRequest",
    ])
    .default("realtimeCount"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
});
export type GetIPList = z.infer<typeof GetIPListSchema>;
registerSchema("GetIPList", GetIPListSchema);

export const IPInfoSchema = z.object({
  ip: z.string(),
  requestCount: z.number(), // 最近一分钟内的请求数（兼容旧字段）
  realtimeCount: z.number().optional(), // 实时请求数（最近1分钟）
  last24hCount: z.number().optional(), // 最近24小时请求数
  lastRequest: z.number(), // 最后请求时间戳
  isBanned: z.boolean(),
  banExpiry: z.number().optional(), // 封禁到期时间戳（如果被封禁）
  banReason: z.string().optional(), // 封禁原因
  location: z.string().optional(), // IP 归属地
});
export type IPInfo = z.infer<typeof IPInfoSchema>;
registerSchema("IPInfo", IPInfoSchema);

export const GetIPListSuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    items: z.array(IPInfoSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  }),
);
export type GetIPListSuccessResponse = z.infer<
  typeof GetIPListSuccessResponseSchema
>;
registerSchema("GetIPListSuccessResponse", GetIPListSuccessResponseSchema);

/*
    封禁IP Schema
*/
export const BanIPSchema = z.object({
  access_token: z.string().optional(),
  ip: z.string().min(1),
  duration: z.number().int().positive().default(3600), // 封禁时长（秒），默认1小时
  reason: z.string().optional(),
});
export type BanIP = z.infer<typeof BanIPSchema>;
registerSchema("BanIP", BanIPSchema);

export const BanIPSuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    ip: z.string(),
    bannedUntil: z.number(),
    reason: z.string().optional(),
  }),
);
export type BanIPSuccessResponse = z.infer<typeof BanIPSuccessResponseSchema>;
registerSchema("BanIPSuccessResponse", BanIPSuccessResponseSchema);

/*
    解封IP Schema
*/
export const UnbanIPSchema = z.object({
  access_token: z.string().optional(),
  ip: z.string().min(1),
});
export type UnbanIP = z.infer<typeof UnbanIPSchema>;
registerSchema("UnbanIP", UnbanIPSchema);

export const UnbanIPSuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    ip: z.string(),
    unbanned: z.boolean(),
  }),
);
export type UnbanIPSuccessResponse = z.infer<
  typeof UnbanIPSuccessResponseSchema
>;
registerSchema("UnbanIPSuccessResponse", UnbanIPSuccessResponseSchema);

/*
    获取API端点统计 Schema
*/
export const GetEndpointStatsSchema = z.object({
  access_token: z.string().optional(),
  hours: z.number().int().positive().max(168).default(24), // 统计时间范围，最多7天
});
export type GetEndpointStats = z.infer<typeof GetEndpointStatsSchema>;
registerSchema("GetEndpointStats", GetEndpointStatsSchema);

export const EndpointStatSchema = z.object({
  endpoint: z.string(),
  count: z.number(),
  percentage: z.number(), // 占总请求的百分比
});
export type EndpointStat = z.infer<typeof EndpointStatSchema>;

export const GetEndpointStatsSuccessResponseSchema =
  createSuccessResponseSchema(
    z.object({
      endpoints: z.array(EndpointStatSchema),
      totalRequests: z.number(),
      timeRange: z.object({
        start: z.number(),
        end: z.number(),
      }),
    }),
  );
export type GetEndpointStatsSuccessResponse = z.infer<
  typeof GetEndpointStatsSuccessResponseSchema
>;
registerSchema(
  "GetEndpointStatsSuccessResponse",
  GetEndpointStatsSuccessResponseSchema,
);

/*
    获取请求趋势 Schema
*/
export const GetRequestTrendsSchema = z.object({
  access_token: z.string().optional(),
  hours: z.number().int().positive().max(720).default(24), // 统计时间范围，最多30天
  granularity: z.enum(["minute", "hour"]).default("hour"), // 粒度
});
export type GetRequestTrends = z.infer<typeof GetRequestTrendsSchema>;
registerSchema("GetRequestTrends", GetRequestTrendsSchema);

export const RequestTrendItemSchema = z.object({
  time: z.string(),
  timestamp: z.number(),
  count: z.number(),
  success: z.number().optional(),
  error: z.number().optional(),
});
export type RequestTrendItem = z.infer<typeof RequestTrendItemSchema>;

export const GetRequestTrendsSuccessResponseSchema =
  createSuccessResponseSchema(z.array(RequestTrendItemSchema));
export type GetRequestTrendsSuccessResponse = z.infer<
  typeof GetRequestTrendsSuccessResponseSchema
>;
registerSchema(
  "GetRequestTrendsSuccessResponse",
  GetRequestTrendsSuccessResponseSchema,
);

/*
    清除IP速率限制记录 Schema
*/
export const ClearRateLimitSchema = z.object({
  access_token: z.string().optional(),
  ip: z.string().min(1),
});
export type ClearRateLimit = z.infer<typeof ClearRateLimitSchema>;
registerSchema("ClearRateLimit", ClearRateLimitSchema);

export const ClearRateLimitSuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    ip: z.string(),
    cleared: z.boolean(),
  }),
);
export type ClearRateLimitSuccessResponse = z.infer<
  typeof ClearRateLimitSuccessResponseSchema
>;
registerSchema(
  "ClearRateLimitSuccessResponse",
  ClearRateLimitSuccessResponseSchema,
);

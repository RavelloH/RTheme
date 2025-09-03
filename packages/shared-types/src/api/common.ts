import { z } from "zod";

// 分页元数据 Schema
export const PaginationMetaSchema = z.object({
  page: z.number().min(1),
  pageSize: z.number().min(1).max(100),
  total: z.number().min(0),
  totalPages: z.number().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

// 通用 API 响应 Schema
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.unknown().nullable(),
  timestamp: z.string().datetime(),
  requestId: z.string(),
  error: z.string().optional(),
  meta: PaginationMetaSchema.optional(),
});

// 分页请求参数 Schema
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// 导出推导的 TypeScript 类型
export type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data: T | null;
  timestamp: string;
  requestId: string;
  error?: string;
  meta?: PaginationMeta;
};

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;

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

// 错误详情 Schema
export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
  field: z.string().optional(),
});

// 通用 API 响应 Schema
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.unknown().nullable(),
  timestamp: z.string().datetime(),
  requestId: z.string(),
  error: ApiErrorSchema.optional(),
  meta: PaginationMetaSchema.optional(),
});

// 分页请求参数 Schema
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// 定义允许的响应数据类型
export type ApiResponseData = 
  | Record<string, any> 
  | Array<any> 
  | string 
  | number 
  | boolean 
  | null;

// 定义错误详情类型
export type ApiError = z.infer<typeof ApiErrorSchema>;

// 导出推导的 TypeScript 类型
export type ApiResponse<T extends ApiResponseData = null> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  requestId: string;
  error?: ApiError;
  meta?: PaginationMeta;
};

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;

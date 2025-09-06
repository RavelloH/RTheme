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

// 基础响应 Schema（只包含必需字段）
export const BaseResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  timestamp: z.string().datetime(),
  requestId: z.string(),
});

// 通用 API 响应 Schema（包含所有可选字段，主要用于类型推导）
export const ApiResponseSchema = BaseResponseSchema.extend({
  data: z.unknown().nullable(),
  error: ApiErrorSchema.optional(),
  meta: PaginationMetaSchema.optional(),
});

// 响应构建器函数 - 成功响应
export function createSuccessResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return BaseResponseSchema.extend({
    success: z.literal(true),
    data: dataSchema,
  });
}

// 响应构建器函数 - 错误响应
export function createErrorResponseSchema<T extends z.ZodTypeAny>(errorSchema: T) {
  return BaseResponseSchema.extend({
    success: z.literal(false),
    data: z.null(),
    error: errorSchema,
  });
}

// 响应构建器函数 - 带分页的响应
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return BaseResponseSchema.extend({
    success: z.literal(true),
    data: dataSchema,
    meta: PaginationMetaSchema,
  });
}

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

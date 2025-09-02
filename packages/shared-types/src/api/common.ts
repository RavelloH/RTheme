import { z } from 'zod'

// 通用 API 响应 Schema
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.unknown().optional(),
})

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  error: z.string().optional(),
  statusCode: z.number(),
})

export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// 导出推导的 TypeScript 类型
export type ApiResponse<T = unknown> = z.infer<typeof ApiResponseSchema> & { data?: T }
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>
export type Pagination = z.infer<typeof PaginationSchema>
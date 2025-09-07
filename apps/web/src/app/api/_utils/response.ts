import { NextResponse } from "next/server";
import type {
  ApiResponse,
  PaginationMeta,
  ApiResponseData,
  ApiError,
} from "@repo/shared-types/api/common";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 错误详情类型 - 更具体的类型定义以避免使用 any
 */
export type ErrorDetails = Record<string, string | number | boolean | null | undefined>;

/**
 * 缓存策略配置
 */
export interface CacheConfig {
  /** 缓存最大时间（秒） */
  maxAge?: number;
  /** 共享缓存最大时间（秒） */
  sMaxAge?: number;
  /** 过期后仍可使用的时间（秒） */
  staleWhileRevalidate?: number;
  /** 禁用缓存 */
  noCache?: boolean;
  /** 不存储缓存 */
  noStore?: boolean;
  /** 必须重新验证 */
  mustRevalidate?: boolean;
  /** ETag标识 */
  etag?: string;
  /** 最后修改时间 */
  lastModified?: Date;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 创建安全响应头
 */
function createSecurityHeaders(customHeaders?: HeadersInit): HeadersInit {
  const securityHeaders: HeadersInit = {
    // 安全头
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",

    // CORS头 - 在实际使用时应该根据请求的Origin动态设置
    // 注意：这里不设置Access-Control-Allow-Origin，建议在中间件中根据环境配置

    // CSP头
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' wss: https:; form-action 'self'; frame-ancestors 'none';",

    // 基础头
    "Content-Type": "application/json",
    "Cache-Control": "no-store",

    ...customHeaders,
  };

  return securityHeaders;
}

/**
 * 创建缓存控制头
 */
function createCacheHeaders(cacheConfig?: CacheConfig): HeadersInit {
  const headers: HeadersInit = {};

  if (!cacheConfig) {
    headers["Cache-Control"] = "no-store";
    return headers;
  }

  if (cacheConfig.noStore) {
    headers["Cache-Control"] = "no-store";
  } else if (cacheConfig.noCache) {
    headers["Cache-Control"] = "no-cache";
  } else {
    const cacheDirectives: string[] = [];

    if (cacheConfig.maxAge !== undefined) {
      cacheDirectives.push(`max-age=${cacheConfig.maxAge}`);
    }
    if (cacheConfig.sMaxAge !== undefined) {
      cacheDirectives.push(`s-maxage=${cacheConfig.sMaxAge}`);
    }
    if (cacheConfig.staleWhileRevalidate !== undefined) {
      cacheDirectives.push(
        `stale-while-revalidate=${cacheConfig.staleWhileRevalidate}`
      );
    }
    if (cacheConfig.mustRevalidate) {
      cacheDirectives.push("must-revalidate");
    }

    headers["Cache-Control"] = cacheDirectives.join(", ") || "no-store";
  }

  if (cacheConfig.etag) {
    headers["ETag"] = cacheConfig.etag;
  }
  if (cacheConfig.lastModified) {
    headers["Last-Modified"] = cacheConfig.lastModified.toUTCString();
  }

  return headers;
}

/**
 * 创建分页元数据
 */
function createPaginationMeta(
  page: number,
  pageSize: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / pageSize);
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * 生成唯一请求ID
 */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const processId = process.pid?.toString(36) || "0";
  return `${timestamp}-${processId}-${random}`;
}

/**
 * 处理错误信息
 */
function processError(error?: ApiError | string): ApiError | undefined {
  if (!error) return undefined;

  return typeof error === "string"
    ? { code: "CUSTOM_ERROR", message: error }
    : error;
}

// ============================================================================
// 核心响应函数
// ============================================================================

/**
 * 创建统一格式的 API 响应
 */
function createResponse<T extends ApiResponseData>(
  status: number,
  success: boolean,
  message: string,
  data: T = null as T,
  error?: ApiError,
  customHeaders?: HeadersInit,
  meta?: PaginationMeta,
  cacheConfig?: CacheConfig
): NextResponse<ApiResponse<T>> {
  const responseBody: ApiResponse<T> = {
    success,
    message,
    data,
    timestamp: new Date().toISOString(),
    requestId: generateRequestId(),
    ...(error && { error }),
    ...(meta && { meta }),
  };

  const securityHeaders = createSecurityHeaders();
  const cacheHeaders = createCacheHeaders(cacheConfig);

  const headers: HeadersInit = {
    ...securityHeaders,
    ...cacheHeaders,
    "x-request-id": responseBody.requestId,
    ...customHeaders,
  };

  return NextResponse.json(responseBody, { status, headers });
}

/**
 * 通用响应函数
 */
function response<T extends ApiResponseData = null>(config: {
  /** HTTP状态码 */
  status?: number;
  /** 是否成功 */
  success?: boolean;
  /** 响应消息 */
  message?: string;
  /** 响应数据 */
  data?: T;
  /** 错误信息 */
  error?: ApiError | string;
  /** 自定义响应头 */
  customHeaders?: HeadersInit;
  /** 分页元数据 */
  meta?: PaginationMeta;
  /** 缓存配置 */
  cacheConfig?: CacheConfig;
}): NextResponse<ApiResponse<T>> {
  const status = config.status || 200;
  const success = config.success ?? (status >= 200 && status < 300);
  const finalMessage = config.message || (success ? "请求成功" : "请求失败");
  const finalData = config.data ?? (null as T);
  const finalError = processError(config.error);

  return createResponse(
    status,
    success,
    finalMessage,
    finalData,
    finalError,
    config.customHeaders,
    config.meta,
    config.cacheConfig
  );
}

// ============================================================================
// 快捷响应方法
// ============================================================================

// === 成功响应 ===

/**
 * 200 - 成功响应
 */
function ok<T extends ApiResponseData = null>(config?: {
  /** 响应消息 */
  message?: string;
  /** 响应数据 */
  data?: T;
  /** 分页元数据 */
  meta?: PaginationMeta;
  /** 自定义响应头 */
  customHeaders?: HeadersInit;
  /** 缓存配置 */
  cacheConfig?: CacheConfig;
}): NextResponse<ApiResponse<T>> {
  return response({
    status: 200,
    success: true,
    message: config?.message || "请求成功",
    data: config?.data,
    meta: config?.meta,
    customHeaders: config?.customHeaders,
    cacheConfig: config?.cacheConfig,
  });
}

/**
 * 201 - 创建成功
 */
function created<T extends ApiResponseData>(config?: {
  /** 响应消息 */
  message?: string;
  /** 响应数据 */
  data?: T;
  /** 分页元数据 */
  meta?: PaginationMeta;
  /** 自定义响应头 */
  customHeaders?: HeadersInit;
  /** 缓存配置 */
  cacheConfig?: CacheConfig;
}): NextResponse<ApiResponse<T>> {
  return response({
    status: 201,
    success: true,
    message: config?.message || "创建成功",
    data: config?.data,
    meta: config?.meta,
    customHeaders: config?.customHeaders,
    cacheConfig: config?.cacheConfig,
  });
}

/**
 * 204 - 无内容
 */
function noContent(config?: {
  /** 响应消息 */
  message?: string;
  /** 自定义响应头 */
  customHeaders?: HeadersInit;
  /** 缓存配置 */
  cacheConfig?: CacheConfig;
}): NextResponse<ApiResponse<null>> {
  return response({
    status: 204,
    success: true,
    message: config?.message || "操作成功",
    data: null,
    customHeaders: config?.customHeaders,
    cacheConfig: config?.cacheConfig,
  });
}

/**
 * 304 - 未修改 (用于条件请求)
 */
function notModified(config?: {
  /** 响应消息 */
  message?: string;
  /** 自定义响应头 */
  customHeaders?: HeadersInit;
  /** 缓存配置 */
  cacheConfig?: CacheConfig;
}): NextResponse<ApiResponse<null>> {
  return response({
    status: 304,
    success: true,
    message: config?.message || "未修改",
    data: null,
    customHeaders: config?.customHeaders,
    cacheConfig: config?.cacheConfig,
  });
}

// === 错误响应 ===

/**
 * 400 - 请求错误
 */
function badRequest(config?: {
  /** 响应消息 */
  message?: string;
  /** 错误信息 */
  error?: ApiError | string;
  /** 自定义响应头 */
  customHeaders?: HeadersInit;
  /** 缓存配置 */
  cacheConfig?: CacheConfig;
}): NextResponse<ApiResponse<null>> {
  return response({
    status: 400,
    success: false,
    message: config?.message || "请求参数错误",
    data: null,
    error: config?.error || { code: "BAD_REQUEST", message: "请求参数错误" },
    customHeaders: config?.customHeaders,
    cacheConfig: config?.cacheConfig,
  });
}

/**
 * 401 - 未授权
 */
function unauthorized(config?: {
  /** 响应消息 */
  message?: string;
  /** 错误信息 */
  error?: ApiError | string;
  /** 自定义响应头 */
  customHeaders?: HeadersInit;
  /** 缓存配置 */
  cacheConfig?: CacheConfig;
}): NextResponse<ApiResponse<null>> {
  return response({
    status: 401,
    success: false,
    message: config?.message || "未授权访问",
    data: null,
    error: config?.error || { code: "UNAUTHORIZED", message: "未授权访问" },
    customHeaders: config?.customHeaders,
    cacheConfig: config?.cacheConfig,
  });
}

/**
 * 403 - 禁止访问
 */
function forbidden(config?: {
  /** 响应消息 */
  message?: string;
  /** 错误信息 */
  error?: ApiError | string;
  /** 自定义响应头 */
  customHeaders?: HeadersInit;
  /** 缓存配置 */
  cacheConfig?: CacheConfig;
}): NextResponse<ApiResponse<null>> {
  return response({
    status: 403,
    success: false,
    message: config?.message || "禁止访问",
    data: null,
    error: config?.error || { code: "FORBIDDEN", message: "禁止访问" },
    customHeaders: config?.customHeaders,
    cacheConfig: config?.cacheConfig,
  });
}

/**
 * 404 - 未找到
 */
function notFound(config?: {
  /** 响应消息 */
  message?: string;
  /** 错误信息 */
  error?: ApiError | string;
  /** 自定义响应头 */
  customHeaders?: HeadersInit;
  /** 缓存配置 */
  cacheConfig?: CacheConfig;
}): NextResponse<ApiResponse<null>> {
  return response({
    status: 404,
    success: false,
    message: config?.message || "资源未找到",
    data: null,
    error: config?.error || { code: "NOT_FOUND", message: "资源未找到" },
    customHeaders: config?.customHeaders,
    cacheConfig: config?.cacheConfig,
  });
}

/**
 * 409 - 冲突
 */
function conflict(config?: {
  /** 响应消息 */
  message?: string;
  /** 错误信息 */
  error?: ApiError | string;
  /** 自定义响应头 */
  customHeaders?: HeadersInit;
  /** 缓存配置 */
  cacheConfig?: CacheConfig;
}): NextResponse<ApiResponse<null>> {
  return response({
    status: 409,
    success: false,
    message: config?.message || "资源冲突",
    data: null,
    error: config?.error || { code: "CONFLICT", message: "资源冲突" },
    customHeaders: config?.customHeaders,
    cacheConfig: config?.cacheConfig,
  });
}

/**
 * 422 - 无法处理的实体
 */
function unprocessableEntity(config?: {
  /** 响应消息 */
  message?: string;
  /** 错误信息 */
  error?: ApiError | string;
  /** 自定义响应头 */
  customHeaders?: HeadersInit;
  /** 缓存配置 */
  cacheConfig?: CacheConfig;
}): NextResponse<ApiResponse<null>> {
  return response({
    status: 422,
    success: false,
    message: config?.message || "验证失败",
    data: null,
    error: config?.error || { code: "UNPROCESSABLE_ENTITY", message: "验证失败" },
    customHeaders: config?.customHeaders,
    cacheConfig: config?.cacheConfig,
  });
}

/**
 * 429 - 请求过多
 */
function tooManyRequests(config?: {
  /** 响应消息 */
  message?: string;
  /** 错误信息 */
  error?: ApiError | string;
  /** 自定义响应头 */
  customHeaders?: HeadersInit;
  /** 缓存配置 */
  cacheConfig?: CacheConfig;
}): NextResponse<ApiResponse<null>> {
  return response({
    status: 429,
    success: false,
    message: config?.message || "请求过于频繁，请稍后再试",
    data: null,
    error: config?.error || { code: "TOO_MANY_REQUESTS", message: "请求过于频繁，请稍后再试" },
    customHeaders: config?.customHeaders,
    cacheConfig: config?.cacheConfig,
  });
}

/**
 * 500 - 服务器错误
 */
function serverError(config?: {
  /** 响应消息 */
  message?: string;
  /** 错误信息 */
  error?: ApiError | string;
  /** 自定义响应头 */
  customHeaders?: HeadersInit;
  /** 缓存配置 */
  cacheConfig?: CacheConfig;
}): NextResponse<ApiResponse<null>> {
  return response({
    status: 500,
    success: false,
    message: config?.message || "服务器内部错误",
    data: null,
    error: config?.error || { code: "INTERNAL_SERVER_ERROR", message: "服务器内部错误" },
    customHeaders: config?.customHeaders,
    cacheConfig: config?.cacheConfig,
  });
}

/**
 * 503 - 服务不可用
 */
function serviceUnavailable(config?: {
  /** 响应消息 */
  message?: string;
  /** 错误信息 */
  error?: ApiError | string;
  /** 自定义响应头 */
  customHeaders?: HeadersInit;
  /** 缓存配置 */
  cacheConfig?: CacheConfig;
}): NextResponse<ApiResponse<null>> {
  return response({
    status: 503,
    success: false,
    message: config?.message || "服务暂时不可用",
    data: null,
    error: config?.error || { code: "SERVICE_UNAVAILABLE", message: "服务暂时不可用" },
    customHeaders: config?.customHeaders,
    cacheConfig: config?.cacheConfig,
  });
}

// === 特殊响应 ===

/**
 * 带缓存的成功响应
 */
function cached<T extends ApiResponseData>(config: {
  /** 响应消息 */
  message?: string;
  /** 响应数据 */
  data?: T;
  /** 分页元数据 */
  meta?: PaginationMeta;
  /** 自定义响应头 */
  customHeaders?: HeadersInit;
  /** 缓存配置 */
  cacheConfig: CacheConfig;
}): NextResponse<ApiResponse<T>> {
  return response({
    status: 200,
    success: true,
    message: config.message || "请求成功",
    data: config.data,
    customHeaders: config.customHeaders,
    meta: config.meta,
    cacheConfig: config.cacheConfig,
  });
}

/**
 * 创建字段验证错误
 */
function fieldError(
  field: string,
  message: string,
  details?: ErrorDetails
): ApiError {
  return {
    code: "FIELD_VALIDATION_ERROR",
    message: `${field}: ${message}`,
    field,
    details,
  };
}

/**
 * 验证失败响应（带字段信息）
 */
function validationError(config: {
  /** 响应消息 */
  message?: string;
  /** 错误字段 */
  field: string;
  /** 错误消息 */
  errorMessage?: string;
  /** 错误详情 */
  details?: ErrorDetails;
  /** 自定义响应头 */
  customHeaders?: HeadersInit;
  /** 缓存配置 */
  cacheConfig?: CacheConfig;
}): NextResponse<ApiResponse<null>> {
  const error = fieldError(
    config.field,
    config.errorMessage || "验证失败",
    config.details
  );

  return response({
    status: 422,
    success: false,
    message: config.message || "数据验证失败",
    data: null,
    error,
    customHeaders: config.customHeaders,
    cacheConfig: config.cacheConfig,
  });
}

// ============================================================================
// 导出
// ============================================================================

const responseUtil = Object.assign(response, {
  ok,
  created,
  noContent,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessableEntity,
  tooManyRequests,
  serverError,
  serviceUnavailable,
  notModified,
  cached,
  validationError,
  fieldError,
  createPaginationMeta,
});

export default responseUtil;
export { createSecurityHeaders, createCacheHeaders };

import { NextResponse } from "next/server";
import type { ApiResponse, PaginationMeta, ApiResponseData, ApiError } from "@repo/shared-types/api/common";

/**
 * 缓存策略配置
 */
export interface CacheConfig {
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  noCache?: boolean;
  noStore?: boolean;
  mustRevalidate?: boolean;
  etag?: string;
  lastModified?: Date;
}

/**
 * 创建安全响应头
 */
function createSecurityHeaders(customHeaders?: HeadersInit): HeadersInit {
  const securityHeaders: HeadersInit = {
    // 基础安全头
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    
    // CORS头
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    
    // CSP头（更安全的策略）
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';",
    
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
      cacheDirectives.push(`stale-while-revalidate=${cacheConfig.staleWhileRevalidate}`);
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
  total: number,
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
  const processId = process.pid?.toString(36) || '0';
  return `${timestamp}-${processId}-${random}`;
}

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
  cacheConfig?: CacheConfig,
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
 * 200 - 成功响应
 */
function ok<T extends ApiResponseData = null>(
  data: T = null as T,
  message: string = "请求成功",
  customHeaders?: HeadersInit,
  meta?: PaginationMeta,
  cacheConfig?: CacheConfig,
): NextResponse<ApiResponse<T>> {
  return createResponse(200, true, message, data, undefined, customHeaders, meta, cacheConfig);
}

/**
 * 201 - 创建成功
 */
function created<T extends ApiResponseData>(
  data: T,
  message: string = "创建成功",
  customHeaders?: HeadersInit,
  meta?: PaginationMeta,
  cacheConfig?: CacheConfig,
): NextResponse<ApiResponse<T>> {
  return createResponse(201, true, message, data, undefined, customHeaders, meta, cacheConfig);
}

/**
 * 204 - 无内容
 */
function noContent(
  message: string = "操作成功",
  customHeaders?: HeadersInit,
  cacheConfig?: CacheConfig,
): NextResponse<ApiResponse<null>> {
  return createResponse(204, true, message, null, undefined, customHeaders, undefined, cacheConfig);
}

/**
 * 400 - 请求错误
 */
function badRequest(
  message: string = "请求参数错误",
  error?: ApiError | string,
  customHeaders?: HeadersInit,
): NextResponse<ApiResponse<null>> {
  const apiError = typeof error === 'string' 
    ? { code: 'BAD_REQUEST', message: error }
    : error;
  return createResponse(400, false, message, null, apiError, customHeaders);
}

/**
 * 401 - 未授权
 */
function unauthorized(
  message: string = "未授权访问",
  customHeaders?: HeadersInit,
): NextResponse<ApiResponse<null>> {
  return createResponse(401, false, message, null, undefined, customHeaders);
}

/**
 * 403 - 禁止访问
 */
function forbidden(
  message: string = "禁止访问",
  customHeaders?: HeadersInit,
): NextResponse<ApiResponse<null>> {
  return createResponse(403, false, message, null, undefined, customHeaders);
}

/**
 * 404 - 未找到
 */
function notFound(
  message: string = "资源未找到",
  customHeaders?: HeadersInit,
): NextResponse<ApiResponse<null>> {
  return createResponse(404, false, message, null, undefined, customHeaders);
}

/**
 * 409 - 冲突
 */
function conflict(
  message: string = "资源冲突",
  error?: ApiError | string,
  customHeaders?: HeadersInit,
): NextResponse<ApiResponse<null>> {
  const apiError = typeof error === 'string' 
    ? { code: 'CONFLICT', message: error }
    : error;
  return createResponse(409, false, message, null, apiError, customHeaders);
}

/**
 * 422 - 无法处理的实体
 */
function unprocessableEntity(
  message: string = "验证失败",
  error?: ApiError | string,
  customHeaders?: HeadersInit,
): NextResponse<ApiResponse<null>> {
  const apiError = typeof error === 'string' 
    ? { code: 'VALIDATION_ERROR', message: error }
    : error;
  return createResponse(422, false, message, null, apiError, customHeaders);
}

/**
 * 429 - 请求过多
 */
function tooManyRequests(
  message: string = "请求过于频繁，请稍后再试",
  customHeaders?: HeadersInit,
): NextResponse<ApiResponse<null>> {
  return createResponse(429, false, message, null, undefined, customHeaders);
}

/**
 * 500 - 服务器错误
 */
function serverError(
  message: string = "服务器内部错误",
  error?: ApiError | string,
  customHeaders?: HeadersInit,
): NextResponse<ApiResponse<null>> {
  const apiError = typeof error === 'string' 
    ? { code: 'INTERNAL_ERROR', message: error }
    : error;
  return createResponse(500, false, message, null, apiError, customHeaders);
}

/**
 * 503 - 服务不可用
 */
function serviceUnavailable(
  message: string = "服务暂时不可用",
  customHeaders?: HeadersInit,
): NextResponse<ApiResponse<null>> {
  return createResponse(503, false, message, null, undefined, customHeaders);
}

/**
 * 304 - 未修改 (用于条件请求)
 */
function notModified(customHeaders?: HeadersInit): NextResponse<ApiResponse<null>> {
  return createResponse(304, true, "未修改", null, undefined, customHeaders);
}

/**
 * 带缓存的成功响应
 */
function cached<T extends ApiResponseData>(
  data: T,
  cacheConfig: CacheConfig,
  message: string = "请求成功",
  customHeaders?: HeadersInit,
  meta?: PaginationMeta,
): NextResponse<ApiResponse<T>> {
  return createResponse(200, true, message, data, undefined, customHeaders, meta, cacheConfig);
}

/**
 * 生成ETag（使用更高效的哈希）
 */
function generateETag(data: unknown): string {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  return `"${hash}"`;
}

/**
 * 检查条件请求
 */
function checkConditionalRequest(
  request: Request,
  etag?: string,
  lastModified?: Date,
): { isNotModified: boolean; headers: HeadersInit } {
  const headers: HeadersInit = {};
  
  if (etag) headers["ETag"] = etag;
  if (lastModified) headers["Last-Modified"] = lastModified.toUTCString();
  
  const ifNoneMatch = request.headers.get("If-None-Match");
  const ifModifiedSince = request.headers.get("If-Modified-Since");
  
  let isNotModified = false;
  
  if (ifNoneMatch && etag) {
    const clientETags = ifNoneMatch.split(',').map(tag => tag.trim());
    isNotModified = clientETags.some(clientETag => 
      clientETag === etag || clientETag === '*'
    );
  } else if (ifModifiedSince && lastModified) {
    const ifModifiedSinceDate = new Date(ifModifiedSince);
    if (lastModified <= ifModifiedSinceDate) {
      isNotModified = true;
    }
  }
  
  return { isNotModified, headers };
}

/**
 * 通用响应函数，附带所有状态码方法
 */
function responseCore<T extends ApiResponseData = null>(
  status: number,
  message: string,
  data: T = null as T,
  customHeaders?: HeadersInit,
  meta?: PaginationMeta,
  cacheConfig?: CacheConfig,
): NextResponse<ApiResponse<T>> {
  const success = status >= 200 && status < 300;
  return createResponse(status, success, message, data, undefined, customHeaders, meta, cacheConfig);
}

/**
 * 创建字段验证错误
 */
function fieldError(field: string, message: string, details?: Record<string, any>): ApiError {
  return {
    code: 'FIELD_VALIDATION_ERROR',
    message: `${field}: ${message}`,
    field,
    details,
  };
}

/**
 * 验证失败响应（带字段信息）
 */
function validationError(
  field: string,
  message: string,
  details?: Record<string, any>,
  customHeaders?: HeadersInit,
): NextResponse<ApiResponse<null>> {
  const error = fieldError(field, message, details);
  return createResponse(422, false, "数据验证失败", null, error, customHeaders);
}

const response = Object.assign(responseCore, {
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
  generateETag,
  checkConditionalRequest,
});

export default response;
export { createSecurityHeaders, createCacheHeaders };

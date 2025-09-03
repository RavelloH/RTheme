import { NextResponse } from "next/server";
import type { ApiResponse, PaginationMeta } from "@repo/shared-types/api/common";

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
 * 创建统一格式的 API 响应
 */
function createResponse<T = unknown>(
  status: number,
  success: boolean,
  message: string,
  data: T | null = null,
  error?: string,
  customHeaders?: HeadersInit,
  meta?: PaginationMeta,
): NextResponse<ApiResponse<T>> {
  const responseBody: ApiResponse<T> = {
    success,
    message,
    data,
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
    ...(error && { error }),
    ...(meta && { meta }),
  };

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "x-request-id": responseBody.requestId,
    ...customHeaders,
  };

  return NextResponse.json(responseBody, { status, headers });
}

/**
 * 200 - 成功响应
 */
function ok<T = unknown>(
  data?: T,
  message: string = "请求成功",
  customHeaders?: HeadersInit,
  meta?: PaginationMeta,
): NextResponse<ApiResponse<T>> {
  return createResponse(200, true, message, data, undefined, customHeaders, meta);
}

/**
 * 201 - 创建成功
 */
function created<T = unknown>(
  data: T,
  message: string = "创建成功",
  customHeaders?: HeadersInit,
  meta?: PaginationMeta,
): NextResponse<ApiResponse<T>> {
  return createResponse(201, true, message, data, undefined, customHeaders, meta);
}

/**
 * 204 - 无内容
 */
function noContent(
  message: string = "操作成功",
  customHeaders?: HeadersInit,
): NextResponse<ApiResponse<null>> {
  return createResponse(204, true, message, null, undefined, customHeaders);
}

/**
 * 400 - 请求错误
 */
function badRequest(
  message: string = "请求参数错误",
  error?: string,
  customHeaders?: HeadersInit,
): NextResponse<ApiResponse<null>> {
  return createResponse(400, false, message, null, error, customHeaders);
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
  error?: string,
  customHeaders?: HeadersInit,
): NextResponse<ApiResponse<null>> {
  return createResponse(409, false, message, null, error, customHeaders);
}

/**
 * 422 - 无法处理的实体
 */
function unprocessableEntity(
  message: string = "验证失败",
  error?: string,
  customHeaders?: HeadersInit,
): NextResponse<ApiResponse<null>> {
  return createResponse(422, false, message, null, error, customHeaders);
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
  error?: string,
  customHeaders?: HeadersInit,
): NextResponse<ApiResponse<null>> {
  return createResponse(500, false, message, null, error, customHeaders);
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
 * 通用响应函数，附带所有状态码方法
 */
function responseCore(
  status: number,
  message: string,
  data: unknown = null,
  customHeaders?: HeadersInit,
  meta?: PaginationMeta,
): NextResponse<ApiResponse<unknown>> {
  const success = status >= 200 && status < 300;
  return createResponse(status, success, message, data, undefined, customHeaders, meta);
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
  createPaginationMeta,
});

export default response;

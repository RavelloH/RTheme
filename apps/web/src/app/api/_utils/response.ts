import { NextResponse } from "next/server";

/**
 * API 响应的统一格式
 */
interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  timestamp: string;
  requestId?: string;
  error?: string;
}

/*
 * 创建Request ID
 */
function generateRequestId(): string {
  return crypto.randomUUID();
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
  customHeaders?: HeadersInit
): NextResponse<ApiResponse<T>> {
  const requestId = generateRequestId();

  const responseBody: ApiResponse<T> = {
    success,
    message,
    data,
    timestamp: new Date().toISOString(),
    requestId,
  };

  // 添加错误信息
  if (error) {
    responseBody.error = error;
  }

  // 合并默认 headers 和自定义 headers
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "x-request-id": requestId,
    ...customHeaders,
  };

  return NextResponse.json(responseBody, { status, headers });
}

/**
 * 200 - 成功响应
 */
export function ok<T = unknown>(
  data?: T,
  message: string = "请求成功",
  customHeaders?: HeadersInit
): NextResponse<ApiResponse<T>> {
  return createResponse(200, true, message, data, undefined, customHeaders);
}

/**
 * 201 - 创建成功
 */
export function created<T = unknown>(
  data: T,
  message: string = "创建成功",
  customHeaders?: HeadersInit
): NextResponse<ApiResponse<T>> {
  return createResponse(201, true, message, data, undefined, customHeaders);
}

/**
 * 204 - 无内容
 */
export function noContent(
  message: string = "操作成功",
  customHeaders?: HeadersInit
): NextResponse<ApiResponse<null>> {
  return createResponse(204, true, message, null, undefined, customHeaders);
}

/**
 * 400 - 请求错误
 */
export function badRequest(
  message: string = "请求参数错误",
  error?: string,
  customHeaders?: HeadersInit
): NextResponse<ApiResponse<null>> {
  return createResponse(400, false, message, null, error, customHeaders);
}

/**
 * 401 - 未授权
 */
export function unauthorized(
  message: string = "未授权访问",
  customHeaders?: HeadersInit
): NextResponse<ApiResponse<null>> {
  return createResponse(401, false, message, null, undefined, customHeaders);
}

/**
 * 403 - 禁止访问
 */
export function forbidden(
  message: string = "禁止访问",
  customHeaders?: HeadersInit
): NextResponse<ApiResponse<null>> {
  return createResponse(403, false, message, null, undefined, customHeaders);
}

/**
 * 404 - 未找到
 */
export function notFound(
  message: string = "资源未找到",
  customHeaders?: HeadersInit
): NextResponse<ApiResponse<null>> {
  return createResponse(404, false, message, null, undefined, customHeaders);
}

/**
 * 409 - 冲突
 */
export function conflict(
  message: string = "资源冲突",
  error?: string,
  customHeaders?: HeadersInit
): NextResponse<ApiResponse<null>> {
  return createResponse(409, false, message, null, error, customHeaders);
}

/**
 * 422 - 无法处理的实体
 */
export function unprocessableEntity(
  message: string = "验证失败",
  error?: string,
  customHeaders?: HeadersInit
): NextResponse<ApiResponse<null>> {
  return createResponse(422, false, message, null, error, customHeaders);
}

/**
 * 429 - 请求过多
 */
export function tooManyRequests(
  message: string = "请求过于频繁，请稍后再试",
  customHeaders?: HeadersInit
): NextResponse<ApiResponse<null>> {
  return createResponse(429, false, message, null, undefined, customHeaders);
}

/**
 * 500 - 服务器错误
 */
export function serverError(
  message: string = "服务器内部错误",
  error?: string,
  customHeaders?: HeadersInit
): NextResponse<ApiResponse<null>> {
  return createResponse(500, false, message, null, error, customHeaders);
}

/**
 * 503 - 服务不可用
 */
export function serviceUnavailable(
  message: string = "服务暂时不可用",
  customHeaders?: HeadersInit
): NextResponse<ApiResponse<null>> {
  return createResponse(503, false, message, null, undefined, customHeaders);
}

/**
 * 通用响应函数
 * 状态码 消息 数据 自定义头
 */
export default function response(
  status: number,
  message: string,
  data: unknown = null,
  customHeaders?: HeadersInit
): NextResponse<ApiResponse<unknown>> {
  const success = status >= 200 && status < 300;
  return createResponse(
    status,
    success,
    message,
    data,
    undefined,
    customHeaders
  );
}

/**
 * 导出类型定义供其他文件使用
 */
export type { ApiResponse };

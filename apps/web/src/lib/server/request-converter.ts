import "server-only";

import type { z } from "zod";
import type { NextResponse } from "next/server";
import { connection } from "next/server";
import { validateRequestData } from "./validator";

/**
 * 将GET请求转换为POST请求格式的工具函数
 * 用于将GET请求的查询参数转换为对象，并从Authorization header中提取JWT token
 */

/**
 * 将GET请求转换为POST请求格式
 * @param request - 原始的Request对象
 * @returns 包含查询参数和access_token的对象
 *
 * @example
 * // GET /?force=true
 * // Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
 * const body = convertGetToPost(request)
 * // 返回: { force: true, access_token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." }
 */
export async function convertGetToPost(
  request: Request,
): Promise<Record<string, unknown>> {
  await connection();
  // 解析URL查询参数
  const url = new URL(request.url);
  const params: Record<string, unknown> = {};

  // 将所有查询参数转换为对象
  url.searchParams.forEach((value, key) => {
    // 尝试将字符串值转换为合适的类型
    if (value === "true") {
      params[key] = true;
    } else if (value === "false") {
      params[key] = false;
    } else if (value === "null") {
      params[key] = null;
    } else if (value === "undefined") {
      params[key] = undefined;
    } else if (!isNaN(Number(value)) && value !== "") {
      // 如果是数字，转换为数字类型
      params[key] = Number(value);
    } else {
      // 保持字符串类型
      params[key] = value;
    }
  });

  // 从Authorization header中提取JWT token
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    // 截取Bearer后面的token
    const token = authHeader.substring(7); // "Bearer ".length = 7
    params.access_token = token;
  }

  return params;
}

/**
 * 验证GET请求并转换为POST格式
 * 自动从查询参数和Authorization header中提取数据并验证
 *
 * @param request - 原始的Request对象
 * @param schema - Zod 验证 schema
 * @returns 成功时返回验证后的数据，失败时返回响应对象
 *
 * @example
 * // GET /?force=true
 * // Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
 * const result = await validateGetRequest(request, GetUsersStatsSchema)
 * if (result instanceof Response) return result
 * const { access_token, force } = result.data
 */
export async function validateGetRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): Promise<{ success: true; data: T } | NextResponse> {
  // 将GET请求转换为对象
  const data = await convertGetToPost(request);

  // 使用现有的验证函数验证数据
  return validateRequestData(data, schema);
}

/**
 * 验证POST请求
 * 自动从请求体中提取数据并验证
 */
export function validatePostRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): { success: true; data: T } | NextResponse {
  return validateRequestData(request, schema);
}

/**
 * 验证PUT请求
 * 自动从请求体中提取数据并验证
 */
export function validatePutRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): { success: true; data: T } | NextResponse {
  return validateRequestData(request, schema);
}

/**
 * 验证PATCH请求
 * 自动从请求体中提取数据并验证
 */
export function validatePatchRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): { success: true; data: T } | NextResponse {
  return validateRequestData(request, schema);
}

/**
 * 验证DELETE请求
 * 自动从请求体中提取数据并验证
 */
export function validateDeleteRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): { success: true; data: T } | NextResponse {
  return validateRequestData(request, schema);
}

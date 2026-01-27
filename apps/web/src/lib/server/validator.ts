import "server-only";

import type { z } from "zod";
import type { NextResponse } from "next/server";
import ResponseBuilder from "./response";

/**
 * 验证错误详情
 */
interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * 验证结果
 */
interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationErrorDetail[];
}

/**
 * validateData专用的验证选项
 */
interface ValidateDataOptions {
  /** 自定义错误消息 */
  errorMessage?: string;
  /** 自定义错误码 */
  errorCode?: string;
}

/**
 * 验证失败时返回的结构
 */
export interface ValidationErrorResponse {
  message: string;
  error: {
    code: string;
    message: string;
    details?: {
      errors: ValidationErrorDetail[];
    };
  };
}

/**
 * 验证请求数据
 * @param body 请求体数据
 * @param schema Zod 验证 schema
 * @param errorMessage 自定义错误消息
 * @returns 成功时返回验证后的数据，失败时返回响应对象
 */
export function validateRequestData<T>(
  body: unknown,
  schema: z.ZodSchema<T>,
): { success: true; data: T } | NextResponse {
  const errorMessage = "请求数据格式不正确";

  try {
    // 使用 Zod 验证数据
    const validationResult = schema.safeParse(body);

    if (!validationResult.success) {
      // 提取验证错误信息
      const errors: ValidationErrorDetail[] = validationResult.error.issues.map(
        (err) => ({
          field: err.path.join("."),
          message: err.message,
        }),
      );

      const responseBuilder = new ResponseBuilder("serverless");
      const errorResponse = responseBuilder.badRequest({
        message: errorMessage,
        error: {
          code: "VALIDATION_ERROR",
          message: "请求数据格式不正确",
          details: { errors },
        },
      });

      // 确保返回NextResponse类型
      return errorResponse as NextResponse;
    }

    // 验证成功，返回数据
    return {
      success: true,
      data: validationResult.data,
    };
  } catch (error) {
    console.error("Validation error:", error);

    const responseBuilder = new ResponseBuilder("serverless");
    const errorResponse = responseBuilder.serverError({
      message: "验证失败，请稍后重试",
      error: {
        code: "VALIDATION_INTERNAL_ERROR",
        message: "验证过程中发生内部错误",
      },
    });

    return errorResponse as NextResponse;
  }
}

/**
 * 异步验证请求数据（用于处理 JSON 解析）
 * @param request Request 对象
 * @param schema Zod 验证 schema
 * @returns 成功时返回验证后的数据，失败时返回响应对象
 */
export async function validateRequestJSON<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): Promise<{ success: true; data: T } | NextResponse> {
  try {
    // 解析 JSON 数据
    const body = await request.json();

    // 调用同步验证函数
    return validateRequestData(body, schema);
  } catch (error) {
    console.error("JSON parsing error:", error);

    const responseBuilder = new ResponseBuilder("serverless");
    const errorResponse = responseBuilder.badRequest({
      message: "请求格式错误",
      error: {
        code: "INVALID_JSON",
        message: "请求体必须是有效的 JSON 格式",
      },
    });

    return errorResponse as NextResponse;
  }
}

/**
 * 验证查询参数
 * @param searchParams URLSearchParams 对象
 * @param schema Zod 验证 schema
 * @returns 成功时返回验证后的数据，失败时返回响应对象
 */
export function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>,
): { success: true; data: T } | NextResponse {
  // 将 URLSearchParams 转换为普通对象
  const params: Record<string, string | string[]> = {};

  for (const [key, value] of searchParams.entries()) {
    if (params[key]) {
      // 如果已存在该键，转换为数组
      if (Array.isArray(params[key])) {
        (params[key] as string[]).push(value);
      } else {
        params[key] = [params[key] as string, value];
      }
    } else {
      params[key] = value;
    }
  }

  // 调用同步验证函数
  return validateRequestData(params, schema);
}

/**
 * 快速验证工具函数 - 返回响应对象
 * @param body 请求体数据
 * @param schema Zod 验证 schema
 * @returns 成功时返回验证后的数据，失败时返回响应对象
 */
export function validate<T>(
  body: unknown,
  schema: z.ZodSchema<T>,
): { success: true; data: T } | NextResponse {
  return validateRequestData(body, schema);
}

/**
 * 快速异步验证工具函数 - 返回响应对象
 * @param request Request 对象
 * @param schema Zod 验证 schema
 * @returns 成功时返回验证后的数据，失败时返回响应对象
 */
export async function validateJSON<T>(
  request: Request,
  schema: z.ZodSchema<T>,
): Promise<{ success: true; data: T } | NextResponse> {
  return await validateRequestJSON(request, schema);
}

/**
 * 直接验证数据对象 - 专门用于验证已知数据结构
 * @param data 要验证的数据对象
 * @param schema Zod 验证 schema
 * @param options 验证选项
 * @returns 验证结果或响应对象
 */
export function validateData<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  options: ValidateDataOptions = {},
): ValidationErrorResponse | undefined {
  const { errorMessage = "数据验证失败", errorCode = "VALIDATION_ERROR" } =
    options;

  try {
    const result = schema.safeParse(data);

    if (!result.success) {
      const errors: ValidationErrorDetail[] = result.error.issues.map(
        (err) => ({
          field: err.path.join("."),
          message: err.message,
        }),
      );

      return {
        message: errorMessage,
        error: {
          code: errorCode,
          message: "数据格式不正确",
          details: { errors },
        },
      };
    }

    // 验证成功
    return undefined;
  } catch (error) {
    console.error("Data validation error:", error);

    return {
      message: "验证失败，请稍后重试",
      error: {
        code: "VALIDATION_INTERNAL_ERROR",
        message: "验证过程中发生内部错误",
      },
    };
  }
}

// 导出类型
export type { ValidationResult, ValidationErrorDetail, ValidateDataOptions };

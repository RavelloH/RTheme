import { z } from "zod";
import { NextResponse } from "next/server";
import response from "./response";

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
 * 验证选项
 */
interface ValidationOptions {
  /** 自定义错误消息 */
  errorMessage?: string;
  /** 是否返回响应对象，默认为 true */
  returnResponse?: boolean;
}

/**
 * 验证请求数据
 * @param body 请求体数据
 * @param schema Zod 验证 schema
 * @param options 验证选项
 * @returns 验证结果或响应对象
 */
export function validateRequestData<T>(
  body: unknown,
  schema: z.ZodSchema<T>,
  options: ValidationOptions & { returnResponse: false }
): ValidationResult<T>;
export function validateRequestData<T>(
  body: unknown,
  schema: z.ZodSchema<T>,
  options?: ValidationOptions
): NextResponse | ValidationResult<T>;
export function validateRequestData<T>(
  body: unknown,
  schema: z.ZodSchema<T>,
  options: ValidationOptions = {}
): NextResponse | ValidationResult<T> {
  const { errorMessage = "数据验证失败", returnResponse = true } = options;

  try {
    // 使用 Zod 验证数据
    const validationResult = schema.safeParse(body);

    if (!validationResult.success) {
      // 提取验证错误信息
      const errors: ValidationErrorDetail[] = validationResult.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      const result: ValidationResult<T> = {
        success: false,
        errors,
      };

      // 如果需要返回响应对象
      if (returnResponse) {
        return response.badRequest({
          message: errorMessage,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求数据格式不正确",
            details: { errors },
          },
        });
      }

      return result;
    }

    // 验证成功
    const result: ValidationResult<T> = {
      success: true,
      data: validationResult.data,
    };

    return result;
  } catch (error) {
    console.error("Validation error:", error);

    const result: ValidationResult<T> = {
      success: false,
      errors: [
        {
          field: "unknown",
          message: "验证过程中发生错误",
        },
      ],
    };

    // 如果需要返回响应对象
    if (returnResponse) {
      return response.serverError({
        message: "验证失败，请稍后重试",
        error: {
          code: "VALIDATION_INTERNAL_ERROR",
          message: "验证过程中发生内部错误",
        },
      });
    }

    return result;
  }
}

/**
 * 异步验证请求数据（用于处理 JSON 解析）
 * @param request Request 对象
 * @param schema Zod 验证 schema
 * @param options 验证选项
 * @returns 验证结果或响应对象
 */
export async function validateRequestJSON<T>(
  request: Request,
  schema: z.ZodSchema<T>,
  options: ValidationOptions & { returnResponse: false }
): Promise<ValidationResult<T>>;
export async function validateRequestJSON<T>(
  request: Request,
  schema: z.ZodSchema<T>,
  options?: ValidationOptions
): Promise<NextResponse | ValidationResult<T>>;
export async function validateRequestJSON<T>(
  request: Request,
  schema: z.ZodSchema<T>,
  options: ValidationOptions = {}
): Promise<NextResponse | ValidationResult<T>> {
  const { returnResponse = true } = options;

  try {
    // 解析 JSON 数据
    const body = await request.json();
    
    // 调用同步验证函数
    return validateRequestData(body, schema, options);
  } catch (error) {
    console.error("JSON parsing error:", error);

    const result: ValidationResult<T> = {
      success: false,
      errors: [
        {
          field: "body",
          message: "请求体必须是有效的 JSON 格式",
        },
      ],
    };

    // 如果需要返回响应对象
    if (returnResponse) {
      return response.badRequest({
        message: "请求格式错误",
        error: {
          code: "INVALID_JSON",
          message: "请求体必须是有效的 JSON 格式",
        },
      });
    }

    return result;
  }
}

/**
 * 验证查询参数
 * @param searchParams URLSearchParams 对象
 * @param schema Zod 验证 schema
 * @param options 验证选项
 * @returns 验证结果或响应对象
 */
export function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>,
  options: ValidationOptions & { returnResponse: false }
): ValidationResult<T>;
export function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>,
  options?: ValidationOptions
): NextResponse | ValidationResult<T>;
export function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>,
  options: ValidationOptions = {}
): NextResponse | ValidationResult<T> {
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
  return validateRequestData(params, schema, options);
}

/**
 * 快速验证工具函数 - 只返回验证结果，不返回响应
 * @param body 请求体数据
 * @param schema Zod 验证 schema
 * @returns 验证结果
 */
export function validate<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  return validateRequestData(body, schema, { returnResponse: false });
}

/**
 * 快速异步验证工具函数 - 只返回验证结果，不返回响应
 * @param request Request 对象
 * @param schema Zod 验证 schema
 * @returns 验证结果
 */
export async function validateJSON<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  return await validateRequestJSON(request, schema, { returnResponse: false });
}

// 导出类型
export type { ValidationResult, ValidationErrorDetail, ValidationOptions };

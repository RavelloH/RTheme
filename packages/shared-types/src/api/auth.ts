import { z } from "zod";
import { createSuccessResponseSchema, createErrorResponseSchema } from "./common.js";

// 用户名验证：只能由小写字母、数字和下划线组成
const usernameSchema = z
  .string()
  .min(3, "用户名至少需要3个字符")
  .max(20, "用户名不能超过20个字符")
  .regex(/^[a-z0-9_]+$/, "用户名只能由小写字母、数字和下划线组成");

// 密码验证
const passwordSchema = z
  .string()
  .min(6, "密码至少需要6个字符")
  .max(100, "密码不能超过100个字符");

// 邮箱验证
const emailSchema = z.string().email("请输入有效的邮箱地址");

// 昵称验证
const nicknameSchema = z
  .string()
  .min(2, "昵称至少需要2个字符")
  .max(20, "昵称不能超过20个字符");

// 用户注册 Schema
export const RegisterUserSchema = z.object({
  username: usernameSchema,
  nickname: nicknameSchema.optional(),
  password: passwordSchema,
  email: emailSchema,
});

// 用户数据 Schema（返回给前端的用户信息，不包含密码等敏感信息）
export const UserDataSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  email: z.string().email(),
  nickname: z.string(),
  role: z.enum(["USER", "ADMIN", "EDITOR"]),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  isEmailVerified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// 使用构建器创建响应 schemas
export const RegisterSuccessResponseSchema = createSuccessResponseSchema(UserDataSchema);

export const ValidationErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("VALIDATION_ERROR"),
    message: z.string(),
    details: z.array(z.object({
      field: z.string(),
      message: z.string(),
    })).optional(),
  })
);

export const ConflictErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("USER_EXISTS"),
    message: z.string(),
  })
);

export const RateLimitErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("TOO_MANY_REQUESTS"),
    message: z.string(),
  })
);

export const ServerErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("INTERNAL_SERVER_ERROR"),
    message: z.string(),
  })
);

// 导出推导的 TypeScript 类型
export type RegisterUser = z.infer<typeof RegisterUserSchema>;
export type UserData = z.infer<typeof UserDataSchema>;
export type RegisterSuccessResponse = z.infer<typeof RegisterSuccessResponseSchema>;
export type ValidationErrorResponse = z.infer<typeof ValidationErrorResponseSchema>;
export type ConflictErrorResponse = z.infer<typeof ConflictErrorResponseSchema>;
export type RateLimitErrorResponse = z.infer<typeof RateLimitErrorResponseSchema>;
export type ServerErrorResponse = z.infer<typeof ServerErrorResponseSchema>;

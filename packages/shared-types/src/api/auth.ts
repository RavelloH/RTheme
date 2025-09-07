import { z } from "zod";
import {
  createSuccessResponseSchema,
  createErrorResponseSchema,
  registerSchema,
} from "./common.js";

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

// =============================================================================
// Request Schemas
// =============================================================================
// 用户注册 Schema
export const RegisterUserSchema = z.object({
  username: usernameSchema,
  nickname: nicknameSchema.optional(),
  password: passwordSchema,
  email: emailSchema,
  captcha_token: z.string().min(1, "验证码不能为空"),
});

export const LoginUserSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  token_transport: z.enum(["cookie", "body"]).default("cookie"),
  captcha_token: z.string().min(1, "验证码不能为空"),
});

// =============================================================================
// Response Schemas
// =============================================================================
// 使用构建器创建响应 schemas
// 注册成功响应不返回任何用户数据，只返回成功消息
export const RegisterSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  timestamp: z.string().datetime(),
  requestId: z.string(),
  data: z.null(),
});

export const ValidationErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("VALIDATION_ERROR"),
    message: z.string(),
    details: z
      .array(
        z.object({
          field: z.string(),
          message: z.string(),
        })
      )
      .optional(),
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

// 登录成功响应
export const LoginSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  timestamp: z.string().datetime(),
  requestId: z.string(),
  data: z.object({
    access_token: z.string(),
    refresh_token: z.string().optional(), // cookie模式下不返回
  }),
});

// 登录相关的错误响应
export const InvalidCredentialsErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("INVALID_CREDENTIALS"),
    message: z.string(),
  })
);

export const SsoUserErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("SSO_USER"),
    message: z.string(),
    details: z
      .array(
        z.object({
          provider: z.string(),
        })
      )
      .optional(),
  })
);

export const EmailNotVerifiedErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("EMAIL_NOT_VERIFIED"),
    message: z.string(),
  })
);

// 自动注册所有schemas到OpenAPI生成器
registerSchema("RegisterUser", RegisterUserSchema);
registerSchema("LoginUser", LoginUserSchema);
registerSchema("RegisterSuccessResponse", RegisterSuccessResponseSchema);
registerSchema("LoginSuccessResponse", LoginSuccessResponseSchema);
registerSchema("ValidationErrorResponse", ValidationErrorResponseSchema);
registerSchema("ConflictErrorResponse", ConflictErrorResponseSchema);
registerSchema("InvalidCredentialsErrorResponse", InvalidCredentialsErrorResponseSchema);
registerSchema("SsoUserErrorResponse", SsoUserErrorResponseSchema);
registerSchema("EmailNotVerifiedErrorResponse", EmailNotVerifiedErrorResponseSchema);
registerSchema("RateLimitErrorResponse", RateLimitErrorResponseSchema);
registerSchema("ServerErrorResponse", ServerErrorResponseSchema);

// 导出推导的 TypeScript 类型
export type RegisterUser = z.infer<typeof RegisterUserSchema>;
export type LoginUser = z.infer<typeof LoginUserSchema>;
export type RegisterSuccessResponse = z.infer<
  typeof RegisterSuccessResponseSchema
>;
export type LoginSuccessResponse = z.infer<typeof LoginSuccessResponseSchema>;
export type ValidationErrorResponse = z.infer<
  typeof ValidationErrorResponseSchema
>;
export type ConflictErrorResponse = z.infer<typeof ConflictErrorResponseSchema>;
export type InvalidCredentialsErrorResponse = z.infer<
  typeof InvalidCredentialsErrorResponseSchema
>;
export type SsoUserErrorResponse = z.infer<typeof SsoUserErrorResponseSchema>;
export type EmailNotVerifiedErrorResponse = z.infer<
  typeof EmailNotVerifiedErrorResponseSchema
>;
export type RateLimitErrorResponse = z.infer<
  typeof RateLimitErrorResponseSchema
>;
export type ServerErrorResponse = z.infer<typeof ServerErrorResponseSchema>;

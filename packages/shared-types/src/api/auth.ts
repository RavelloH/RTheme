import { z } from "zod";
import {
  createSuccessResponseSchema,
  createErrorResponseSchema,
  registerSchema,
} from "./common.js";

// 用户名验证：只能以小写字母开头，只能包含小写字母、数字和下划线
const usernameSchema = z
  .string()
  .min(3, "用户名至少需要3个字符")
  .max(20, "用户名不能超过20个字符")
  .regex(/^[a-z][a-z0-9_]*$/, "用户名只能以小写字母开头，只能包含小写字母、数字和下划线");

// 密码验证
const passwordSchema = z
  .string()
  .min(6, "密码至少需要6个字符")
  .max(100, "密码不能超过100个字符");

// 邮箱验证
const emailSchema = z.email("请输入有效的邮箱地址");

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

// 用户登录 Schema
export const LoginUserSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  token_transport: z.enum(["cookie", "body"]).default("cookie"),
  captcha_token: z.string().min(1, "验证码不能为空"),
});

// 令牌刷新 Schema
export const RefreshTokenSchema = z.object({
  refresh_token: z.string().optional(),
  token_transport: z.enum(["cookie", "body"]).default("cookie"),
});

// 邮箱验证 Schema
export const EmailVerificationSchema = z.object({
  code: z.string().min(1, "验证码不能为空"),
  captcha_token: z.string().min(1, "验证码不能为空"),
  email: emailSchema,
});

// 重发邮箱验证码 Schema
export const ResendEmailVerificationSchema = z.object({
  email: emailSchema,
  captcha_token: z.string().min(1, "验证码不能为空"),
});

// 更改密码 Schema
export const ChangePasswordSchema = z.object({
  old_password: passwordSchema,
  new_password: passwordSchema,
  access_token: z.string().optional(),
});

// 请求重置密码 Schema
export const RequestPasswordResetSchema = z.object({
  email: emailSchema,
  captcha_token: z.string().min(1, "验证码不能为空"),
});

// 重置密码 Schema
export const ResetPasswordSchema = z.object({
  code: z.string().min(1, "验证码不能为空"),
  new_password: passwordSchema,
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
  timestamp: z.iso.datetime(),
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

// 邮箱验证成功响应
export const EmailVerifySuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  timestamp: z.string().datetime(),
  requestId: z.string(),
  data: z.null(),
});

// 重发邮箱验证码成功响应
export const ResendEmailVerificationSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  timestamp: z.string().datetime(),
  requestId: z.string(),
  data: z.null(),
});

// 邮箱验证相关的错误响应
export const EmailAlreadyVerifiedErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("EMAIL_ALREADY_VERIFIED"),
    message: z.string(),
  })
);

export const InvalidOrExpiredCodeErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("INVALID_OR_EXPIRED_CODE"),
    message: z.string(),
  })
);

export const UnauthorizedErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("UNAUTHORIZED"),
    message: z.string(),
  })
);

export const UserNotFoundErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("USER_NOT_FOUND"),
    message: z.string(),
  })
);

// 密码修改成功响应
export const ChangePasswordSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  timestamp: z.string().datetime(),
  requestId: z.string(),
  data: z.null(),
});

// 密码修改相关的错误响应
export const NoPasswordSetErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("NO_PASSWORD_SET"),
    message: z.string(),
  })
);

export const InvalidOldPasswordErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("INVALID_OLD_PASSWORD"),
    message: z.string(),
  })
);

export const PasswordsIdenticalErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("PASSWORDS_IDENTICAL"),
    message: z.string(),
  })
);

// 密码重置成功响应
export const PasswordResetRequestSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  timestamp: z.string().datetime(),
  requestId: z.string(),
  data: z.null(),
});

export const ResetPasswordSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  timestamp: z.string().datetime(),
  requestId: z.string(),
  data: z.null(),
});

// 密码重置相关的错误响应
export const InvalidResetCodeErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("INVALID_RESET_CODE"),
    message: z.string(),
  })
);

export const ExpiredResetCodeErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("EXPIRED_RESET_CODE"),
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
    access_token: z.string().optional(),
    refresh_token: z.string().optional(),
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
registerSchema("RefreshToken", RefreshTokenSchema);
registerSchema("EmailVerification", EmailVerificationSchema);
registerSchema("ResendEmailVerification", ResendEmailVerificationSchema);
registerSchema("ChangePassword", ChangePasswordSchema);
registerSchema("RequestPasswordReset", RequestPasswordResetSchema);
registerSchema("ResetPassword", ResetPasswordSchema);

registerSchema("RegisterSuccessResponse", RegisterSuccessResponseSchema);
registerSchema("LoginSuccessResponse", LoginSuccessResponseSchema);
registerSchema("ValidationErrorResponse", ValidationErrorResponseSchema);
registerSchema("ConflictErrorResponse", ConflictErrorResponseSchema);
registerSchema("InvalidCredentialsErrorResponse", InvalidCredentialsErrorResponseSchema);
registerSchema("SsoUserErrorResponse", SsoUserErrorResponseSchema);
registerSchema("EmailNotVerifiedErrorResponse", EmailNotVerifiedErrorResponseSchema);
registerSchema("RateLimitErrorResponse", RateLimitErrorResponseSchema);
registerSchema("ServerErrorResponse", ServerErrorResponseSchema);

// 注册邮箱验证相关的 schema
registerSchema("EmailVerifySuccessResponse", EmailVerifySuccessResponseSchema);
registerSchema("ResendEmailVerificationSuccessResponse", ResendEmailVerificationSuccessResponseSchema);
registerSchema("EmailAlreadyVerifiedErrorResponse", EmailAlreadyVerifiedErrorResponseSchema);
registerSchema("InvalidOrExpiredCodeErrorResponse", InvalidOrExpiredCodeErrorResponseSchema);
registerSchema("UnauthorizedErrorResponse", UnauthorizedErrorResponseSchema);
registerSchema("UserNotFoundErrorResponse", UserNotFoundErrorResponseSchema);

// 注册密码修改相关的 schema
registerSchema("ChangePasswordSuccessResponse", ChangePasswordSuccessResponseSchema);
registerSchema("NoPasswordSetErrorResponse", NoPasswordSetErrorResponseSchema);
registerSchema("InvalidOldPasswordErrorResponse", InvalidOldPasswordErrorResponseSchema);
registerSchema("PasswordsIdenticalErrorResponse", PasswordsIdenticalErrorResponseSchema);

// 注册密码重置相关的 schema
registerSchema("PasswordResetRequestSuccessResponse", PasswordResetRequestSuccessResponseSchema);
registerSchema("ResetPasswordSuccessResponse", ResetPasswordSuccessResponseSchema);
registerSchema("InvalidResetCodeErrorResponse", InvalidResetCodeErrorResponseSchema);
registerSchema("ExpiredResetCodeErrorResponse", ExpiredResetCodeErrorResponseSchema);

// 导出推导的 TypeScript 类型
export type RegisterUser = z.infer<typeof RegisterUserSchema>;
export type LoginUser = z.infer<typeof LoginUserSchema>;
export type RefreshToken = z.infer<typeof RefreshTokenSchema>;
export type EmailVerification = z.infer<typeof EmailVerificationSchema>;
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

// 邮箱验证相关的类型导出
export type EmailVerifySuccessResponse = z.infer<
  typeof EmailVerifySuccessResponseSchema
>;
export type ResendEmailVerification = z.infer<
  typeof ResendEmailVerificationSchema
>;
export type ResendEmailVerificationSuccessResponse = z.infer<
  typeof ResendEmailVerificationSuccessResponseSchema
>;
export type EmailAlreadyVerifiedErrorResponse = z.infer<
  typeof EmailAlreadyVerifiedErrorResponseSchema
>;
export type InvalidOrExpiredCodeErrorResponse = z.infer<
  typeof InvalidOrExpiredCodeErrorResponseSchema
>;
export type UnauthorizedErrorResponse = z.infer<
  typeof UnauthorizedErrorResponseSchema
>;
export type UserNotFoundErrorResponse = z.infer<
  typeof UserNotFoundErrorResponseSchema
>;

// 密码修改相关的类型导出
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
export type ChangePasswordSuccessResponse = z.infer<
  typeof ChangePasswordSuccessResponseSchema
>;
export type NoPasswordSetErrorResponse = z.infer<
  typeof NoPasswordSetErrorResponseSchema
>;
export type InvalidOldPasswordErrorResponse = z.infer<
  typeof InvalidOldPasswordErrorResponseSchema
>;

// 密码重置相关的类型导出
export type RequestPasswordReset = z.infer<typeof RequestPasswordResetSchema>;
export type ResetPassword = z.infer<typeof ResetPasswordSchema>;
export type PasswordResetRequestSuccessResponse = z.infer<
  typeof PasswordResetRequestSuccessResponseSchema
>;
export type ResetPasswordSuccessResponse = z.infer<
  typeof ResetPasswordSuccessResponseSchema
>;
export type PasswordsIdenticalErrorResponse = z.infer<
  typeof PasswordsIdenticalErrorResponseSchema
>;
export type InvalidResetCodeErrorResponse = z.infer<
  typeof InvalidResetCodeErrorResponseSchema
>;
export type ExpiredResetCodeErrorResponse = z.infer<
  typeof ExpiredResetCodeErrorResponseSchema
>;

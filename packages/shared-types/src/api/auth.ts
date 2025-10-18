import { z } from "zod";
import {
  createSuccessResponseSchema,
  createErrorResponseSchema,
  registerSchema,
} from "./common.js";

/* 
    通用Schema组件
*/
// 用户名验证：只能以小写字母开头，只能包含小写字母、数字和下划线
const usernameSchema = z
  .string()
  .min(3, "用户名至少需要3个字符")
  .max(20, "用户名不能超过20个字符")
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "用户名只能以小写字母开头，只能包含小写字母、数字和下划线",
  );

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

/*
    <<<<<<<<<< login() schema >>>>>>>>>>
*/
export const LoginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  token_transport: z.enum(["cookie", "body"]).default("cookie"),
  captcha_token: z.string().min(1, "验证码不能为空"),
});
export type Login = z.infer<typeof LoginSchema>;
registerSchema("Login", LoginSchema);

// 登录成功响应
export const LoginSuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    access_token: z.string().optional(),
    refresh_token: z.string().optional(),
    userInfo: z.object({
      uid: z.number(),
      username: z.string(),
      nickname: z.string(),
      role: z.enum(["USER", "ADMIN", "EDITOR", "AUTHOR"]),
      exp: z.iso.datetime().optional(),
    }),
  }),
);
export type LoginSuccessResponse = z.infer<typeof LoginSuccessResponseSchema>;
registerSchema("LoginSuccessResponse", LoginSuccessResponseSchema);

export const InvalidCredentialsErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("INVALID_CREDENTIALS"),
    message: z.string(),
  }),
);
export type InvalidCredentialsErrorResponse = z.infer<
  typeof InvalidCredentialsErrorResponseSchema
>;
registerSchema(
  "InvalidCredentialsErrorResponse",
  InvalidCredentialsErrorResponseSchema,
);

export const SsoUserErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("SSO_USER"),
    message: z.string(),
    details: z
      .array(
        z.object({
          provider: z.string(),
        }),
      )
      .optional(),
  }),
);
export type SsoUserErrorResponse = z.infer<typeof SsoUserErrorResponseSchema>;
registerSchema("SsoUserErrorResponse", SsoUserErrorResponseSchema);

export const EmailNotVerifiedErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("EMAIL_NOT_VERIFIED"),
    message: z.string(),
  }),
);
export type EmailNotVerifiedErrorResponse = z.infer<
  typeof EmailNotVerifiedErrorResponseSchema
>;
registerSchema(
  "EmailNotVerifiedErrorResponse",
  EmailNotVerifiedErrorResponseSchema,
);

/*
    <<<<<<<<<< register() schema >>>>>>>>>>
*/
export const RegisterUserSchema = z.object({
  username: usernameSchema,
  nickname: nicknameSchema.optional(),
  password: passwordSchema,
  email: emailSchema,
  captcha_token: z.string().min(1, "验证码不能为空"),
});
export type Register = z.infer<typeof RegisterUserSchema>;
registerSchema("Register", RegisterUserSchema);

// 注册成功响应
export const RegisterSuccessResponseSchema = createSuccessResponseSchema(
  z.null(),
);
export type RegisterSuccessResponse = z.infer<
  typeof RegisterSuccessResponseSchema
>;
registerSchema("RegisterSuccessResponse", RegisterSuccessResponseSchema);

// 用户已存在错误响应
export const ConflictErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("USER_EXISTS"),
    message: z.string(),
  }),
);
export type ConflictErrorResponse = z.infer<typeof ConflictErrorResponseSchema>;
registerSchema("ConflictErrorResponse", ConflictErrorResponseSchema);

/*
    <<<<<<<<<< refresh() schema >>>>>>>>>>
*/
export const RefreshTokenSchema = z.object({
  refresh_token: z.string().optional(),
  token_transport: z.enum(["cookie", "body"]).default("cookie"),
});
export type RefreshToken = z.infer<typeof RefreshTokenSchema>;
registerSchema("RefreshToken", RefreshTokenSchema);

/*
    <<<<<<<<<< verifyEmail() schema >>>>>>>>>>
*/
export const EmailVerificationSchema = z.object({
  code: z.string().min(1, "验证码不能为空"),
  captcha_token: z.string().min(1, "验证码不能为空"),
  email: emailSchema,
});
export type EmailVerification = z.infer<typeof EmailVerificationSchema>;
registerSchema("EmailVerification", EmailVerificationSchema);

// 邮箱验证成功响应
export const EmailVerifySuccessResponseSchema = createSuccessResponseSchema(
  z.null(),
);
export type EmailVerifySuccessResponse = z.infer<
  typeof EmailVerifySuccessResponseSchema
>;
registerSchema("EmailVerifySuccessResponse", EmailVerifySuccessResponseSchema);
/*
    <<<<<<<<<< changePassword() schema >>>>>>>>>>
*/
export const ChangePasswordSchema = z.object({
  old_password: passwordSchema,
  new_password: passwordSchema,
  access_token: z.string().optional(),
});
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;
registerSchema("ChangePassword", ChangePasswordSchema);

// 密码修改成功响应
export const ChangePasswordSuccessResponseSchema = createSuccessResponseSchema(
  z.null(),
);
export type ChangePasswordSuccessResponse = z.infer<
  typeof ChangePasswordSuccessResponseSchema
>;
registerSchema(
  "ChangePasswordSuccessResponse",
  ChangePasswordSuccessResponseSchema,
);

export const NoPasswordSetErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("NO_PASSWORD_SET"),
    message: z.string(),
  }),
);
export type NoPasswordSetErrorResponse = z.infer<
  typeof NoPasswordSetErrorResponseSchema
>;
registerSchema("NoPasswordSetErrorResponse", NoPasswordSetErrorResponseSchema);

export const InvalidOldPasswordErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("INVALID_OLD_PASSWORD"),
    message: z.string(),
  }),
);
export type InvalidOldPasswordErrorResponse = z.infer<
  typeof InvalidOldPasswordErrorResponseSchema
>;
registerSchema(
  "InvalidOldPasswordErrorResponse",
  InvalidOldPasswordErrorResponseSchema,
);

export const PasswordsIdenticalErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("PASSWORDS_IDENTICAL"),
    message: z.string(),
  }),
);
export type PasswordsIdenticalErrorResponse = z.infer<
  typeof PasswordsIdenticalErrorResponseSchema
>;
registerSchema(
  "PasswordsIdenticalErrorResponse",
  PasswordsIdenticalErrorResponseSchema,
);

/*
    <<<<<<<<<< requestPasswordReset() schema >>>>>>>>>>
*/
export const RequestPasswordResetSchema = z.object({
  email: emailSchema,
  captcha_token: z.string().min(1, "验证码不能为空"),
});
export type RequestPasswordReset = z.infer<typeof RequestPasswordResetSchema>;
registerSchema("RequestPasswordReset", RequestPasswordResetSchema);

export const PasswordResetRequestSuccessResponseSchema =
  createSuccessResponseSchema(z.null());
export type PasswordResetRequestSuccessResponse = z.infer<
  typeof PasswordResetRequestSuccessResponseSchema
>;
registerSchema(
  "PasswordResetRequestSuccessResponse",
  PasswordResetRequestSuccessResponseSchema,
);

/*
    <<<<<<<<<< resetPassword() schema >>>>>>>>>>
*/
export const ResetPasswordSchema = z.object({
  code: z.string().min(1, "验证码不能为空"),
  new_password: passwordSchema,
  captcha_token: z.string().min(1, "验证码不能为空"),
});
export type ResetPassword = z.infer<typeof ResetPasswordSchema>;
registerSchema("ResetPassword", ResetPasswordSchema);

export const ResetPasswordSuccessResponseSchema = createSuccessResponseSchema(
  z.null(),
);
export type ResetPasswordSuccessResponse = z.infer<
  typeof ResetPasswordSuccessResponseSchema
>;
registerSchema(
  "ResetPasswordSuccessResponse",
  ResetPasswordSuccessResponseSchema,
);

export const InvalidOrExpiredCodeErrorResponseSchema =
  createErrorResponseSchema(
    z.object({
      code: z.literal("INVALID_OR_EXPIRED_CODE"),
      message: z.string(),
    }),
  );
export type InvalidOrExpiredCodeErrorResponse = z.infer<
  typeof InvalidOrExpiredCodeErrorResponseSchema
>;
registerSchema(
  "InvalidOrExpiredCodeErrorResponse",
  InvalidOrExpiredCodeErrorResponseSchema,
);

export const InvalidResetCodeErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("INVALID_RESET_CODE"),
    message: z.string(),
  }),
);
export type InvalidResetCodeErrorResponse = z.infer<
  typeof InvalidResetCodeErrorResponseSchema
>;
registerSchema(
  "InvalidResetCodeErrorResponse",
  InvalidResetCodeErrorResponseSchema,
);

export const ExpiredResetCodeErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("EXPIRED_RESET_CODE"),
    message: z.string(),
  }),
);
export type ExpiredResetCodeErrorResponse = z.infer<
  typeof ExpiredResetCodeErrorResponseSchema
>;
registerSchema(
  "ExpiredResetCodeErrorResponse",
  ExpiredResetCodeErrorResponseSchema,
);

/*
    <<<<<<<<<< resendEmailVerification() schema >>>>>>>>>>
*/
export const ResendEmailVerificationSchema = z.object({
  email: emailSchema,
  captcha_token: z.string().min(1, "验证码不能为空"),
});
export type ResendEmailVerification = z.infer<
  typeof ResendEmailVerificationSchema
>;
registerSchema("ResendEmailVerification", ResendEmailVerificationSchema);

// 重发邮箱验证码成功响应
export const ResendEmailVerificationSuccessResponseSchema =
  createSuccessResponseSchema(z.null());
export type ResendEmailVerificationSuccessResponse = z.infer<
  typeof ResendEmailVerificationSuccessResponseSchema
>;
registerSchema(
  "ResendEmailVerificationSuccessResponse",
  ResendEmailVerificationSuccessResponseSchema,
);

// 邮箱已验证错误响应
export const EmailAlreadyVerifiedErrorResponseSchema =
  createErrorResponseSchema(
    z.object({
      code: z.literal("EMAIL_ALREADY_VERIFIED"),
      message: z.string(),
    }),
  );
export type EmailAlreadyVerifiedErrorResponse = z.infer<
  typeof EmailAlreadyVerifiedErrorResponseSchema
>;
registerSchema(
  "EmailAlreadyVerifiedErrorResponse",
  EmailAlreadyVerifiedErrorResponseSchema,
);

/*
    <<<<<<<<<< logout() schema >>>>>>>>>>
*/
export const LogoutSchema = z.object({
  refresh_token: z.string().optional(),
});
export type Logout = z.infer<typeof LogoutSchema>;
registerSchema("Logout", LogoutSchema);

// 退出登录成功响应
export const LogoutSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  timestamp: z.iso.datetime(),
  requestId: z.string(),
  data: z.null(),
});
export type LogoutSuccessResponse = z.infer<typeof LogoutSuccessResponseSchema>;
registerSchema("LogoutSuccessResponse", LogoutSuccessResponseSchema);

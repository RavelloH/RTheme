import { z } from "zod";
import {
  createSuccessResponseSchema,
  createErrorResponseSchema,
  registerSchema,
} from "./common.js";

// 验证码挑战数据 Schema
const ChallengeDataSchema = z.object({
  challenge: z.object({
    c: z.number(),
    s: z.number(),
    d: z.number(),
  }),
  token: z.string().optional(),
  expires: z.number(),
});

// 验证码响应 Schema
export const CaptchaGetResponseSchema = createSuccessResponseSchema(
  z.object({
    data: ChallengeDataSchema,
  }),
);

// 验证码验证请求 Schema
export const CaptchaVerifyRequestSchema = z.object({
  challenge: z.string(),
  solution: z.string(),
  captcha_token: z.string().min(1, "验证码不能为空"),
});

// 验证码验证响应 Schema
export const CaptchaVerifySuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    data: z.object({
      valid: z.literal(true),
    }),
  }),
);

// 验证码相关的错误响应
export const InvalidCaptchaErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("INVALID_CAPTCHA"),
    message: z.string(),
  }),
);

export const CaptchaExpiredErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("CAPTCHA_EXPIRED"),
    message: z.string(),
  }),
);

export const CaptchaAttemptsExceededErrorResponseSchema =
  createErrorResponseSchema(
    z.object({
      code: z.literal("CAPTCHA_ATTEMPTS_EXCEEDED"),
      message: z.string(),
    }),
  );

// 注册所有 schemas 到 OpenAPI 生成器
registerSchema("CaptchaGetResponse", CaptchaGetResponseSchema);
registerSchema("CaptchaVerifyRequest", CaptchaVerifyRequestSchema);
registerSchema(
  "CaptchaVerifySuccessResponse",
  CaptchaVerifySuccessResponseSchema,
);
registerSchema(
  "InvalidCaptchaErrorResponse",
  InvalidCaptchaErrorResponseSchema,
);
registerSchema(
  "CaptchaExpiredErrorResponse",
  CaptchaExpiredErrorResponseSchema,
);
registerSchema(
  "CaptchaAttemptsExceededErrorResponse",
  CaptchaAttemptsExceededErrorResponseSchema,
);

// 导出推导的 TypeScript 类型
export type CaptchaGetResponse = z.infer<typeof CaptchaGetResponseSchema>;
export type CaptchaVerifyRequest = z.infer<typeof CaptchaVerifyRequestSchema>;
export type CaptchaVerifySuccessResponse = z.infer<
  typeof CaptchaVerifySuccessResponseSchema
>;
export type InvalidCaptchaErrorResponse = z.infer<
  typeof InvalidCaptchaErrorResponseSchema
>;
export type CaptchaExpiredErrorResponse = z.infer<
  typeof CaptchaExpiredErrorResponseSchema
>;
export type CaptchaAttemptsExceededErrorResponse = z.infer<
  typeof CaptchaAttemptsExceededErrorResponseSchema
>;

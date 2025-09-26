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
export const CaptchaGetResponseSchema =
  createSuccessResponseSchema(ChallengeDataSchema);

// 验证码验证请求 Schema
export const CaptchaVerifyRequestSchema = z.object({
  token: z.string().min(1, "Token不能为空"),
  solutions: z
    .array(z.number().min(0, "每个解答必须是非负整数"))
    .min(1, "解答不能为空"),
});

// 验证码验证响应 Schema
export const CaptchaVerifySuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    success: z.boolean(),
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

// 导出推导的 TypeScript 类型
export type CaptchaGetResponse = z.infer<typeof CaptchaGetResponseSchema>;
export type CaptchaVerifyRequest = z.infer<typeof CaptchaVerifyRequestSchema>;
export type CaptchaVerifySuccessResponse = z.infer<
  typeof CaptchaVerifySuccessResponseSchema
>;

import { z } from "zod";

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

// 用户注册返回负载
export const RegisterUserResponseSchema = z.object({
  message: z.string(),
});

// 导出推导的 TypeScript 类型
export type RegisterUser = z.infer<typeof RegisterUserSchema>;

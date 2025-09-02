import { z } from 'zod'

// 用户相关 Schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['USER', 'ADMIN', 'EDITOR']),
  avatar: z.string().url().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['USER', 'ADMIN', 'EDITOR']).default('USER'),
  avatar: z.string().url().optional(),
})

export const UpdateUserSchema = CreateUserSchema.partial()

export const UsersListResponseSchema = z.object({
  users: z.array(UserSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
})

// 导出推导的 TypeScript 类型
export type User = z.infer<typeof UserSchema>
export type CreateUser = z.infer<typeof CreateUserSchema>
export type UpdateUser = z.infer<typeof UpdateUserSchema>
export type UsersListResponse = z.infer<typeof UsersListResponseSchema>
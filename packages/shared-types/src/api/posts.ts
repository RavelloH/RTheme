import { z } from "zod";

// 文章相关 Schema
export const PostSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string(),
  excerpt: z.string().nullable(),
  published: z.boolean(),
  authorId: z.string().uuid(),
  categoryId: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreatePostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  content: z.string(),
  excerpt: z.string().optional(),
  published: z.boolean().default(false),
  categoryId: z.string().uuid().optional(),
});

export const UpdatePostSchema = CreatePostSchema.partial();

export const PostsListResponseSchema = z.object({
  posts: z.array(PostSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

// 分类相关 Schema
export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

// 标签相关 Schema
export const TagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateTagSchema = z.object({
  name: z.string().min(1),
});

// 导出推导的 TypeScript 类型
export type Post = z.infer<typeof PostSchema>;
export type CreatePost = z.infer<typeof CreatePostSchema>;
export type UpdatePost = z.infer<typeof UpdatePostSchema>;
export type PostsListResponse = z.infer<typeof PostsListResponseSchema>;

export type Category = z.infer<typeof CategorySchema>;
export type CreateCategory = z.infer<typeof CreateCategorySchema>;
export type UpdateCategory = z.infer<typeof UpdateCategorySchema>;

export type Tag = z.infer<typeof TagSchema>;
export type CreateTag = z.infer<typeof CreateTagSchema>;

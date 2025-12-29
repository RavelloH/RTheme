import { z } from "zod";
import {
  createSuccessResponseSchema,
  createPaginatedResponseSchema,
  registerSchema,
} from "./common.js";

export const CommentStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SPAM",
]);

export type CommentStatus = z.infer<typeof CommentStatusSchema>;

export const CommentAuthorSchema = z.object({
  uid: z.number().int().nullable(),
  username: z.string().nullable(),
  nickname: z.string().nullable(),
  avatar: z.string().nullable(),
  displayName: z.string(),
  website: z.string().url().nullable().optional(),
  isAnonymous: z.boolean(),
  emailMd5: z.string().nullable(),
});

export type CommentAuthor = z.infer<typeof CommentAuthorSchema>;

export const CommentReplyRefSchema = z
  .object({
    id: z.string().uuid(),
    authorName: z.string(),
  })
  .nullable();

export type CommentReplyRef = z.infer<typeof CommentReplyRefSchema>;

export const CommentItemSchema = z.object({
  id: z.string().uuid(),
  postSlug: z.string(),
  parentId: z.string().uuid().nullable(),
  content: z.string(),
  status: CommentStatusSchema,
  createdAt: z.string(),
  mine: z.boolean().default(false),
  replyCount: z.number().int().nonnegative().default(0),
  author: CommentAuthorSchema,
  location: z.string().nullable(),
  replyTo: CommentReplyRefSchema.optional(),
  // 层级树形结构字段
  depth: z.number().int().nonnegative().default(0),
  path: z.string().default(""),
  sortKey: z.string().default(""),
  hasMore: z.boolean().default(false), // 是否有未加载的深层子评论
  descendantCount: z.number().int().nonnegative().default(0), // 当前已加载的后代评论数量
  // 点赞相关
  likeCount: z.number().int().nonnegative().default(0),
  isLiked: z.boolean().optional(), // 当前用户是否已点赞（仅登录用户）
});

export type CommentItem = z.infer<typeof CommentItemSchema>;

export const GetPostCommentsSchema = z.object({
  slug: z.string().min(1, "slug 不能为空"),
  pageSize: z.number().int().min(1).max(50).default(10),
  maxDepth: z.number().int().min(1).max(10).default(3), // 预加载的最大层级深度
  cursor: z.string().optional(), // sortKey 游标
});

export type GetPostComments = z.infer<typeof GetPostCommentsSchema>;
registerSchema("GetPostComments", GetPostCommentsSchema);

export const CommentListResponseSchema = createPaginatedResponseSchema(
  z.array(CommentItemSchema),
);

export type CommentListResponse = z.infer<typeof CommentListResponseSchema>;
registerSchema("CommentListResponse", CommentListResponseSchema);

// 获取深层回复的请求参数
export const GetDeepRepliesSchema = z.object({
  commentId: z.string().uuid(),
  maxDepth: z.number().int().min(1).max(10).default(3), // 相对于当前评论的最大深度
});

export type GetDeepReplies = z.infer<typeof GetDeepRepliesSchema>;
registerSchema("GetDeepReplies", GetDeepRepliesSchema);

export const CreateCommentSchema = z.object({
  slug: z.string().min(1, "slug 不能为空"),
  content: z.string().min(1, "评论不能为空").max(1000, "评论内容过长"),
  parentId: z.string().uuid().optional(),
  authorName: z.string().max(50).optional(),
  authorEmail: z.string().email().max(255).optional(),
  authorWebsite: z.string().url().max(255).optional(),
  captcha_token: z.string().optional(),
  access_token: z.string().optional(),
});

export type CreateComment = z.infer<typeof CreateCommentSchema>;
registerSchema("CreateComment", CreateCommentSchema);

export const CreateCommentResponseSchema =
  createSuccessResponseSchema(CommentItemSchema);

export type CreateCommentResponse = z.infer<typeof CreateCommentResponseSchema>;
registerSchema("CreateCommentResponse", CreateCommentResponseSchema);

export const GetCommentContextSchema = z.object({
  commentId: z.string().uuid(),
});

export type GetCommentContext = z.infer<typeof GetCommentContextSchema>;
registerSchema("GetCommentContext", GetCommentContextSchema);

export const CommentContextResponseSchema = createSuccessResponseSchema(
  z.array(CommentItemSchema),
);

export type CommentContextResponse = z.infer<
  typeof CommentContextResponseSchema
>;
registerSchema("CommentContextResponse", CommentContextResponseSchema);

export const GetCommentRepliesSchema = z.object({
  commentId: z.string().uuid(),
  maxDepth: z.number().int().min(1).max(10).default(3), // 相对于当前评论的最大深度
});

export type GetCommentReplies = z.infer<typeof GetCommentRepliesSchema>;
registerSchema("GetCommentReplies", GetCommentRepliesSchema);

export const UpdateCommentStatusSchema = z.object({
  access_token: z.string().optional(),
  ids: z.array(z.string().uuid()).min(1),
  status: CommentStatusSchema,
});

export type UpdateCommentStatus = z.infer<typeof UpdateCommentStatusSchema>;
registerSchema("UpdateCommentStatus", UpdateCommentStatusSchema);

export const DeleteCommentsSchema = z.object({
  access_token: z.string().optional(),
  ids: z.array(z.string().uuid()).min(1),
});

export type DeleteComments = z.infer<typeof DeleteCommentsSchema>;
registerSchema("DeleteComments", DeleteCommentsSchema);

export const AdminCommentItemSchema = CommentItemSchema.extend({
  email: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
});

export type AdminCommentItem = z.infer<typeof AdminCommentItemSchema>;

export const GetCommentsAdminSchema = z.object({
  access_token: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
  sortBy: z
    .enum(["createdAt", "status", "id", "postSlug"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z.array(CommentStatusSchema).optional(),
  slug: z.string().optional(),
  uid: z.number().int().optional(),
  search: z.string().optional(),
  parentOnly: z.boolean().optional(),
});

export type GetCommentsAdmin = z.infer<typeof GetCommentsAdminSchema>;
registerSchema("GetCommentsAdmin", GetCommentsAdminSchema);

export const CommentsAdminListResponseSchema = createPaginatedResponseSchema(
  z.array(AdminCommentItemSchema),
);

export type CommentsAdminListResponse = z.infer<
  typeof CommentsAdminListResponseSchema
>;
registerSchema("CommentsAdminListResponse", CommentsAdminListResponseSchema);

export const CommentStatsSchema = z.object({
  updatedAt: z.string(),
  cache: z.boolean(),
  total: z.number().int().nonnegative(),
  approved: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
  spam: z.number().int().nonnegative(),
  lastCommentAt: z.string().nullable(),
  new: z
    .object({
      lastDay: z.number().int().nonnegative(),
      last7Days: z.number().int().nonnegative(),
      last30Days: z.number().int().nonnegative(),
    })
    .optional(),
});

export type CommentStats = z.infer<typeof CommentStatsSchema>;

export const GetCommentStatsSchema = z.object({
  access_token: z.string().optional(),
  force: z.boolean().optional(),
});

export type GetCommentStats = z.infer<typeof GetCommentStatsSchema>;
registerSchema("GetCommentStats", GetCommentStatsSchema);

export const CommentStatsResponseSchema =
  createSuccessResponseSchema(CommentStatsSchema);

export type CommentStatsResponse = z.infer<typeof CommentStatsResponseSchema>;
registerSchema("CommentStatsResponse", CommentStatsResponseSchema);

export const CommentHistoryPointSchema = z.object({
  date: z.string(),
  total: z.number().int().nonnegative(),
  approved: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  posts: z
    .array(
      z.object({
        slug: z.string(),
        title: z.string().nullable(),
        count: z.number().int().nonnegative(),
      }),
    )
    .default([]),
});

export type CommentHistoryPoint = z.infer<typeof CommentHistoryPointSchema>;

export const GetCommentHistorySchema = z.object({
  access_token: z.string().optional(),
  days: z.number().int().min(1).max(365).default(30),
});

export type GetCommentHistory = z.infer<typeof GetCommentHistorySchema>;
registerSchema("GetCommentHistory", GetCommentHistorySchema);

export const CommentHistoryResponseSchema = createSuccessResponseSchema(
  z.array(CommentHistoryPointSchema),
);

export type CommentHistoryResponse = z.infer<
  typeof CommentHistoryResponseSchema
>;
registerSchema("CommentHistoryResponse", CommentHistoryResponseSchema);

// 点赞评论
export const LikeCommentSchema = z.object({
  commentId: z.string().uuid(),
});

export type LikeComment = z.infer<typeof LikeCommentSchema>;
registerSchema("LikeComment", LikeCommentSchema);

export const LikeCommentResponseSchema = createSuccessResponseSchema(
  z.object({
    likeCount: z.number().int().nonnegative(),
    isLiked: z.boolean(),
  }),
);

export type LikeCommentResponse = z.infer<typeof LikeCommentResponseSchema>;
registerSchema("LikeCommentResponse", LikeCommentResponseSchema);

// 取消点赞
export const UnlikeCommentSchema = z.object({
  commentId: z.string().uuid(),
});

export type UnlikeComment = z.infer<typeof UnlikeCommentSchema>;
registerSchema("UnlikeComment", UnlikeCommentSchema);

export const UnlikeCommentResponseSchema = createSuccessResponseSchema(
  z.object({
    likeCount: z.number().int().nonnegative(),
    isLiked: z.boolean(),
  }),
);

export type UnlikeCommentResponse = z.infer<typeof UnlikeCommentResponseSchema>;
registerSchema("UnlikeCommentResponse", UnlikeCommentResponseSchema);

// 删除自己的评论
export const DeleteOwnCommentSchema = z.object({
  commentId: z.string().uuid(),
});

export type DeleteOwnComment = z.infer<typeof DeleteOwnCommentSchema>;
registerSchema("DeleteOwnComment", DeleteOwnCommentSchema);

export const DeleteOwnCommentResponseSchema = createSuccessResponseSchema(
  z.null(),
);

export type DeleteOwnCommentResponse = z.infer<
  typeof DeleteOwnCommentResponseSchema
>;
registerSchema("DeleteOwnCommentResponse", DeleteOwnCommentResponseSchema);

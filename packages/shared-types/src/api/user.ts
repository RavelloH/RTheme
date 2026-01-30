import { z } from "zod";
import { createSuccessResponseSchema, registerSchema } from "./common.js";

/*
    getUsersTrends() Schema
*/
export const GetUsersTrendsSchema = z.object({
  access_token: z.string().optional(),
  days: z.number().int().positive().default(30),
  count: z.number().int().positive().default(30),
});
export type GetUsersTrends = z.infer<typeof GetUsersTrendsSchema>;
registerSchema("GetUsersTrends", GetUsersTrendsSchema);

export const UserTrendItemSchema = z.object({
  time: z.string(),
  data: z.object({
    total: z.number().int().nonnegative(),
    new: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
  }),
});
export type UserTrendItem = z.infer<typeof UserTrendItemSchema>;

export const GetUsersTrendsSuccessResponseSchema = createSuccessResponseSchema(
  z.array(UserTrendItemSchema),
);
export type GetUsersTrendsSuccessResponse = z.infer<
  typeof GetUsersTrendsSuccessResponseSchema
>;
registerSchema(
  "GetUsersTrendsSuccessResponse",
  GetUsersTrendsSuccessResponseSchema,
);

/*
    getUsersList() Schema
*/
export const GetUsersListSchema = z.object({
  access_token: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(25),
  sortBy: z
    .enum(["uid", "username", "createdAt", "lastUseAt"])
    .optional()
    .default("uid"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
  uid: z.number().int().positive().optional(),
  role: z.array(z.enum(["USER", "ADMIN", "EDITOR", "AUTHOR"])).optional(),
  status: z.array(z.enum(["ACTIVE", "SUSPENDED", "NEEDS_UPDATE"])).optional(),
  emailVerified: z.array(z.boolean()).optional(),
  emailNotice: z.array(z.boolean()).optional(),
  createdAtStart: z.string().optional(),
  createdAtEnd: z.string().optional(),
  lastUseAtStart: z.string().optional(),
  lastUseAtEnd: z.string().optional(),
  search: z.string().optional(),
});
export type GetUsersList = z.infer<typeof GetUsersListSchema>;
registerSchema("GetUsersList", GetUsersListSchema);

export const UserListItemSchema = z.object({
  uid: z.number().int(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  emailNotice: z.boolean(),
  username: z.string(),
  nickname: z.string().nullable(),
  website: z.string().nullable(),
  bio: z.string().nullable(),
  avatar: z.string().nullable(),
  createdAt: z.string(),
  lastUseAt: z.string(),
  role: z.enum(["USER", "ADMIN", "EDITOR", "AUTHOR"]),
  status: z.enum(["ACTIVE", "SUSPENDED", "NEEDS_UPDATE"]),
  postsCount: z.number().int().nonnegative(),
  commentsCount: z.number().int().nonnegative(),
  hasTwoFactor: z.boolean(),
});
export type UserListItem = z.infer<typeof UserListItemSchema>;

export const GetUsersListSuccessResponseSchema = createSuccessResponseSchema(
  z.array(UserListItemSchema),
);
export type GetUsersListSuccessResponse = z.infer<
  typeof GetUsersListSuccessResponseSchema
>;
registerSchema(
  "GetUsersListSuccessResponse",
  GetUsersListSuccessResponseSchema,
);

/*
    updateUsers() Schema
*/
export const UpdateUsersSchema = z.object({
  access_token: z.string().optional(),
  uids: z.array(z.number().int().positive()).min(1, "必须提供至少一个用户 UID"),
  // 批量操作字段（适用于多个用户）
  role: z.enum(["USER", "ADMIN", "EDITOR", "AUTHOR"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "NEEDS_UPDATE"]).optional(),
  // 单个用户编辑字段（仅当 uids.length === 1 时有效）
  username: z.string().min(1).max(50).optional(),
  nickname: z.string().max(100).optional(),
  email: z.string().email().optional(),
  avatar: z.string().url().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  bio: z.string().max(500).optional(),
  emailVerified: z.boolean().optional(),
  emailNotice: z.boolean().optional(),
});
export type UpdateUsers = z.infer<typeof UpdateUsersSchema>;
registerSchema("UpdateUsers", UpdateUsersSchema);

export const UpdateUsersResultSchema = z.object({
  updated: z.number().int().nonnegative(),
});
export type UpdateUsersResult = z.infer<typeof UpdateUsersResultSchema>;

export const UpdateUsersSuccessResponseSchema = createSuccessResponseSchema(
  UpdateUsersResultSchema,
);
export type UpdateUsersSuccessResponse = z.infer<
  typeof UpdateUsersSuccessResponseSchema
>;
registerSchema("UpdateUsersSuccessResponse", UpdateUsersSuccessResponseSchema);

/*
    deleteUsers() Schema
*/
export const DeleteUsersSchema = z.object({
  access_token: z.string().optional(),
  uids: z.array(z.number().int().positive()).min(1, "必须提供至少一个用户 UID"),
});
export type DeleteUsers = z.infer<typeof DeleteUsersSchema>;
registerSchema("DeleteUsers", DeleteUsersSchema);

export const DeleteUsersResultSchema = z.object({
  deleted: z.number().int().nonnegative(),
});
export type DeleteUsersResult = z.infer<typeof DeleteUsersResultSchema>;

export const DeleteUsersSuccessResponseSchema = createSuccessResponseSchema(
  DeleteUsersResultSchema,
);
export type DeleteUsersSuccessResponse = z.infer<
  typeof DeleteUsersSuccessResponseSchema
>;
registerSchema("DeleteUsersSuccessResponse", DeleteUsersSuccessResponseSchema);

/*
    disable2FA() Schema
*/
export const Disable2FASchema = z.object({
  access_token: z.string().optional(),
  uid: z.number().int().positive(),
});
export type Disable2FA = z.infer<typeof Disable2FASchema>;
registerSchema("Disable2FA", Disable2FASchema);

export const Disable2FAResultSchema = z.object({
  success: z.boolean(),
});
export type Disable2FAResult = z.infer<typeof Disable2FAResultSchema>;

export const Disable2FASuccessResponseSchema = createSuccessResponseSchema(
  Disable2FAResultSchema,
);
export type Disable2FASuccessResponse = z.infer<
  typeof Disable2FASuccessResponseSchema
>;
registerSchema("Disable2FASuccessResponse", Disable2FASuccessResponseSchema);

/*
    updateUserProfile() Schema
*/
// 可编辑的字段枚举
export const EditableFieldSchema = z.enum([
  "nickname",
  "username",
  "email",
  "website",
  "bio",
]);
export type EditableField = z.infer<typeof EditableFieldSchema>;

// URL Schema（允许省略协议，自动补全）
const websiteSchema = z
  .string()
  .max(255, "网站链接不能超过255个字符")
  .optional()
  .transform((val) => {
    if (!val || val.trim() === "") return "";
    const trimmed = val.trim();
    // 如果已经有协议，直接返回
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    // 否则添加 https:// 前缀
    return `https://${trimmed}`;
  })
  .pipe(z.string().url("请输入有效的网站链接").or(z.literal("")));

export const UpdateUserProfileSchema = z.object({
  field: EditableFieldSchema,
  value: z.string(),
});
export type UpdateUserProfile = z.infer<typeof UpdateUserProfileSchema>;
registerSchema("UpdateUserProfile", UpdateUserProfileSchema);

export const UpdateUserProfileResultSchema = z.object({
  updated: z.boolean(),
  needsLogout: z.boolean().optional(),
});
export type UpdateUserProfileResult = z.infer<
  typeof UpdateUserProfileResultSchema
>;

export const UpdateUserProfileSuccessResponseSchema =
  createSuccessResponseSchema(UpdateUserProfileResultSchema);
export type UpdateUserProfileSuccessResponse = z.infer<
  typeof UpdateUserProfileSuccessResponseSchema
>;
registerSchema(
  "UpdateUserProfileSuccessResponse",
  UpdateUserProfileSuccessResponseSchema,
);

// 导出 website schema 供其他地方使用
export { websiteSchema };

/*
    getUserProfile() Schema - 用户档案详情
*/
export const UserProfileSchema = z.object({
  // 基本信息
  user: z.object({
    uid: z.number().int(),
    username: z.string(),
    nickname: z.string().nullable(),
    emailMd5: z.string(),
    avatar: z.string().nullable(),
    bio: z.string().nullable(),
    website: z.string().nullable(),
    role: z.enum(["USER", "ADMIN", "EDITOR", "AUTHOR"]),
    status: z.enum(["ACTIVE", "SUSPENDED", "NEEDS_UPDATE"]),
    createdAt: z.string(),
    lastUseAt: z.string(),
  }),
  // 统计信息
  stats: z.object({
    postsCount: z.number().int().nonnegative(), // 已发布文章数
    commentsCount: z.number().int().nonnegative(), // 所有评论数
    likesGiven: z.number().int().nonnegative(), // 点赞数
    likesReceived: z.number().int().nonnegative(), // 获赞数
  }),
  // 在线状态
  onlineStatus: z.object({
    status: z.enum(["online", "recently_online", "offline"]), // 在线、刚刚在线、离线
    lastActiveText: z.string(), // 显示文本，如 "在线"、"刚刚在线"、"3小时前活跃"
  }),
  // 权限
  permissions: z.object({
    canEdit: z.boolean(), // 能否编辑（自己或管理员）
    canMessage: z.boolean(), // 能否发私信（已登录且不是自己）
    canManage: z.boolean(), // 能否管理（管理员）
  }),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const GetUserProfileSuccessResponseSchema =
  createSuccessResponseSchema(UserProfileSchema);
export type GetUserProfileSuccessResponse = z.infer<
  typeof GetUserProfileSuccessResponseSchema
>;
registerSchema(
  "GetUserProfileSuccessResponse",
  GetUserProfileSuccessResponseSchema,
);

/*
    getUserActivity() Schema - 用户活动时间线
*/
// 文章活动
export const PostActivitySchema = z.object({
  id: z.string(),
  type: z.literal("post"),
  createdAt: z.string().datetime(),
  post: z.object({
    slug: z.string(),
    title: z.string(),
    createdAt: z.string().datetime(),
    tags: z.array(
      z.object({
        name: z.string(),
        slug: z.string(),
      }),
    ),
    categories: z.array(
      z.object({
        name: z.string(),
        slug: z.string(),
      }),
    ),
  }),
});
export type PostActivity = z.infer<typeof PostActivitySchema>;

// 评论活动
export const CommentActivitySchema = z.object({
  id: z.string(),
  type: z.literal("comment"),
  createdAt: z.string().datetime(),
  comment: z.object({
    content: z.string(), // 评论内容
    postSlug: z.string(), // 所属文章 slug
    postTitle: z.string(), // 所属文章标题
    likesCount: z.number().int().nonnegative(), // 点赞数
    parentComment: z
      .object({
        content: z.string(), // 父评论内容
        authorUsername: z.string(), // 父评论作者用户名
      })
      .nullable(), // 如果是回复，包含父评论信息
  }),
});
export type CommentActivity = z.infer<typeof CommentActivitySchema>;

// 点赞活动
export const LikeActivitySchema = z.object({
  id: z.string(),
  type: z.literal("like"),
  createdAt: z.string().datetime(),
  like: z.object({
    commentContent: z.string(), // 被点赞的评论内容
    commentAuthorUsername: z.string(), // 被点赞评论的作者用户名
    postSlug: z.string(), // 所属文章 slug
    postTitle: z.string(), // 所属文章标题
    commentLikesCount: z.number().int().nonnegative(), // 该评论的总点赞数
  }),
});
export type LikeActivity = z.infer<typeof LikeActivitySchema>;

// 联合活动类型
export const UserActivityItemSchema = z.discriminatedUnion("type", [
  PostActivitySchema,
  CommentActivitySchema,
  LikeActivitySchema,
]);
export type UserActivityItem = z.infer<typeof UserActivityItemSchema>;

// 活动响应
export const UserActivityResponseSchema = z.object({
  activities: z.array(UserActivityItemSchema),
  pagination: z.object({
    total: z.number().int().nonnegative(), // 总数
    limit: z.number().int().positive(), // 每页数量
    offset: z.number().int().nonnegative(), // 偏移量
    hasMore: z.boolean(), // 是否有更多
  }),
});
export type UserActivityResponse = z.infer<typeof UserActivityResponseSchema>;

export const GetUserActivitySuccessResponseSchema = createSuccessResponseSchema(
  UserActivityResponseSchema,
);
export type GetUserActivitySuccessResponse = z.infer<
  typeof GetUserActivitySuccessResponseSchema
>;
registerSchema(
  "GetUserActivitySuccessResponse",
  GetUserActivitySuccessResponseSchema,
);

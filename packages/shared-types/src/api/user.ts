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

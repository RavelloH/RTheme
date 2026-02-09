import { z } from "zod";
import {
  createPaginatedResponseSchema,
  createSuccessResponseSchema,
  registerSchema,
} from "./common.js";

export const FriendLinkStatusSchema = z.enum([
  "PENDING",
  "PUBLISHED",
  "WHITELIST",
  "REJECTED",
  "DISCONNECT",
  "NO_BACKLINK",
  "BLOCKED",
]);
export type FriendLinkStatus = z.infer<typeof FriendLinkStatusSchema>;

export const FriendLinkIssueTypeSchema = z.enum([
  "NONE",
  "DISCONNECT",
  "NO_BACKLINK",
]);
export type FriendLinkIssueType = z.infer<typeof FriendLinkIssueTypeSchema>;

export const FriendLinkCheckTypeSchema = z.enum(["url", "backlink"]);
export type FriendLinkCheckType = z.infer<typeof FriendLinkCheckTypeSchema>;

export const FriendLinkCheckHistoryItemSchema = z.object({
  time: z.string(),
  checkType: FriendLinkCheckTypeSchema,
  targetUrl: z.string(),
  responseTime: z.number().int().nonnegative().nullable(),
  statusCode: z.number().int().nullable().optional(),
  ok: z.boolean(),
  hasBacklink: z.boolean().optional(),
  issueType: FriendLinkIssueTypeSchema.default("NONE"),
  note: z.string().optional(),
});
export type FriendLinkCheckHistoryItem = z.infer<
  typeof FriendLinkCheckHistoryItemSchema
>;

export const FriendLinkUserSchema = z.object({
  uid: z.number().int(),
  username: z.string(),
  nickname: z.string().nullable(),
});
export type FriendLinkUser = z.infer<typeof FriendLinkUserSchema>;

export const FriendLinkListItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  url: z.string(),
  avatar: z.string().nullable(),
  slogan: z.string().nullable(),
  friendLinkUrl: z.string().nullable(),
  ignoreBacklink: z.boolean(),
  group: z.string().nullable(),
  order: z.number().int(),
  status: FriendLinkStatusSchema,
  checkSuccessCount: z.number().int().nonnegative(),
  checkFailureCount: z.number().int().nonnegative(),
  recentSuccessRate: z.number().min(0).max(100).nullable().default(null),
  recentSampleCount: z.number().int().nonnegative().default(0),
  lastCheckedAt: z.string().nullable(),
  avgResponseTime: z.number().int().nullable(),
  applyNote: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
  owner: FriendLinkUserSchema.nullable(),
  auditor: FriendLinkUserSchema.nullable(),
  checkHistory: z
    .array(FriendLinkCheckHistoryItemSchema)
    .optional()
    .default([]),
});
export type FriendLinkListItem = z.infer<typeof FriendLinkListItemSchema>;

export const GetFriendLinksStatsSchema = z.object({
  access_token: z.string().optional(),
  force: z.boolean().optional().default(false),
});
export type GetFriendLinksStats = z.infer<typeof GetFriendLinksStatsSchema>;
registerSchema("GetFriendLinksStats", GetFriendLinksStatsSchema);

export const FriendLinksStatsSchema = z.object({
  updatedAt: z.string(),
  cache: z.boolean(),
  total: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  published: z.number().int().nonnegative(),
  whitelist: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative(),
  disconnect: z.number().int().nonnegative(),
  noBacklink: z.number().int().nonnegative(),
  withOwner: z.number().int().nonnegative(),
  problematic: z.number().int().nonnegative(),
});
export type FriendLinksStats = z.infer<typeof FriendLinksStatsSchema>;

export const GetFriendLinksStatsSuccessResponseSchema =
  createSuccessResponseSchema(FriendLinksStatsSchema);
export type GetFriendLinksStatsSuccessResponse = z.infer<
  typeof GetFriendLinksStatsSuccessResponseSchema
>;
registerSchema(
  "GetFriendLinksStatsSuccessResponse",
  GetFriendLinksStatsSuccessResponseSchema,
);

export const GetFriendLinksTrendsSchema = z.object({
  access_token: z.string().optional(),
  days: z.number().int().positive().default(30),
  count: z.number().int().positive().default(30),
});
export type GetFriendLinksTrends = z.infer<typeof GetFriendLinksTrendsSchema>;
registerSchema("GetFriendLinksTrends", GetFriendLinksTrendsSchema);

export const FriendLinkTrendItemSchema = z.object({
  time: z.string(),
  data: z.object({
    total: z.number().int().nonnegative(),
    new: z.number().int().nonnegative(),
    published: z.number().int().nonnegative(),
  }),
});
export type FriendLinkTrendItem = z.infer<typeof FriendLinkTrendItemSchema>;

export const GetFriendLinksTrendsSuccessResponseSchema =
  createSuccessResponseSchema(z.array(FriendLinkTrendItemSchema));
export type GetFriendLinksTrendsSuccessResponse = z.infer<
  typeof GetFriendLinksTrendsSuccessResponseSchema
>;
registerSchema(
  "GetFriendLinksTrendsSuccessResponse",
  GetFriendLinksTrendsSuccessResponseSchema,
);

export const GetFriendLinksListSchema = z.object({
  access_token: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(500).default(25),
  sortBy: z
    .enum([
      "id",
      "name",
      "status",
      "createdAt",
      "updatedAt",
      "publishedAt",
      "lastCheckedAt",
      "avgResponseTime",
      "checkFailureCount",
      "checkSuccessCount",
    ])
    .optional()
    .default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().optional(),
  status: z.array(FriendLinkStatusSchema).optional(),
  ownerUid: z.number().int().optional(),
  ignoreBacklink: z.boolean().optional(),
  hasIssue: z.boolean().optional(),
  createdAtStart: z.string().optional(),
  createdAtEnd: z.string().optional(),
  updatedAtStart: z.string().optional(),
  updatedAtEnd: z.string().optional(),
  publishedAtStart: z.string().optional(),
  publishedAtEnd: z.string().optional(),
});
export type GetFriendLinksList = z.infer<typeof GetFriendLinksListSchema>;
registerSchema("GetFriendLinksList", GetFriendLinksListSchema);

export const GetFriendLinksListSuccessResponseSchema =
  createPaginatedResponseSchema(z.array(FriendLinkListItemSchema));
export type GetFriendLinksListSuccessResponse = z.infer<
  typeof GetFriendLinksListSuccessResponseSchema
>;
registerSchema(
  "GetFriendLinksListSuccessResponse",
  GetFriendLinksListSuccessResponseSchema,
);

export const SubmitFriendLinkApplicationSchema = z.object({
  access_token: z.string().optional(),
  captcha_token: z.string().min(1, "captcha_token 不能为空"),
  name: z.string().min(1, "名称不能为空").max(100, "名称长度不能超过100个字符"),
  url: z
    .string()
    .url("请输入有效的网站地址")
    .max(500, "URL 长度不能超过500个字符"),
  avatar: z
    .string()
    .url("请输入有效的头像地址")
    .max(500, "头像地址长度不能超过500个字符"),
  slogan: z
    .string()
    .min(1, "标语不能为空")
    .max(255, "标语长度不能超过255个字符"),
  friendLinkUrl: z
    .string()
    .url("请输入有效的友链页面地址")
    .max(500, "友链页地址长度不能超过500个字符"),
  applyNote: z.string().max(1000, "申请备注长度不能超过1000个字符").optional(),
});
export type SubmitFriendLinkApplication = z.infer<
  typeof SubmitFriendLinkApplicationSchema
>;
registerSchema(
  "SubmitFriendLinkApplication",
  SubmitFriendLinkApplicationSchema,
);

export const SubmitFriendLinkApplicationResultSchema = z.object({
  id: z.number().int(),
  status: FriendLinkStatusSchema,
});
export type SubmitFriendLinkApplicationResult = z.infer<
  typeof SubmitFriendLinkApplicationResultSchema
>;

export const SubmitFriendLinkApplicationSuccessResponseSchema =
  createSuccessResponseSchema(SubmitFriendLinkApplicationResultSchema);
export type SubmitFriendLinkApplicationSuccessResponse = z.infer<
  typeof SubmitFriendLinkApplicationSuccessResponseSchema
>;
registerSchema(
  "SubmitFriendLinkApplicationSuccessResponse",
  SubmitFriendLinkApplicationSuccessResponseSchema,
);

export const GetOwnFriendLinkSchema = z.object({
  access_token: z.string().optional(),
});
export type GetOwnFriendLink = z.infer<typeof GetOwnFriendLinkSchema>;
registerSchema("GetOwnFriendLink", GetOwnFriendLinkSchema);

export const GetOwnFriendLinkSuccessResponseSchema =
  createSuccessResponseSchema(FriendLinkListItemSchema.nullable());
export type GetOwnFriendLinkSuccessResponse = z.infer<
  typeof GetOwnFriendLinkSuccessResponseSchema
>;
registerSchema(
  "GetOwnFriendLinkSuccessResponse",
  GetOwnFriendLinkSuccessResponseSchema,
);

export const GetFriendLinkDetailSchema = z.object({
  access_token: z.string().optional(),
  id: z.number().int().positive(),
});
export type GetFriendLinkDetail = z.infer<typeof GetFriendLinkDetailSchema>;
registerSchema("GetFriendLinkDetail", GetFriendLinkDetailSchema);

export const GetFriendLinkDetailSuccessResponseSchema =
  createSuccessResponseSchema(FriendLinkListItemSchema);
export type GetFriendLinkDetailSuccessResponse = z.infer<
  typeof GetFriendLinkDetailSuccessResponseSchema
>;
registerSchema(
  "GetFriendLinkDetailSuccessResponse",
  GetFriendLinkDetailSuccessResponseSchema,
);

export const ReviewFriendLinkSchema = z.object({
  access_token: z.string().optional(),
  id: z.number().int().positive(),
  status: z.enum(["PUBLISHED", "REJECTED", "BLOCKED", "WHITELIST"]),
  reason: z.string().max(500, "审核说明长度不能超过500个字符").optional(),
});
export type ReviewFriendLink = z.infer<typeof ReviewFriendLinkSchema>;
registerSchema("ReviewFriendLink", ReviewFriendLinkSchema);

export const ReviewFriendLinkResultSchema = z.object({
  id: z.number().int(),
  status: FriendLinkStatusSchema,
  updatedAt: z.string(),
});
export type ReviewFriendLinkResult = z.infer<
  typeof ReviewFriendLinkResultSchema
>;

export const ReviewFriendLinkSuccessResponseSchema =
  createSuccessResponseSchema(ReviewFriendLinkResultSchema);
export type ReviewFriendLinkSuccessResponse = z.infer<
  typeof ReviewFriendLinkSuccessResponseSchema
>;
registerSchema(
  "ReviewFriendLinkSuccessResponse",
  ReviewFriendLinkSuccessResponseSchema,
);

export const CreateFriendLinkByAdminSchema = z.object({
  access_token: z.string().optional(),
  name: z.string().min(1, "名称不能为空").max(100, "名称长度不能超过100个字符"),
  url: z
    .string()
    .url("请输入有效的网站地址")
    .max(500, "URL 长度不能超过500个字符"),
  avatar: z
    .string()
    .url("请输入有效的头像地址")
    .max(500, "头像地址长度不能超过500个字符"),
  slogan: z
    .string()
    .min(1, "标语不能为空")
    .max(255, "标语长度不能超过255个字符"),
  friendLinkUrl: z
    .string()
    .url("请输入有效的友链页面地址")
    .max(500, "友链页地址长度不能超过500个字符")
    .optional(),
  applyNote: z.string().max(1000, "备注长度不能超过1000个字符").optional(),
  status: z.enum(["PUBLISHED", "WHITELIST"]).optional().default("PUBLISHED"),
  ignoreBacklink: z.boolean().optional().default(false),
});
export type CreateFriendLinkByAdmin = z.infer<
  typeof CreateFriendLinkByAdminSchema
>;
registerSchema("CreateFriendLinkByAdmin", CreateFriendLinkByAdminSchema);

export const CreateFriendLinkByAdminResultSchema = z.object({
  id: z.number().int(),
  status: FriendLinkStatusSchema,
  createdAt: z.string(),
});
export type CreateFriendLinkByAdminResult = z.infer<
  typeof CreateFriendLinkByAdminResultSchema
>;

export const CreateFriendLinkByAdminSuccessResponseSchema =
  createSuccessResponseSchema(CreateFriendLinkByAdminResultSchema);
export type CreateFriendLinkByAdminSuccessResponse = z.infer<
  typeof CreateFriendLinkByAdminSuccessResponseSchema
>;
registerSchema(
  "CreateFriendLinkByAdminSuccessResponse",
  CreateFriendLinkByAdminSuccessResponseSchema,
);

export const ParseFriendLinkByAdminSchema = z.object({
  access_token: z.string().optional(),
  url: z
    .string()
    .min(1, "站点 URL 不能为空")
    .max(500, "URL 长度不能超过500个字符"),
});
export type ParseFriendLinkByAdmin = z.infer<
  typeof ParseFriendLinkByAdminSchema
>;
registerSchema("ParseFriendLinkByAdmin", ParseFriendLinkByAdminSchema);

export const ParseFriendLinkByAdminResultSchema = z.object({
  url: z.string().url(),
  name: z.string().min(1),
  avatar: z.string().url(),
  slogan: z.string().min(1),
  friendLinkUrl: z.string().url().nullable(),
});
export type ParseFriendLinkByAdminResult = z.infer<
  typeof ParseFriendLinkByAdminResultSchema
>;

export const ParseFriendLinkByAdminSuccessResponseSchema =
  createSuccessResponseSchema(ParseFriendLinkByAdminResultSchema);
export type ParseFriendLinkByAdminSuccessResponse = z.infer<
  typeof ParseFriendLinkByAdminSuccessResponseSchema
>;
registerSchema(
  "ParseFriendLinkByAdminSuccessResponse",
  ParseFriendLinkByAdminSuccessResponseSchema,
);

export const UpdateFriendLinkByAdminSchema = z.object({
  access_token: z.string().optional(),
  id: z.number().int().positive(),
  name: z.string().min(1, "名称不能为空").max(100, "名称长度不能超过100个字符"),
  url: z
    .string()
    .url("请输入有效的网站地址")
    .max(500, "URL 长度不能超过500个字符"),
  avatar: z
    .string()
    .url("请输入有效的头像地址")
    .max(500, "头像地址长度不能超过500个字符")
    .optional(),
  slogan: z.string().max(255, "标语长度不能超过255个字符").optional(),
  friendLinkUrl: z
    .string()
    .url("请输入有效的友链页面地址")
    .max(500, "友链页地址长度不能超过500个字符")
    .optional(),
  applyNote: z.string().max(1000, "说明长度不能超过1000个字符").optional(),
  ignoreBacklink: z.boolean().default(false),
  group: z.string().max(50, "分组长度不能超过50个字符").optional(),
  order: z.number().int().default(0),
  ownerUid: z.number().int().positive().nullable().optional(),
  status: FriendLinkStatusSchema,
});
export type UpdateFriendLinkByAdmin = z.infer<
  typeof UpdateFriendLinkByAdminSchema
>;
registerSchema("UpdateFriendLinkByAdmin", UpdateFriendLinkByAdminSchema);

export const UpdateFriendLinkByAdminResultSchema = z.object({
  id: z.number().int(),
  status: FriendLinkStatusSchema,
  updatedAt: z.string(),
});
export type UpdateFriendLinkByAdminResult = z.infer<
  typeof UpdateFriendLinkByAdminResultSchema
>;

export const UpdateFriendLinkByAdminSuccessResponseSchema =
  createSuccessResponseSchema(UpdateFriendLinkByAdminResultSchema);
export type UpdateFriendLinkByAdminSuccessResponse = z.infer<
  typeof UpdateFriendLinkByAdminSuccessResponseSchema
>;
registerSchema(
  "UpdateFriendLinkByAdminSuccessResponse",
  UpdateFriendLinkByAdminSuccessResponseSchema,
);

export const DeleteFriendLinkByAdminSchema = z.object({
  access_token: z.string().optional(),
  id: z.number().int().positive(),
});
export type DeleteFriendLinkByAdmin = z.infer<
  typeof DeleteFriendLinkByAdminSchema
>;
registerSchema("DeleteFriendLinkByAdmin", DeleteFriendLinkByAdminSchema);

export const DeleteFriendLinkByAdminResultSchema = z.object({
  id: z.number().int(),
  deletedAt: z.string(),
});
export type DeleteFriendLinkByAdminResult = z.infer<
  typeof DeleteFriendLinkByAdminResultSchema
>;

export const DeleteFriendLinkByAdminSuccessResponseSchema =
  createSuccessResponseSchema(DeleteFriendLinkByAdminResultSchema);
export type DeleteFriendLinkByAdminSuccessResponse = z.infer<
  typeof DeleteFriendLinkByAdminSuccessResponseSchema
>;
registerSchema(
  "DeleteFriendLinkByAdminSuccessResponse",
  DeleteFriendLinkByAdminSuccessResponseSchema,
);

export const UpdateOwnFriendLinkSchema = z.object({
  access_token: z.string().optional(),
  name: z.string().min(1, "名称不能为空").max(100, "名称长度不能超过100个字符"),
  url: z
    .string()
    .url("请输入有效的网站地址")
    .max(500, "URL 长度不能超过500个字符"),
  avatar: z
    .string()
    .url("请输入有效的头像地址")
    .max(500, "头像地址长度不能超过500个字符"),
  slogan: z
    .string()
    .min(1, "标语不能为空")
    .max(255, "标语长度不能超过255个字符"),
  friendLinkUrl: z
    .string()
    .url("请输入有效的友链页面地址")
    .max(500, "友链页地址长度不能超过500个字符"),
  applyNote: z.string().max(1000, "说明长度不能超过1000个字符").optional(),
});
export type UpdateOwnFriendLink = z.infer<typeof UpdateOwnFriendLinkSchema>;
registerSchema("UpdateOwnFriendLink", UpdateOwnFriendLinkSchema);

export const UpdateOwnFriendLinkResultSchema = z.object({
  id: z.number().int(),
  updatedAt: z.string(),
});
export type UpdateOwnFriendLinkResult = z.infer<
  typeof UpdateOwnFriendLinkResultSchema
>;

export const UpdateOwnFriendLinkSuccessResponseSchema =
  createSuccessResponseSchema(UpdateOwnFriendLinkResultSchema);
export type UpdateOwnFriendLinkSuccessResponse = z.infer<
  typeof UpdateOwnFriendLinkSuccessResponseSchema
>;
registerSchema(
  "UpdateOwnFriendLinkSuccessResponse",
  UpdateOwnFriendLinkSuccessResponseSchema,
);

export const DeleteOwnFriendLinkSchema = z.object({
  access_token: z.string().optional(),
});
export type DeleteOwnFriendLink = z.infer<typeof DeleteOwnFriendLinkSchema>;
registerSchema("DeleteOwnFriendLink", DeleteOwnFriendLinkSchema);

export const DeleteOwnFriendLinkResultSchema = z.object({
  id: z.number().int(),
  deletedAt: z.string(),
});
export type DeleteOwnFriendLinkResult = z.infer<
  typeof DeleteOwnFriendLinkResultSchema
>;

export const DeleteOwnFriendLinkSuccessResponseSchema =
  createSuccessResponseSchema(DeleteOwnFriendLinkResultSchema);
export type DeleteOwnFriendLinkSuccessResponse = z.infer<
  typeof DeleteOwnFriendLinkSuccessResponseSchema
>;
registerSchema(
  "DeleteOwnFriendLinkSuccessResponse",
  DeleteOwnFriendLinkSuccessResponseSchema,
);

export const CheckFriendLinksSchema = z.object({
  access_token: z.string().optional(),
  ids: z.array(z.number().int().positive()).optional(),
  checkAll: z.boolean().optional().default(false),
});
export type CheckFriendLinks = z.infer<typeof CheckFriendLinksSchema>;
registerSchema("CheckFriendLinks", CheckFriendLinksSchema);

export const FriendLinkCheckResultItemSchema = z.object({
  id: z.number().int(),
  status: FriendLinkStatusSchema,
  checked: z.boolean(),
  skipped: z.boolean().default(false),
  skipReason: z.string().optional(),
  issueType: FriendLinkIssueTypeSchema.default("NONE"),
  responseTime: z.number().int().nonnegative().nullable().optional(),
  message: z.string().optional(),
});
export type FriendLinkCheckResultItem = z.infer<
  typeof FriendLinkCheckResultItemSchema
>;

export const CheckFriendLinksResultSchema = z.object({
  total: z.number().int().nonnegative(),
  checked: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  statusChanged: z.number().int().nonnegative(),
  results: z.array(FriendLinkCheckResultItemSchema),
});
export type CheckFriendLinksResult = z.infer<
  typeof CheckFriendLinksResultSchema
>;

export const CheckFriendLinksSuccessResponseSchema =
  createSuccessResponseSchema(CheckFriendLinksResultSchema);
export type CheckFriendLinksSuccessResponse = z.infer<
  typeof CheckFriendLinksSuccessResponseSchema
>;
registerSchema(
  "CheckFriendLinksSuccessResponse",
  CheckFriendLinksSuccessResponseSchema,
);

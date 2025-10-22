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
  role: z.enum(["USER", "ADMIN", "EDITOR", "AUTHOR"]).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "NEEDS_UPDATE"]).optional(),
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

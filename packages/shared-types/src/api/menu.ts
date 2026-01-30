import { z } from "zod";
import { createSuccessResponseSchema, registerSchema } from "./common.js";

/*
    getMenusStats() Schema
*/
export const GetMenusStatsSchema = z.object({
  access_token: z.string().optional(),
  force: z.boolean().default(false),
});
export type GetMenusStats = z.infer<typeof GetMenusStatsSchema>;
registerSchema("GetMenusStats", GetMenusStatsSchema);

export const MenusStatsDataSchema = z.object({
  updatedAt: z.string(),
  cache: z.boolean(),
  total: z.object({
    total: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    suspended: z.number().int().nonnegative(),
    main: z.number().int().nonnegative(),
    common: z.number().int().nonnegative(),
    outsite: z.number().int().nonnegative(),
  }),
});
export type MenusStatsData = z.infer<typeof MenusStatsDataSchema>;

export const GetMenusStatsSuccessResponseSchema =
  createSuccessResponseSchema(MenusStatsDataSchema);
export type GetMenusStatsSuccessResponse = z.infer<
  typeof GetMenusStatsSuccessResponseSchema
>;
registerSchema(
  "GetMenusStatsSuccessResponse",
  GetMenusStatsSuccessResponseSchema,
);

/*
    getMenusList() Schema
*/
export const GetMenusListSchema = z.object({
  access_token: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(25),
  sortBy: z
    .enum(["name", "order", "createdAt", "updatedAt"])
    .optional()
    .default("order"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
  status: z.array(z.enum(["ACTIVE", "SUSPENDED"])).optional(),
  category: z.array(z.enum(["MAIN", "COMMON", "OUTSITE"])).optional(),
  search: z.string().optional(),
  // 筛选参数
  createdAtStart: z.string().optional(),
  createdAtEnd: z.string().optional(),
  updatedAtStart: z.string().optional(),
  updatedAtEnd: z.string().optional(),
});
export type GetMenusList = z.infer<typeof GetMenusListSchema>;
registerSchema("GetMenusList", GetMenusListSchema);

export const MenuListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  link: z.string().nullable(),
  slug: z.string().nullable(),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  order: z.number().int(),
  category: z.enum(["MAIN", "COMMON", "OUTSITE"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  page: z
    .object({
      id: z.string(),
      slug: z.string(),
      title: z.string(),
    })
    .nullable(),
});
export type MenuListItem = z.infer<typeof MenuListItemSchema>;

export const GetMenusListSuccessResponseSchema = createSuccessResponseSchema(
  z.array(MenuListItemSchema),
);
export type GetMenusListSuccessResponse = z.infer<
  typeof GetMenusListSuccessResponseSchema
>;
registerSchema(
  "GetMenusListSuccessResponse",
  GetMenusListSuccessResponseSchema,
);

/*
    getMenuDetail() Schema
*/
export const GetMenuDetailSchema = z.object({
  access_token: z.string().optional(),
  id: z.string().min(1, "菜单 ID 不能为空"),
});
export type GetMenuDetail = z.infer<typeof GetMenuDetailSchema>;
registerSchema("GetMenuDetail", GetMenuDetailSchema);

export const MenuDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  link: z.string().nullable(),
  slug: z.string().nullable(),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  order: z.number().int(),
  category: z.enum(["MAIN", "COMMON", "OUTSITE"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  page: z
    .object({
      id: z.string(),
      slug: z.string(),
      title: z.string(),
    })
    .nullable(),
});
export type MenuDetail = z.infer<typeof MenuDetailSchema>;

export const GetMenuDetailSuccessResponseSchema =
  createSuccessResponseSchema(MenuDetailSchema);
export type GetMenuDetailSuccessResponse = z.infer<
  typeof GetMenuDetailSuccessResponseSchema
>;
registerSchema(
  "GetMenuDetailSuccessResponse",
  GetMenuDetailSuccessResponseSchema,
);

/*
    createMenu() Schema
*/
export const CreateMenuSchema = z.object({
  access_token: z.string().optional(),
  name: z.string().min(1, "名称不能为空").max(100, "名称过长"),
  icon: z.string().max(100, "图标名称过长").optional(),
  link: z.string().max(255, "链接过长").optional(),
  slug: z.string().max(100, "路径过长").optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).default("ACTIVE"),
  order: z.number().int().default(0),
  category: z.enum(["MAIN", "COMMON", "OUTSITE"]).default("COMMON"),
  pageId: z.string().optional(),
});
export type CreateMenu = z.infer<typeof CreateMenuSchema>;
registerSchema("CreateMenu", CreateMenuSchema);

export const CreateMenuResultSchema = z.object({
  id: z.string(),
});
export type CreateMenuResult = z.infer<typeof CreateMenuResultSchema>;

export const CreateMenuSuccessResponseSchema = createSuccessResponseSchema(
  CreateMenuResultSchema,
);
export type CreateMenuSuccessResponse = z.infer<
  typeof CreateMenuSuccessResponseSchema
>;
registerSchema("CreateMenuSuccessResponse", CreateMenuSuccessResponseSchema);

/*
    updateMenu() Schema - 更新单个菜单
*/
export const UpdateMenuSchema = z.object({
  access_token: z.string().optional(),
  id: z.string().min(1, "菜单 ID 不能为空"),
  name: z.string().min(1, "名称不能为空").max(100, "名称过长").optional(),
  icon: z.string().max(100, "图标名称过长").nullable().optional(),
  link: z.string().max(255, "链接过长").nullable().optional(),
  slug: z.string().max(100, "路径过长").nullable().optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  order: z.number().int().optional(),
  category: z.enum(["MAIN", "COMMON", "OUTSITE"]).optional(),
  pageId: z.string().nullable().optional(),
});
export type UpdateMenu = z.infer<typeof UpdateMenuSchema>;
registerSchema("UpdateMenu", UpdateMenuSchema);

export const UpdateMenuResultSchema = z.object({
  id: z.string(),
});
export type UpdateMenuResult = z.infer<typeof UpdateMenuResultSchema>;

export const UpdateMenuSuccessResponseSchema = createSuccessResponseSchema(
  UpdateMenuResultSchema,
);
export type UpdateMenuSuccessResponse = z.infer<
  typeof UpdateMenuSuccessResponseSchema
>;
registerSchema("UpdateMenuSuccessResponse", UpdateMenuSuccessResponseSchema);

/*
    updateMenus() Schema - 批量更新菜单
*/
export const UpdateMenusSchema = z.object({
  access_token: z.string().optional(),
  ids: z
    .array(z.string().min(1, "必须提供至少一个菜单 ID"))
    .min(1, "必须提供至少一个菜单 ID"),
  // 批量操作字段
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  category: z.enum(["MAIN", "COMMON", "OUTSITE"]).optional(),
  // 单个菜单编辑字段
  name: z.string().min(1, "名称不能为空").max(100, "名称过长").optional(),
  icon: z.string().max(100, "图标名称过长").nullable().optional(),
  link: z.string().max(255, "链接过长").nullable().optional(),
  slug: z.string().max(100, "路径过长").nullable().optional(),
  order: z.number().int().optional(),
  pageId: z.string().nullable().optional(),
});
export type UpdateMenus = z.infer<typeof UpdateMenusSchema>;
registerSchema("UpdateMenus", UpdateMenusSchema);

export const UpdateMenusResultSchema = z.object({
  updated: z.number().int().nonnegative(),
});
export type UpdateMenusResult = z.infer<typeof UpdateMenusResultSchema>;

export const UpdateMenusSuccessResponseSchema = createSuccessResponseSchema(
  UpdateMenusResultSchema,
);
export type UpdateMenusSuccessResponse = z.infer<
  typeof UpdateMenusSuccessResponseSchema
>;
registerSchema("UpdateMenusSuccessResponse", UpdateMenusSuccessResponseSchema);

/*
    deleteMenus() Schema
*/
export const DeleteMenusSchema = z.object({
  access_token: z.string().optional(),
  ids: z
    .array(z.string().min(1, "必须提供至少一个菜单 ID"))
    .min(1, "必须提供至少一个菜单 ID"),
});
export type DeleteMenus = z.infer<typeof DeleteMenusSchema>;
registerSchema("DeleteMenus", DeleteMenusSchema);

export const DeleteMenusResultSchema = z.object({
  deleted: z.number().int().nonnegative(),
});
export type DeleteMenusResult = z.infer<typeof DeleteMenusResultSchema>;

export const DeleteMenusSuccessResponseSchema = createSuccessResponseSchema(
  DeleteMenusResultSchema,
);
export type DeleteMenusSuccessResponse = z.infer<
  typeof DeleteMenusSuccessResponseSchema
>;
registerSchema("DeleteMenusSuccessResponse", DeleteMenusSuccessResponseSchema);

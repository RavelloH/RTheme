import { z } from "zod";
import { createSuccessResponseSchema, registerSchema } from "./common.js";

/*
    getCategoriesList() Schema
*/
export const GetCategoriesListSchema = z.object({
  access_token: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(25),
  sortBy: z
    .enum([
      "slug",
      "name",
      "directPostCount",
      "totalPostCount",
      "directChildCount",
      "totalChildCount",
      "createdAt",
      "updatedAt",
    ])
    .optional()
    .default("totalPostCount"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().optional(),
  // 筛选参数
  parentId: z.number().int().nullable().optional(), // 筛选指定父分类的子分类，null 表示顶级分类
  parentSlug: z.string().optional(), // 使用 slug 筛选父分类（与 parentId 二选一）
  postIds: z.array(z.number().int().positive()).optional(), // 筛选包含指定文章的分类
  hasZeroPosts: z.boolean().optional(), // 筛选无文章关联的分类
  createdAtStart: z.string().optional(),
  createdAtEnd: z.string().optional(),
  updatedAtStart: z.string().optional(),
  updatedAtEnd: z.string().optional(),
});
export type GetCategoriesList = z.infer<typeof GetCategoriesListSchema>;
registerSchema("GetCategoriesList", GetCategoriesListSchema);

export const CategoryListItemSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  featuredImage: z.string().nullable(),
  parentId: z.number().int().nullable(),
  parentSlug: z.string().nullable(),
  parentName: z.string().nullable(),
  directPostCount: z.number().int().nonnegative(), // 直属文章数
  totalPostCount: z.number().int().nonnegative(), // 含子孙分类的文章总数
  directChildCount: z.number().int().nonnegative(), // 直接子分类数
  totalChildCount: z.number().int().nonnegative(), // 含子孙的分类总数
  depth: z.number().int().nonnegative(), // 层级深度（顶级为 0）
  path: z.array(z.string()), // 面包屑路径（slug 数组）
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CategoryListItem = z.infer<typeof CategoryListItemSchema>;

export const GetCategoriesListSuccessResponseSchema =
  createSuccessResponseSchema(z.array(CategoryListItemSchema));
export type GetCategoriesListSuccessResponse = z.infer<
  typeof GetCategoriesListSuccessResponseSchema
>;
registerSchema(
  "GetCategoriesListSuccessResponse",
  GetCategoriesListSuccessResponseSchema,
);

/*
    getCategoryDetail() Schema
*/
export const GetCategoryDetailSchema = z.object({
  access_token: z.string().optional(),
  slug: z.string().min(1, "分类 slug 不能为空"),
  path: z.array(z.string()).optional(), // 完整路径（用于动态路由）
});
export type GetCategoryDetail = z.infer<typeof GetCategoryDetailSchema>;
registerSchema("GetCategoryDetail", GetCategoryDetailSchema);

export const CategoryDetailSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  featuredImage: z.string().nullable(),
  parentId: z.number().int().nullable(),
  parentSlug: z.string().nullable(),
  parentName: z.string().nullable(),
  directPostCount: z.number().int().nonnegative(),
  totalPostCount: z.number().int().nonnegative(),
  directChildCount: z.number().int().nonnegative(),
  totalChildCount: z.number().int().nonnegative(),
  depth: z.number().int().nonnegative(),
  path: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  // 直接子分类
  children: z.array(
    z.object({
      id: z.number().int(),
      slug: z.string(),
      name: z.string(),
      postCount: z.number().int().nonnegative(),
    }),
  ),
  // 关联文章
  posts: z.array(
    z.object({
      id: z.number().int(),
      title: z.string(),
      slug: z.string(),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    }),
  ),
});
export type CategoryDetail = z.infer<typeof CategoryDetailSchema>;

export const GetCategoryDetailSuccessResponseSchema =
  createSuccessResponseSchema(CategoryDetailSchema);
export type GetCategoryDetailSuccessResponse = z.infer<
  typeof GetCategoryDetailSuccessResponseSchema
>;
registerSchema(
  "GetCategoryDetailSuccessResponse",
  GetCategoryDetailSuccessResponseSchema,
);

/*
    createCategory() Schema
*/
export const CreateCategorySchema = z.object({
  access_token: z.string().optional(),
  name: z.string().min(1, "分类名不能为空").max(100, "分类名最多100个字符"),
  slug: z.string().max(200, "Slug 最多200个字符").optional(), // slug 可选，如果不提供则自动生成
  description: z.string().max(255, "描述最多255个字符").optional().nullable(),
  featuredImage: z
    .string()
    .max(255, "特色图片最多255个字符")
    .optional()
    .nullable(),
  parentId: z.number().int().nullable().optional(), // 父分类 ID，null 或不提供表示顶级分类
  parentSlug: z.string().optional(), // 使用 slug 指定父分类（与 parentId 二选一）
});
export type CreateCategory = z.infer<typeof CreateCategorySchema>;
registerSchema("CreateCategory", CreateCategorySchema);

export const CreateCategorySuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    id: z.number().int(),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    featuredImage: z.string().nullable(),
    parentId: z.number().int().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
);
export type CreateCategorySuccessResponse = z.infer<
  typeof CreateCategorySuccessResponseSchema
>;
registerSchema(
  "CreateCategorySuccessResponse",
  CreateCategorySuccessResponseSchema,
);

/*
    updateCategory() Schema
*/
export const UpdateCategorySchema = z.object({
  access_token: z.string().optional(),
  id: z.number().int().positive(), // 使用 ID 作为主要标识
  slug: z.string().optional(), // 也支持通过 slug 查找（与 id 二选一）
  newSlug: z
    .string()
    .min(1, "新 slug 不能为空")
    .max(200, "Slug 最多200个字符")
    .optional(),
  newName: z
    .string()
    .min(1, "新分类名不能为空")
    .max(100, "分类名最多100个字符")
    .optional(),
  description: z.string().max(255, "描述最多255个字符").optional().nullable(),
  featuredImage: z
    .string()
    .max(255, "特色图片最多255个字符")
    .optional()
    .nullable(),
  parentId: z.number().int().nullable().optional(), // 更新父分类（移动分类）
  parentSlug: z.string().nullable().optional(), // 使用 slug 指定新父分类
});
export type UpdateCategory = z.infer<typeof UpdateCategorySchema>;
registerSchema("UpdateCategory", UpdateCategorySchema);

export const UpdateCategorySuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    id: z.number().int(),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    featuredImage: z.string().nullable(),
    parentId: z.number().int().nullable(),
    updatedAt: z.string(),
  }),
);
export type UpdateCategorySuccessResponse = z.infer<
  typeof UpdateCategorySuccessResponseSchema
>;
registerSchema(
  "UpdateCategorySuccessResponse",
  UpdateCategorySuccessResponseSchema,
);

/*
    deleteCategories() Schema - 级联删除
*/
export const DeleteCategoriesSchema = z.object({
  access_token: z.string().optional(),
  ids: z.array(z.number().int().positive()).min(1, "至少需要一个分类 ID"),
});
export type DeleteCategories = z.infer<typeof DeleteCategoriesSchema>;
registerSchema("DeleteCategories", DeleteCategoriesSchema);

export const DeleteCategoriesSuccessResponseSchema =
  createSuccessResponseSchema(
    z.object({
      deleted: z.number().int().nonnegative(),
      ids: z.array(z.number().int()),
      cascadeDeleted: z.number().int().nonnegative(), // 级联删除的子分类数
    }),
  );
export type DeleteCategoriesSuccessResponse = z.infer<
  typeof DeleteCategoriesSuccessResponseSchema
>;
registerSchema(
  "DeleteCategoriesSuccessResponse",
  DeleteCategoriesSuccessResponseSchema,
);

/*
    moveCategories() Schema - 批量移动到同一父分类
*/
export const MoveCategoriesSchema = z.object({
  access_token: z.string().optional(),
  ids: z.array(z.number().int().positive()).min(1, "至少需要一个分类 ID"),
  targetParentId: z.number().int().nullable(), // 目标父分类 ID，null 表示移动到顶级
  targetParentSlug: z.string().nullable().optional(), // 使用 slug 指定目标父分类
});
export type MoveCategories = z.infer<typeof MoveCategoriesSchema>;
registerSchema("MoveCategories", MoveCategoriesSchema);

export const MoveCategoriesSuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    moved: z.number().int().nonnegative(),
    ids: z.array(z.number().int()),
    targetParentId: z.number().int().nullable(),
  }),
);
export type MoveCategoriesSuccessResponse = z.infer<
  typeof MoveCategoriesSuccessResponseSchema
>;
registerSchema(
  "MoveCategoriesSuccessResponse",
  MoveCategoriesSuccessResponseSchema,
);

/*
    searchCategories() Schema - 轻量级分类搜索
*/
export const SearchCategoriesSchema = z.object({
  access_token: z.string().optional(),
  query: z.string().min(1, "搜索关键词不能为空"),
  limit: z.number().int().positive().default(10), // 默认返回10条结果
  parentId: z.number().int().nullable().optional(), // 限制在指定父分类下搜索
});
export type SearchCategories = z.infer<typeof SearchCategoriesSchema>;
registerSchema("SearchCategories", SearchCategoriesSchema);

export const SearchCategoryItemSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: z.string(),
  parentId: z.number().int().nullable(),
  postCount: z.number().int().nonnegative(),
  path: z.array(z.string()),
});
export type SearchCategoryItem = z.infer<typeof SearchCategoryItemSchema>;

export const SearchCategoriesSuccessResponseSchema =
  createSuccessResponseSchema(z.array(SearchCategoryItemSchema));
export type SearchCategoriesSuccessResponse = z.infer<
  typeof SearchCategoriesSuccessResponseSchema
>;
registerSchema(
  "SearchCategoriesSuccessResponse",
  SearchCategoriesSuccessResponseSchema,
);

/*
    getCategoriesDistribution() Schema - 用于环形图展示（当前层级）
*/
export const GetCategoriesDistributionSchema = z.object({
  access_token: z.string().optional(),
  parentId: z.number().int().nullable().optional(), // 指定父分类，null 表示顶级分类
  parentSlug: z.string().optional(), // 使用 slug 指定父分类
  limit: z.number().int().positive().default(10), // 默认返回前10个分类
});
export type GetCategoriesDistribution = z.infer<
  typeof GetCategoriesDistributionSchema
>;
registerSchema("GetCategoriesDistribution", GetCategoriesDistributionSchema);

export const CategoryDistributionItemSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  name: z.string(),
  totalPostCount: z.number().int().nonnegative(), // 含子孙分类的文章总数
  percentage: z.number().nonnegative(),
});
export type CategoryDistributionItem = z.infer<
  typeof CategoryDistributionItemSchema
>;

export const GetCategoriesDistributionSuccessResponseSchema =
  createSuccessResponseSchema(z.array(CategoryDistributionItemSchema));
export type GetCategoriesDistributionSuccessResponse = z.infer<
  typeof GetCategoriesDistributionSuccessResponseSchema
>;
registerSchema(
  "GetCategoriesDistributionSuccessResponse",
  GetCategoriesDistributionSuccessResponseSchema,
);

/*
    getCategoriesTree() Schema - 获取树形结构
*/
export const GetCategoriesTreeSchema = z.object({
  access_token: z.string().optional(),
  parentId: z.number().int().nullable().optional(), // 从指定父分类开始，null 表示从根开始
  maxDepth: z.number().int().positive().optional(), // 最大层级深度
});
export type GetCategoriesTree = z.infer<typeof GetCategoriesTreeSchema>;
registerSchema("GetCategoriesTree", GetCategoriesTreeSchema);

export const CategoryTreeNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.number().int(),
    slug: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    parentId: z.number().int().nullable(),
    postCount: z.number().int().nonnegative(),
    createdAt: z.string(),
    updatedAt: z.string(),
    children: z.array(CategoryTreeNodeSchema),
  }),
);
export type CategoryTreeNode = z.infer<typeof CategoryTreeNodeSchema>;

export const GetCategoriesTreeSuccessResponseSchema =
  createSuccessResponseSchema(z.array(CategoryTreeNodeSchema));
export type GetCategoriesTreeSuccessResponse = z.infer<
  typeof GetCategoriesTreeSuccessResponseSchema
>;
registerSchema(
  "GetCategoriesTreeSuccessResponse",
  GetCategoriesTreeSuccessResponseSchema,
);

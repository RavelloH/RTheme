import { z } from "zod";
import { createSuccessResponseSchema, registerSchema } from "./common.js";

/*
    getProjectsTrends() Schema
*/
export const GetProjectsTrendsSchema = z.object({
  access_token: z.string().optional(),
  days: z.number().int().positive().default(365),
  count: z.number().int().positive().default(30),
});
export type GetProjectsTrends = z.infer<typeof GetProjectsTrendsSchema>;
registerSchema("GetProjectsTrends", GetProjectsTrendsSchema);

export const ProjectTrendItemSchema = z.object({
  time: z.string(),
  data: z.object({
    total: z.number().int().nonnegative(),
    new: z.number().int().nonnegative(),
    personal: z.number().int().nonnegative(),
  }),
});
export type ProjectTrendItem = z.infer<typeof ProjectTrendItemSchema>;

export const GetProjectsTrendsSuccessResponseSchema =
  createSuccessResponseSchema(z.array(ProjectTrendItemSchema));
export type GetProjectsTrendsSuccessResponse = z.infer<
  typeof GetProjectsTrendsSuccessResponseSchema
>;
registerSchema(
  "GetProjectsTrendsSuccessResponse",
  GetProjectsTrendsSuccessResponseSchema,
);

/*
    getProjectsList() Schema
*/
export const GetProjectsListSchema = z.object({
  access_token: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(25),
  sortBy: z
    .enum([
      "id",
      "title",
      "publishedAt",
      "updatedAt",
      "createdAt",
      "stars",
      "forks",
      "sortOrder",
    ])
    .optional()
    .default("id"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  status: z
    .array(z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "DEVELOPING"]))
    .optional(),
  search: z.string().optional(),
  // 筛选参数
  id: z.number().int().optional(),
  authorUid: z.number().int().optional(),
  enableGithubSync: z.array(z.boolean()).optional(),
  isFeatured: z.boolean().optional(),
  publishedAtStart: z.string().optional(),
  publishedAtEnd: z.string().optional(),
  updatedAtStart: z.string().optional(),
  updatedAtEnd: z.string().optional(),
  createdAtStart: z.string().optional(),
  createdAtEnd: z.string().optional(),
});
export type GetProjectsList = z.infer<typeof GetProjectsListSchema>;
registerSchema("GetProjectsList", GetProjectsListSchema);

export const ProjectListItemSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "DEVELOPING"]),
  demoUrl: z.string().nullable(),
  repoUrl: z.string().nullable(),
  urls: z.array(z.string()).optional(),
  techStack: z.array(z.string()).nullable(),
  repoPath: z.string().nullable(),
  stars: z.number().int(),
  forks: z.number().int(),
  languages: z.record(z.string(), z.number()).nullable(),
  license: z.string().nullable(),
  enableGithubSync: z.boolean(),
  enableConentSync: z.boolean(),
  isFeatured: z.boolean(),
  sortOrder: z.number().int(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  author: z.object({
    uid: z.number().int(),
    username: z.string(),
    nickname: z.string().nullable(),
  }),
  categories: z.array(z.string()),
  tags: z.array(
    z.object({
      name: z.string(),
      slug: z.string(),
    }),
  ),
  featuredImage: z.string().nullable(),
  featuredImages: z.array(z.string()).optional(),
});
export type ProjectListItem = z.infer<typeof ProjectListItemSchema>;

export const GetProjectsListSuccessResponseSchema = createSuccessResponseSchema(
  z.array(ProjectListItemSchema),
);
export type GetProjectsListSuccessResponse = z.infer<
  typeof GetProjectsListSuccessResponseSchema
>;
registerSchema(
  "GetProjectsListSuccessResponse",
  GetProjectsListSuccessResponseSchema,
);

/*
    getProjectDetail() Schema
*/
export const GetProjectDetailSchema = z.object({
  access_token: z.string().optional(),
  slug: z.string().min(1, "slug 不能为空"),
});
export type GetProjectDetail = z.infer<typeof GetProjectDetailSchema>;
registerSchema("GetProjectDetail", GetProjectDetailSchema);

export const ProjectDetailSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  content: z.string().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "DEVELOPING"]),
  demoUrl: z.string().nullable(),
  repoUrl: z.string().nullable(),
  urls: z.array(z.string()).optional(),
  techStack: z.array(z.string()).nullable(),
  repoPath: z.string().nullable(),
  stars: z.number().int(),
  forks: z.number().int(),
  languages: z.record(z.string(), z.number()).nullable(),
  license: z.string().nullable(),
  enableGithubSync: z.boolean(),
  enableConentSync: z.boolean(),
  isFeatured: z.boolean(),
  sortOrder: z.number().int(),
  metaDescription: z.string().nullable(),
  metaKeywords: z.string().nullable(),
  robotsIndex: z.boolean(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  author: z.object({
    uid: z.number().int(),
    username: z.string(),
    nickname: z.string().nullable(),
  }),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  featuredImage: z.string().nullable(),
  featuredImages: z.array(z.string()).optional(),
});
export type ProjectDetail = z.infer<typeof ProjectDetailSchema>;

export const GetProjectDetailSuccessResponseSchema =
  createSuccessResponseSchema(ProjectDetailSchema);
export type GetProjectDetailSuccessResponse = z.infer<
  typeof GetProjectDetailSuccessResponseSchema
>;
registerSchema(
  "GetProjectDetailSuccessResponse",
  GetProjectDetailSuccessResponseSchema,
);

/*
    createProject() Schema
*/
export const CreateProjectSchema = z.object({
  access_token: z.string().optional(),
  title: z.string().min(1, "标题不能为空").max(200, "标题过长"),
  slug: z.string().max(200, "slug 过长").optional(),
  description: z.string().optional(), // 可选，如果有 repoPath 则自动从 GitHub 获取
  content: z.string().optional(),
  demoUrl: z.string().max(500, "Demo URL 过长").optional(),
  repoUrl: z.string().max(500, "仓库 URL 过长").optional(),
  urls: z.array(z.string().max(500, "URL 过长")).optional(),
  techStack: z.array(z.string()).optional(),
  repoPath: z
    .string()
    .max(100, "仓库路径过长")
    .regex(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/, "仓库路径格式不正确")
    .optional(),
  license: z.string().max(100, "License 过长").optional(),
  enableGithubSync: z.boolean().default(false),
  enableConentSync: z.boolean().default(false),
  syncImmediately: z.boolean().default(false), // 创建后立即执行 GitHub 同步
  status: z
    .enum(["DRAFT", "PUBLISHED", "ARCHIVED", "DEVELOPING"])
    .default("DRAFT"),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  metaDescription: z.string().max(160).optional(),
  metaKeywords: z.string().max(255).optional(),
  robotsIndex: z.boolean().default(true),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  featuredImages: z.array(z.string().max(500, "图片 URL 过长")).optional(), // 支持多张特色图片
  featuredImage: z.string().max(500, "图片 URL 过长").optional(), // 保留单张兼容
  publishedAt: z.string().optional(),
  startedAt: z.string().optional(), // 可选，如果有 repoPath 则自动从 GitHub 获取
  completedAt: z.string().optional(),
});
export type CreateProject = z.infer<typeof CreateProjectSchema>;
registerSchema("CreateProject", CreateProjectSchema);

export const CreateProjectResultSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  syncResult: z
    .object({
      success: z.boolean(),
      error: z.string().optional(),
      stars: z.number().int().optional(),
      forks: z.number().int().optional(),
    })
    .optional(),
});
export type CreateProjectResult = z.infer<typeof CreateProjectResultSchema>;

export const CreateProjectSuccessResponseSchema = createSuccessResponseSchema(
  CreateProjectResultSchema,
);
export type CreateProjectSuccessResponse = z.infer<
  typeof CreateProjectSuccessResponseSchema
>;
registerSchema(
  "CreateProjectSuccessResponse",
  CreateProjectSuccessResponseSchema,
);

/*
    updateProject() Schema - 更新单个项目
*/
export const UpdateProjectSchema = z.object({
  access_token: z.string().optional(),
  slug: z.string().min(1, "slug 不能为空"),
  title: z.string().min(1, "标题不能为空").max(200, "标题过长").optional(),
  newSlug: z.string().max(200, "slug 过长").optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  demoUrl: z.string().max(500, "Demo URL 过长").optional(),
  repoUrl: z.string().max(500, "仓库 URL 过长").optional(),
  urls: z.array(z.string().max(500, "URL 过长")).optional(),
  techStack: z.array(z.string()).optional(),
  repoPath: z
    .string()
    .max(100, "仓库路径过长")
    .regex(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/, "仓库路径格式不正确")
    .optional()
    .nullable(),
  license: z.string().max(100, "License 过长").optional().nullable(),
  enableGithubSync: z.boolean().optional(),
  enableConentSync: z.boolean().optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "DEVELOPING"]).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  metaDescription: z.string().max(160).optional().nullable(),
  metaKeywords: z.string().max(255).optional().nullable(),
  robotsIndex: z.boolean().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  featuredImages: z.array(z.string().max(500, "图片 URL 过长")).optional(), // 支持多张特色图片
  featuredImage: z.string().max(500, "图片 URL 过长").optional(), // 保留单张兼容
  publishedAt: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
});
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;
registerSchema("UpdateProject", UpdateProjectSchema);

export const UpdateProjectResultSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
});
export type UpdateProjectResult = z.infer<typeof UpdateProjectResultSchema>;

export const UpdateProjectSuccessResponseSchema = createSuccessResponseSchema(
  UpdateProjectResultSchema,
);
export type UpdateProjectSuccessResponse = z.infer<
  typeof UpdateProjectSuccessResponseSchema
>;
registerSchema(
  "UpdateProjectSuccessResponse",
  UpdateProjectSuccessResponseSchema,
);

/*
    updateProjects() Schema - 批量更新项目
*/
export const UpdateProjectsSchema = z.object({
  access_token: z.string().optional(),
  ids: z.array(z.number().int().positive()).min(1, "必须提供至少一个项目 ID"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "DEVELOPING"]).optional(),
  enableGithubSync: z.boolean().optional(),
  enableConentSync: z.boolean().optional(),
});
export type UpdateProjects = z.infer<typeof UpdateProjectsSchema>;
registerSchema("UpdateProjects", UpdateProjectsSchema);

export const UpdateProjectsResultSchema = z.object({
  updated: z.number().int().nonnegative(),
});
export type UpdateProjectsResult = z.infer<typeof UpdateProjectsResultSchema>;

export const UpdateProjectsSuccessResponseSchema = createSuccessResponseSchema(
  UpdateProjectsResultSchema,
);
export type UpdateProjectsSuccessResponse = z.infer<
  typeof UpdateProjectsSuccessResponseSchema
>;
registerSchema(
  "UpdateProjectsSuccessResponse",
  UpdateProjectsSuccessResponseSchema,
);

/*
    deleteProjects() Schema
*/
export const DeleteProjectsSchema = z.object({
  access_token: z.string().optional(),
  ids: z.array(z.number().int().positive()).min(1, "必须提供至少一个项目 ID"),
});
export type DeleteProjects = z.infer<typeof DeleteProjectsSchema>;
registerSchema("DeleteProjects", DeleteProjectsSchema);

export const DeleteProjectsResultSchema = z.object({
  deleted: z.number().int().nonnegative(),
});
export type DeleteProjectsResult = z.infer<typeof DeleteProjectsResultSchema>;

export const DeleteProjectsSuccessResponseSchema = createSuccessResponseSchema(
  DeleteProjectsResultSchema,
);
export type DeleteProjectsSuccessResponse = z.infer<
  typeof DeleteProjectsSuccessResponseSchema
>;
registerSchema(
  "DeleteProjectsSuccessResponse",
  DeleteProjectsSuccessResponseSchema,
);

/*
    syncProjectsGithub() Schema - GitHub 同步
*/
export const SyncProjectsGithubSchema = z.object({
  access_token: z.string().optional(),
  ids: z.array(z.number().int().positive()).optional(), // 不传则同步所有启用的项目
});
export type SyncProjectsGithub = z.infer<typeof SyncProjectsGithubSchema>;
registerSchema("SyncProjectsGithub", SyncProjectsGithubSchema);

export const SyncProjectsGithubResultSchema = z.object({
  synced: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  results: z.array(
    z.object({
      id: z.number().int(),
      slug: z.string(),
      success: z.boolean(),
      error: z.string().optional(),
      stars: z.number().int().optional(),
      forks: z.number().int().optional(),
    }),
  ),
});
export type SyncProjectsGithubResult = z.infer<
  typeof SyncProjectsGithubResultSchema
>;

export const SyncProjectsGithubSuccessResponseSchema =
  createSuccessResponseSchema(SyncProjectsGithubResultSchema);
export type SyncProjectsGithubSuccessResponse = z.infer<
  typeof SyncProjectsGithubSuccessResponseSchema
>;
registerSchema(
  "SyncProjectsGithubSuccessResponse",
  SyncProjectsGithubSuccessResponseSchema,
);

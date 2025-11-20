import { z } from "zod";
import {
  createSuccessResponseSchema,
  createPaginatedResponseSchema,
  registerSchema,
} from "./common.js";

// ============================================================================
// Storage Provider 相关类型定义
// ============================================================================

export const StorageProviderTypeSchema = z.enum([
  "LOCAL",
  "AWS_S3",
  "GITHUB_PAGES",
  "VERCEL_BLOB",
]);

export type StorageProviderType = z.infer<typeof StorageProviderTypeSchema>;

// ============================================================================
// Get Storage List
// ============================================================================

export const GetStorageListSchema = z.object({
  access_token: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
  sortBy: z
    .enum(["id", "name", "type", "createdAt", "updatedAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  type: z.enum(["LOCAL", "AWS_S3", "GITHUB_PAGES", "VERCEL_BLOB"]).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export type GetStorageList = z.infer<typeof GetStorageListSchema>;

export const StorageListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["LOCAL", "AWS_S3", "GITHUB_PAGES", "VERCEL_BLOB"]),
  displayName: z.string(),
  baseUrl: z.string(),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  maxFileSize: z.number(),
  pathTemplate: z.string(),
  mediaCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type StorageListItem = z.infer<typeof StorageListItemSchema>;

// ============================================================================
// Get Storage Detail
// ============================================================================

export const GetStorageDetailSchema = z.object({
  access_token: z.string().optional(),
  id: z.string().uuid(),
});

export type GetStorageDetail = z.infer<typeof GetStorageDetailSchema>;

export const StorageDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["LOCAL", "AWS_S3", "GITHUB_PAGES", "VERCEL_BLOB"]),
  displayName: z.string(),
  baseUrl: z.string(),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  maxFileSize: z.number(),
  pathTemplate: z.string(),
  config: z.any(),
  mediaCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type StorageDetail = z.infer<typeof StorageDetailSchema>;

// ============================================================================
// Create Storage
// ============================================================================

export const CreateStorageSchema = z.object({
  access_token: z.string().optional(),
  name: z.string().min(1).max(50),
  type: z
    .enum(["LOCAL", "AWS_S3", "GITHUB_PAGES", "VERCEL_BLOB"])
    .default("LOCAL"),
  displayName: z.string().min(1).max(100),
  baseUrl: z.string().min(1).max(255),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  maxFileSize: z.number().int().min(0).default(52428800),
  pathTemplate: z.string().default("/{year}/{month}/{filename}"),
  config: z.any().optional(),
});

export type CreateStorage = z.infer<typeof CreateStorageSchema>;

export const CreateStorageResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["LOCAL", "AWS_S3", "GITHUB_PAGES", "VERCEL_BLOB"]),
  displayName: z.string(),
  baseUrl: z.string(),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  maxFileSize: z.number(),
  pathTemplate: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CreateStorageResponse = z.infer<typeof CreateStorageResponseSchema>;

// ============================================================================
// Update Storage
// ============================================================================

export const UpdateStorageSchema = z.object({
  access_token: z.string().optional(),
  id: z.string().uuid(),
  name: z.string().min(1).max(50).optional(),
  displayName: z.string().min(1).max(100).optional(),
  baseUrl: z.string().min(1).max(255).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  maxFileSize: z.number().int().min(0).optional(),
  pathTemplate: z.string().optional(),
  config: z.any().optional(),
});

export type UpdateStorage = z.infer<typeof UpdateStorageSchema>;

export const UpdateStorageResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["LOCAL", "AWS_S3", "GITHUB_PAGES", "VERCEL_BLOB"]),
  displayName: z.string(),
  baseUrl: z.string(),
  isActive: z.boolean(),
  isDefault: z.boolean(),
  maxFileSize: z.number(),
  pathTemplate: z.string(),
  config: z.any(),
  updatedAt: z.string(),
});

export type UpdateStorageResponse = z.infer<typeof UpdateStorageResponseSchema>;

// ============================================================================
// Delete Storage
// ============================================================================

export const DeleteStorageSchema = z.object({
  access_token: z.string().optional(),
  ids: z.array(z.string().uuid()).min(1),
});

export type DeleteStorage = z.infer<typeof DeleteStorageSchema>;

export const DeleteStorageResponseSchema = z.object({
  deleted: z.number(),
  ids: z.array(z.string()),
});

export type DeleteStorageResponse = z.infer<typeof DeleteStorageResponseSchema>;

// ============================================================================
// Toggle Storage Status
// ============================================================================

export const ToggleStorageStatusSchema = z.object({
  access_token: z.string().optional(),
  id: z.string().uuid(),
  isActive: z.boolean(),
});

export type ToggleStorageStatus = z.infer<typeof ToggleStorageStatusSchema>;

export const ToggleStorageStatusResponseSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
  updatedAt: z.string(),
});

export type ToggleStorageStatusResponse = z.infer<
  typeof ToggleStorageStatusResponseSchema
>;

// ============================================================================
// Set Default Storage
// ============================================================================

export const SetDefaultStorageSchema = z.object({
  access_token: z.string().optional(),
  id: z.string().uuid(),
});

export type SetDefaultStorage = z.infer<typeof SetDefaultStorageSchema>;

export const SetDefaultStorageResponseSchema = z.object({
  id: z.string(),
  isDefault: z.boolean(),
  updatedAt: z.string(),
});

export type SetDefaultStorageResponse = z.infer<
  typeof SetDefaultStorageResponseSchema
>;

// ============================================================================
// Get Storage Stats
// ============================================================================

export const GetStorageStatsSchema = z.object({
  access_token: z.string().optional(),
  force: z.boolean().optional(),
});

export type GetStorageStats = z.infer<typeof GetStorageStatsSchema>;

export const GetStorageStatsSuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    updatedAt: z.string(),
    cache: z.boolean(),
    total: z.object({
      total: z.number(),
      active: z.number(),
      inactive: z.number(),
      default: z.number(),
    }),
    byType: z.array(
      z.object({
        type: z.enum(["LOCAL", "AWS_S3", "GITHUB_PAGES", "VERCEL_BLOB"]),
        count: z.number(),
        active: z.number(),
        mediaCount: z.number(),
      }),
    ),
    storage: z.object({
      totalProviders: z.number(),
      activeProviders: z.number(),
      totalMediaFiles: z.number(),
      averageFileSize: z.number(),
    }),
  }),
);

export type GetStorageStatsSuccessResponse = z.infer<
  typeof GetStorageStatsSuccessResponseSchema
>;

// ============================================================================
// API Response Types
// ============================================================================

export const GetStorageListResponseSchema = createPaginatedResponseSchema(
  z.array(StorageListItemSchema),
);

export type GetStorageListResponse = z.infer<
  typeof GetStorageListResponseSchema
>;

export const GetStorageDetailResponseSchema =
  createSuccessResponseSchema(StorageDetailSchema);

export type GetStorageDetailResponse = z.infer<
  typeof GetStorageDetailResponseSchema
>;

export const CreateStorageResponseWrapperSchema = createSuccessResponseSchema(
  CreateStorageResponseSchema,
);

export type CreateStorageResponseWrapper = z.infer<
  typeof CreateStorageResponseWrapperSchema
>;

export const UpdateStorageResponseWrapperSchema = createSuccessResponseSchema(
  UpdateStorageResponseSchema,
);

export type UpdateStorageResponseWrapper = z.infer<
  typeof UpdateStorageResponseWrapperSchema
>;

export const DeleteStorageResponseWrapperSchema = createSuccessResponseSchema(
  DeleteStorageResponseSchema,
);

export type DeleteStorageResponseWrapper = z.infer<
  typeof DeleteStorageResponseWrapperSchema
>;

export const ToggleStorageStatusResponseWrapperSchema =
  createSuccessResponseSchema(ToggleStorageStatusResponseSchema);

export type ToggleStorageStatusResponseWrapper = z.infer<
  typeof ToggleStorageStatusResponseWrapperSchema
>;

export const SetDefaultStorageResponseWrapperSchema =
  createSuccessResponseSchema(SetDefaultStorageResponseSchema);

export type SetDefaultStorageResponseWrapper = z.infer<
  typeof SetDefaultStorageResponseWrapperSchema
>;

export const GetStorageStatsResponseSchema = createSuccessResponseSchema(
  GetStorageStatsSuccessResponseSchema,
);

export type GetStorageStatsResponse = z.infer<
  typeof GetStorageStatsResponseSchema
>;

// ============================================================================
// Schema Registration
// ============================================================================

registerSchema("GetStorageList", GetStorageListSchema);
registerSchema("GetStorageDetail", GetStorageDetailSchema);
registerSchema("CreateStorage", CreateStorageSchema);
registerSchema("UpdateStorage", UpdateStorageSchema);
registerSchema("DeleteStorage", DeleteStorageSchema);
registerSchema("ToggleStorageStatus", ToggleStorageStatusSchema);
registerSchema("SetDefaultStorage", SetDefaultStorageSchema);
registerSchema("GetStorageStats", GetStorageStatsSchema);
registerSchema("StorageListItem", StorageListItemSchema);
registerSchema("StorageDetail", StorageDetailSchema);
registerSchema("CreateStorageResponse", CreateStorageResponseSchema);
registerSchema("UpdateStorageResponse", UpdateStorageResponseSchema);
registerSchema("DeleteStorageResponse", DeleteStorageResponseSchema);
registerSchema(
  "ToggleStorageStatusResponse",
  ToggleStorageStatusResponseSchema,
);
registerSchema("SetDefaultStorageResponse", SetDefaultStorageResponseSchema);
registerSchema(
  "GetStorageStatsSuccessResponse",
  GetStorageStatsSuccessResponseSchema,
);

import { z } from "zod";
import {
  createSuccessResponseSchema,
  createPaginatedResponseSchema,
  registerSchema,
} from "./common.js";

// ============================================================================
// Media 相关类型定义
// ============================================================================

export const MediaTypeSchema = z.enum(["IMAGE", "VIDEO", "AUDIO", "FILE"]);

export type MediaType = z.infer<typeof MediaTypeSchema>;

export const GallerySizeSchema = z.enum([
  "SQUARE",
  "TALL",
  "WIDE",
  "LARGE",
  "AUTO",
]);

export type GallerySize = z.infer<typeof GallerySizeSchema>;

const PersistentPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .refine(
    (value) => {
      const normalized = value.replace(/\\/g, "/");
      if (normalized.startsWith("/") || normalized.endsWith("/")) {
        return false;
      }
      const segments = normalized.split("/");
      return segments.every(
        (segment) => segment.length > 0 && segment !== "." && segment !== "..",
      );
    },
    {
      message: "持久化路径必须是相对路径，且不能包含 . 或 .. 段",
    },
  );

export const PhotoSchema = z.object({
  id: z.number(),
  slug: z.string(),
  name: z.string(),
  size: GallerySizeSchema,
  description: z.string().nullable(),
  showExif: z.boolean(),
  hideGPS: z.boolean(),
  overrideExif: z.any().nullable(),
  mediaId: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  shotAt: z.string().nullable(),
  sortTime: z.string(),
});

export type Photo = z.infer<typeof PhotoSchema>;

// ============================================================================
// Get Media List
// ============================================================================

export const GetMediaListSchema = z.object({
  access_token: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(500).default(25),
  sortBy: z
    .enum(["id", "createdAt", "size", "originalName", "referencesCount"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  search: z.string().optional(),
  mediaType: z.enum(["IMAGE", "VIDEO", "AUDIO", "FILE"]).optional(),
  userUid: z.number().int().positive().optional(),
  sizeMin: z.number().int().min(0).optional(),
  sizeMax: z.number().int().min(0).optional(),
  inGallery: z.boolean().optional(),
  isOptimized: z.boolean().optional(),
  createdAtStart: z.string().optional(),
  createdAtEnd: z.string().optional(),
  hasReferences: z.boolean().optional(), // 新增：筛选是否有引用
  folderId: z.number().int().positive().nullable().optional(), // 新增：文件夹筛选
});

export type GetMediaList = z.infer<typeof GetMediaListSchema>;

export const MediaListItemSchema = z.object({
  id: z.number(),
  fileName: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  imageId: z.string(), // 12位带签名的图片ID
  shortHash: z.string(),
  mediaType: z.enum(["IMAGE", "VIDEO", "AUDIO", "FILE"]),
  size: z.number(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  altText: z.string().nullable(),
  blur: z.string().nullable(),
  inGallery: z.boolean(),
  createdAt: z.string(),
  postsCount: z.number(), // 关联文章数量
  folderId: z.number().int().positive().nullable().optional(),
  folder: z
    .object({
      id: z.number(),
      name: z.string(),
    })
    .nullable()
    .optional(),
  user: z
    .object({
      uid: z.number(),
      username: z.string(),
      nickname: z.string().nullable(),
    })
    .nullable(),
});

export type MediaListItem = z.infer<typeof MediaListItemSchema>;

// ============================================================================
// Get Media Detail
// ============================================================================

export const GetMediaDetailSchema = z.object({
  access_token: z.string().optional(),
  id: z.number().int().positive(),
});

export type GetMediaDetail = z.infer<typeof GetMediaDetailSchema>;

export const MediaDetailSchema = z.object({
  id: z.number(),
  fileName: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  shortHash: z.string(),
  imageId: z.string(), // 12位带签名的图片ID
  hash: z.string(),
  mediaType: z.enum(["IMAGE", "VIDEO", "AUDIO", "FILE"]),
  width: z.number().nullable(),
  height: z.number().nullable(),
  altText: z.string().nullable(),
  blur: z.string().nullable(),
  thumbnails: z.any().nullable(),
  exif: z.any().nullable(),
  inGallery: z.boolean(),
  galleryPhoto: PhotoSchema.nullable().optional(),
  isOptimized: z.boolean(),
  storageUrl: z.string(),
  persistentPath: PersistentPathSchema.nullable().optional(),
  createdAt: z.string(),
  storageProviderId: z.string(),
  folderId: z.number().int().positive().nullable().optional(),
  folder: z
    .object({
      id: z.number(),
      name: z.string(),
      path: z.string(),
      pathNodes: z
        .array(
          z.object({
            id: z.number(),
            name: z.string(),
          }),
        )
        .optional(),
    })
    .nullable()
    .optional(),
  user: z
    .object({
      uid: z.number(),
      username: z.string(),
      nickname: z.string().nullable(),
    })
    .nullable(),
  storageProvider: z
    .object({
      id: z.string(),
      name: z.string(),
      displayName: z.string(),
    })
    .nullable(),
  // 引用信息 - 包含所有类型的引用
  references: z.object({
    posts: z.array(
      z.object({
        id: z.number(),
        title: z.string(),
        slug: z.string(),
        slot: z.string(), // 引用位置：featuredImage/contentImage
      }),
    ),
    pages: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        slug: z.string(),
        slot: z.string(), // 引用位置：featuredImage/contentImage
      }),
    ),
    tags: z.array(
      z.object({
        slug: z.string(),
        name: z.string(),
        slot: z.string(), // 引用位置：featuredImage
      }),
    ),
    categories: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        slug: z.string(),
        slot: z.string(), // 引用位置：featuredImage
      }),
    ),
  }),
});

export type MediaDetail = z.infer<typeof MediaDetailSchema>;

// ============================================================================
// Update Media
// ============================================================================

export const UpdateMediaSchema = z.object({
  access_token: z.string().optional(),
  id: z.number().int().positive(),
  originalName: z.string().min(1).max(255).optional(),
  altText: z.string().max(255).nullable().optional(),
  persistentPath: PersistentPathSchema.nullable().optional(),
  inGallery: z.boolean().optional(),
  // Gallery fields
  name: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  gallerySize: GallerySizeSchema.optional(),
  showExif: z.boolean().optional(),
  hideGPS: z.boolean().optional(),
  overrideExif: z.any().optional(),
});

export type UpdateMedia = z.infer<typeof UpdateMediaSchema>;

export const UpdateMediaResponseSchema = z.object({
  id: z.number(),
  originalName: z.string(),
  altText: z.string().nullable(),
  persistentPath: z.string().nullable().optional(),
  inGallery: z.boolean(),
  updatedAt: z.string(),
});

export type UpdateMediaResponse = z.infer<typeof UpdateMediaResponseSchema>;

// ============================================================================
// Batch Update Media
// ============================================================================

export const BatchUpdateMediaSchema = z.object({
  access_token: z.string().optional(),
  ids: z.array(z.number().int().positive()).min(1),
  inGallery: z.boolean().optional(),
  isOptimized: z.boolean().optional(),
});

export type BatchUpdateMedia = z.infer<typeof BatchUpdateMediaSchema>;

export const BatchUpdateMediaResponseSchema = z.object({
  updated: z.number(),
  ids: z.array(z.number()),
});

export type BatchUpdateMediaResponse = z.infer<
  typeof BatchUpdateMediaResponseSchema
>;

// ============================================================================
// Delete Media
// ============================================================================

export const DeleteMediaSchema = z.object({
  access_token: z.string().optional(),
  ids: z.array(z.number().int().positive()).min(1),
});

export type DeleteMedia = z.infer<typeof DeleteMediaSchema>;

export const DeleteMediaResponseSchema = z.object({
  deleted: z.number(),
  ids: z.array(z.number()),
});

export type DeleteMediaResponse = z.infer<typeof DeleteMediaResponseSchema>;

// ============================================================================
// Get Media Stats
// ============================================================================

export const GetMediaStatsSchema = z.object({
  access_token: z.string().optional(),
  days: z.number().int().min(1).max(365).default(30),
  force: z.boolean().default(false),
});

export type GetMediaStats = z.infer<typeof GetMediaStatsSchema>;

export const MediaStatsSchema = z.object({
  updatedAt: z.string(),
  cache: z.boolean(),
  totalFiles: z.number(),
  totalSize: z.number(),
  typeDistribution: z.array(
    z.object({
      type: z.enum(["IMAGE", "VIDEO", "AUDIO", "FILE"]),
      count: z.number(),
      size: z.number(),
    }),
  ),
  dailyStats: z.array(
    z.object({
      date: z.string(),
      totalFiles: z.number(),
      newFiles: z.number(),
      totalSize: z.number(),
    }),
  ),
});

export type MediaStats = z.infer<typeof MediaStatsSchema>;

// ============================================================================
// Get Media Trends
// ============================================================================

export const GetMediaTrendsSchema = z.object({
  access_token: z.string().optional(),
  days: z.number().int().min(1).max(365).default(30),
  count: z.number().int().min(1).max(100).default(30),
});

export type GetMediaTrends = z.infer<typeof GetMediaTrendsSchema>;

export const MediaTrendItemSchema = z.object({
  time: z.string(),
  data: z.object({
    total: z.number(),
    new: z.number(),
  }),
});

export type MediaTrendItem = z.infer<typeof MediaTrendItemSchema>;

// ============================================================================
// API Response Types
// ============================================================================

export const GetMediaListResponseSchema = createPaginatedResponseSchema(
  z.array(MediaListItemSchema),
);

export type GetMediaListResponse = z.infer<typeof GetMediaListResponseSchema>;

export const GetMediaDetailResponseSchema =
  createSuccessResponseSchema(MediaDetailSchema);

export type GetMediaDetailResponse = z.infer<
  typeof GetMediaDetailResponseSchema
>;

export const UpdateMediaResponseWrapperSchema = createSuccessResponseSchema(
  UpdateMediaResponseSchema,
);

export type UpdateMediaResponseWrapper = z.infer<
  typeof UpdateMediaResponseWrapperSchema
>;

export const DeleteMediaResponseWrapperSchema = createSuccessResponseSchema(
  DeleteMediaResponseSchema,
);

export type DeleteMediaResponseWrapper = z.infer<
  typeof DeleteMediaResponseWrapperSchema
>;

export const BatchUpdateMediaResponseWrapperSchema =
  createSuccessResponseSchema(BatchUpdateMediaResponseSchema);

export type BatchUpdateMediaResponseWrapper = z.infer<
  typeof BatchUpdateMediaResponseWrapperSchema
>;

export const GetMediaStatsResponseSchema =
  createSuccessResponseSchema(MediaStatsSchema);

export type GetMediaStatsResponse = z.infer<typeof GetMediaStatsResponseSchema>;

export const GetMediaTrendsResponseSchema = createSuccessResponseSchema(
  z.array(MediaTrendItemSchema),
);

export type GetMediaTrendsResponse = z.infer<
  typeof GetMediaTrendsResponseSchema
>;

// ============================================================================
// Schema Registration
// ============================================================================

registerSchema("GetMediaList", GetMediaListSchema);
registerSchema("GetMediaDetail", GetMediaDetailSchema);
registerSchema("UpdateMedia", UpdateMediaSchema);
registerSchema("BatchUpdateMedia", BatchUpdateMediaSchema);
registerSchema("DeleteMedia", DeleteMediaSchema);
registerSchema("GetMediaStats", GetMediaStatsSchema);
registerSchema("GetMediaTrends", GetMediaTrendsSchema);
registerSchema("MediaListItem", MediaListItemSchema);
registerSchema("MediaDetail", MediaDetailSchema);
registerSchema("MediaStats", MediaStatsSchema);
registerSchema("MediaTrendItem", MediaTrendItemSchema);

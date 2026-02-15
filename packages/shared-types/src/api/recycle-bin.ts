import { z } from "zod";
import {
  createPaginatedResponseSchema,
  createSuccessResponseSchema,
  registerSchema,
} from "./common.js";

export const RecycleBinResourceTypeSchema = z.enum([
  "PROJECT",
  "FRIEND_LINK",
  "POST",
  "PAGE",
  "COMMENT",
  "USER",
  "MESSAGE",
]);
export type RecycleBinResourceType = z.infer<
  typeof RecycleBinResourceTypeSchema
>;

export const RecycleBinSortBySchema = z.enum([
  "deletedAt",
  "createdAt",
  "resourceType",
  "resourceName",
]);
export type RecycleBinSortBy = z.infer<typeof RecycleBinSortBySchema>;

export const RecycleBinListItemSchema = z
  .object({
    key: z.string(),
    resourceType: RecycleBinResourceTypeSchema,
    resourceTypeLabel: z.string(),
    id: z.union([z.number().int().positive(), z.string().min(1)]),
    resourceName: z.string(),
    resourceReference: z.string().nullable(),
    createdAt: z.string(),
    deletedAt: z.string(),
    deletedByUid: z.number().int().nullable(),
    deletedByName: z.string(),
  })
  .catchall(z.unknown());
export type RecycleBinListItem = z.infer<typeof RecycleBinListItemSchema>;

export const RecycleBinStatsTypeItemSchema = z.object({
  resourceType: RecycleBinResourceTypeSchema,
  label: z.string(),
  count: z.number().int().nonnegative(),
  percentage: z.number().min(0),
});
export type RecycleBinStatsTypeItem = z.infer<
  typeof RecycleBinStatsTypeItemSchema
>;

export const RecycleBinStatsDataSchema = z.object({
  updatedAt: z.string(),
  total: z.number().int().nonnegative(),
  recent: z.object({
    last7Days: z.number().int().nonnegative(),
    last30Days: z.number().int().nonnegative(),
  }),
  types: z.array(RecycleBinStatsTypeItemSchema),
});
export type RecycleBinStatsData = z.infer<typeof RecycleBinStatsDataSchema>;

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export const GetRecycleBinListSchema = z.object({
  access_token: z.string().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  search: z.string().max(100).optional(),
  sortBy: RecycleBinSortBySchema.optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  resourceTypes: z.array(RecycleBinResourceTypeSchema).optional(),
  createdAtStart: z.string().regex(datePattern).optional(),
  createdAtEnd: z.string().regex(datePattern).optional(),
  deletedAtStart: z.string().regex(datePattern).optional(),
  deletedAtEnd: z.string().regex(datePattern).optional(),
});
export type GetRecycleBinList = z.infer<typeof GetRecycleBinListSchema>;
registerSchema("GetRecycleBinList", GetRecycleBinListSchema);

export const GetRecycleBinListSuccessResponseSchema =
  createPaginatedResponseSchema(z.array(RecycleBinListItemSchema));
export type GetRecycleBinListSuccessResponse = z.infer<
  typeof GetRecycleBinListSuccessResponseSchema
>;
registerSchema(
  "GetRecycleBinListSuccessResponse",
  GetRecycleBinListSuccessResponseSchema,
);

export const GetRecycleBinStatsSchema = z.object({
  access_token: z.string().optional(),
  force: z.boolean().optional(),
  resourceTypes: z.array(RecycleBinResourceTypeSchema).optional(),
});
export type GetRecycleBinStats = z.infer<typeof GetRecycleBinStatsSchema>;
registerSchema("GetRecycleBinStats", GetRecycleBinStatsSchema);

export const GetRecycleBinStatsSuccessResponseSchema =
  createSuccessResponseSchema(RecycleBinStatsDataSchema);
export type GetRecycleBinStatsSuccessResponse = z.infer<
  typeof GetRecycleBinStatsSuccessResponseSchema
>;
registerSchema(
  "GetRecycleBinStatsSuccessResponse",
  GetRecycleBinStatsSuccessResponseSchema,
);

export const RecycleBinMutationItemSchema = z.object({
  resourceType: RecycleBinResourceTypeSchema,
  id: z.union([z.number().int().positive(), z.string().min(1)]),
});
export type RecycleBinMutationItem = z.infer<
  typeof RecycleBinMutationItemSchema
>;

export const RestoreRecycleBinItemsSchema = z.object({
  access_token: z.string().optional(),
  items: z.array(RecycleBinMutationItemSchema).min(1).max(200),
});
export type RestoreRecycleBinItems = z.infer<
  typeof RestoreRecycleBinItemsSchema
>;
registerSchema("RestoreRecycleBinItems", RestoreRecycleBinItemsSchema);

export const RestoreRecycleBinItemsResultSchema = z.object({
  restored: z.number().int().nonnegative(),
  byType: z.array(
    z.object({
      resourceType: RecycleBinResourceTypeSchema,
      count: z.number().int().nonnegative(),
    }),
  ),
});
export type RestoreRecycleBinItemsResult = z.infer<
  typeof RestoreRecycleBinItemsResultSchema
>;

export const RestoreRecycleBinItemsSuccessResponseSchema =
  createSuccessResponseSchema(RestoreRecycleBinItemsResultSchema);
export type RestoreRecycleBinItemsSuccessResponse = z.infer<
  typeof RestoreRecycleBinItemsSuccessResponseSchema
>;
registerSchema(
  "RestoreRecycleBinItemsSuccessResponse",
  RestoreRecycleBinItemsSuccessResponseSchema,
);

export const PurgeRecycleBinItemsSchema = z.object({
  access_token: z.string().optional(),
  items: z.array(RecycleBinMutationItemSchema).min(1).max(200),
});
export type PurgeRecycleBinItems = z.infer<typeof PurgeRecycleBinItemsSchema>;
registerSchema("PurgeRecycleBinItems", PurgeRecycleBinItemsSchema);

export const PurgeRecycleBinItemsResultSchema = z.object({
  deleted: z.number().int().nonnegative(),
  byType: z.array(
    z.object({
      resourceType: RecycleBinResourceTypeSchema,
      count: z.number().int().nonnegative(),
    }),
  ),
});
export type PurgeRecycleBinItemsResult = z.infer<
  typeof PurgeRecycleBinItemsResultSchema
>;

export const PurgeRecycleBinItemsSuccessResponseSchema =
  createSuccessResponseSchema(PurgeRecycleBinItemsResultSchema);
export type PurgeRecycleBinItemsSuccessResponse = z.infer<
  typeof PurgeRecycleBinItemsSuccessResponseSchema
>;
registerSchema(
  "PurgeRecycleBinItemsSuccessResponse",
  PurgeRecycleBinItemsSuccessResponseSchema,
);

export const RestoreAllProjectsFromRecycleBinSchema = z.object({
  access_token: z.string().optional(),
});
export type RestoreAllProjectsFromRecycleBin = z.infer<
  typeof RestoreAllProjectsFromRecycleBinSchema
>;
registerSchema(
  "RestoreAllProjectsFromRecycleBin",
  RestoreAllProjectsFromRecycleBinSchema,
);

export const RestoreAllProjectsFromRecycleBinResultSchema = z.object({
  restored: z.number().int().nonnegative(),
});
export type RestoreAllProjectsFromRecycleBinResult = z.infer<
  typeof RestoreAllProjectsFromRecycleBinResultSchema
>;

export const RestoreAllProjectsFromRecycleBinSuccessResponseSchema =
  createSuccessResponseSchema(RestoreAllProjectsFromRecycleBinResultSchema);
export type RestoreAllProjectsFromRecycleBinSuccessResponse = z.infer<
  typeof RestoreAllProjectsFromRecycleBinSuccessResponseSchema
>;
registerSchema(
  "RestoreAllProjectsFromRecycleBinSuccessResponse",
  RestoreAllProjectsFromRecycleBinSuccessResponseSchema,
);

export const ClearRecycleBinSchema = z.object({
  access_token: z.string().optional(),
  resourceTypes: z.array(RecycleBinResourceTypeSchema).optional(),
});
export type ClearRecycleBin = z.infer<typeof ClearRecycleBinSchema>;
registerSchema("ClearRecycleBin", ClearRecycleBinSchema);

export const ClearRecycleBinResultSchema = z.object({
  deleted: z.number().int().nonnegative(),
  byType: z.array(
    z.object({
      resourceType: RecycleBinResourceTypeSchema,
      count: z.number().int().nonnegative(),
    }),
  ),
});
export type ClearRecycleBinResult = z.infer<typeof ClearRecycleBinResultSchema>;

export const ClearRecycleBinSuccessResponseSchema = createSuccessResponseSchema(
  ClearRecycleBinResultSchema,
);
export type ClearRecycleBinSuccessResponse = z.infer<
  typeof ClearRecycleBinSuccessResponseSchema
>;
registerSchema(
  "ClearRecycleBinSuccessResponse",
  ClearRecycleBinSuccessResponseSchema,
);

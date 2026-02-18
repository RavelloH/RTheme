import { z } from "zod";
import { createSuccessResponseSchema, registerSchema } from "./common.js";
import { CronTriggerTypeSchema } from "./cron.js";

export const CloudTriggerStatusSchema = z.enum([
  "RECEIVED",
  "DONE",
  "ERROR",
  "REJECTED",
]);
export type CloudTriggerStatus = z.infer<typeof CloudTriggerStatusSchema>;

export const CloudVerifySourceSchema = z.enum(["DOH", "JWKS", "NONE"]);
export type CloudVerifySource = z.infer<typeof CloudVerifySourceSchema>;

export const CloudConfigSchema = z.object({
  enabled: z.boolean(),
  siteId: z.string().nullable(),
  cloudBaseUrl: z.string(),
  dohDomain: z.string(),
  jwksUrl: z.string(),
  issuer: z.string(),
  audience: z.string(),
  updatedAt: z.string(),
});
export type CloudConfig = z.infer<typeof CloudConfigSchema>;

export const CloudRemoteStatusSchema = z.object({
  available: z.boolean(),
  cloudOnline: z.boolean().nullable().optional(),
  siteId: z.string().nullable().optional(),
  instanceId: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  pendingReason: z.string().nullable().optional(),
  minuteOfDay: z.number().int().nullable().optional(),
  nextRunAt: z.string().nullable().optional(),
  registeredAt: z.string().nullable().optional(),
  firstSeenAt: z.string().nullable().optional(),
  lastSyncAt: z.string().nullable().optional(),
  eventsTotal: z.number().int().nonnegative().nullable().optional(),
  eventsSuccess: z.number().int().nonnegative().nullable().optional(),
  successRate: z.number().min(0).max(1).nullable().optional(),
  message: z.string().nullable().optional(),
});
export type CloudRemoteStatus = z.infer<typeof CloudRemoteStatusSchema>;

export const CloudHistoryTelemetrySchema = z.object({
  schemaVer: z.string().nullable().optional(),
  collectedAt: z.string().nullable().optional(),
  latestStatus: z.string().nullable().optional(),
  latestDurationMs: z.number().int().nonnegative().nullable().optional(),
  doctorDurationMs: z.number().int().nonnegative().nullable().optional(),
  projectsDurationMs: z.number().int().nonnegative().nullable().optional(),
  friendsDurationMs: z.number().int().nonnegative().nullable().optional(),
  healthStatus: z.string().nullable().optional(),
  appVersion: z.string().nullable().optional(),
  verifyMs: z.number().int().nonnegative().nullable().optional(),
  tokenAgeMs: z.number().int().nonnegative().nullable().optional(),
  raw: z.unknown().optional(),
});
export type CloudHistoryTelemetry = z.infer<typeof CloudHistoryTelemetrySchema>;

export const CloudHistoryItemSchema = z.object({
  id: z.number().int().positive(),
  deliveryId: z.string(),
  triggerType: CronTriggerTypeSchema,
  requestedAt: z.string().nullable(),
  receivedAt: z.string(),
  verifyOk: z.boolean(),
  verifySource: CloudVerifySourceSchema.nullable(),
  accepted: z.boolean(),
  dedupHit: z.boolean(),
  status: CloudTriggerStatusSchema,
  message: z.string().nullable(),
  cronHistoryId: z.number().int().positive().nullable(),
  telemetry: CloudHistoryTelemetrySchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CloudHistoryItem = z.infer<typeof CloudHistoryItemSchema>;

export const CloudTrendItemSchema = z.object({
  time: z.string(),
  data: z.object({
    acceptedCount: z.number().int().nonnegative(),
    rejectedCount: z.number().int().nonnegative(),
    dedupCount: z.number().int().nonnegative(),
    verifyDohCount: z.number().int().nonnegative(),
    verifyJwksCount: z.number().int().nonnegative(),
    errorCount: z.number().int().nonnegative(),
  }),
});
export type CloudTrendItem = z.infer<typeof CloudTrendItemSchema>;

export const CloudManualSyncResultSchema = z.object({
  synced: z.boolean(),
  siteId: z.string().nullable().optional(),
  instanceId: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  pendingReason: z.string().nullable().optional(),
  minuteOfDay: z.number().int().nullable().optional(),
  nextRunAt: z.string().nullable().optional(),
  cloudActiveKid: z.string().nullable().optional(),
  syncedAt: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
});
export type CloudManualSyncResult = z.infer<typeof CloudManualSyncResultSchema>;

/*
    getCloudConfig() Schema
*/
export const GetCloudConfigSchema = z.object({
  access_token: z.string().optional(),
});
export type GetCloudConfig = z.infer<typeof GetCloudConfigSchema>;
registerSchema("GetCloudConfig", GetCloudConfigSchema);

export const GetCloudConfigSuccessResponseSchema =
  createSuccessResponseSchema(CloudConfigSchema);
export type GetCloudConfigSuccessResponse = z.infer<
  typeof GetCloudConfigSuccessResponseSchema
>;
registerSchema(
  "GetCloudConfigSuccessResponse",
  GetCloudConfigSuccessResponseSchema,
);

/*
    updateCloudConfig() Schema
*/
export const UpdateCloudConfigSchema = z
  .object({
    access_token: z.string().optional(),
    enabled: z.boolean().optional(),
    cloudBaseUrl: z.string().url().optional(),
    dohDomain: z.string().min(1).optional(),
    jwksUrl: z.string().url().optional(),
    issuer: z.string().min(1).optional(),
    audience: z.string().min(1).optional(),
  })
  .refine(
    (value) =>
      value.enabled !== undefined ||
      value.cloudBaseUrl !== undefined ||
      value.dohDomain !== undefined ||
      value.jwksUrl !== undefined ||
      value.issuer !== undefined ||
      value.audience !== undefined,
    {
      message: "必须提供至少一个配置项",
    },
  );
export type UpdateCloudConfig = z.infer<typeof UpdateCloudConfigSchema>;
registerSchema("UpdateCloudConfig", UpdateCloudConfigSchema);

export const UpdateCloudConfigSuccessResponseSchema =
  createSuccessResponseSchema(CloudConfigSchema);
export type UpdateCloudConfigSuccessResponse = z.infer<
  typeof UpdateCloudConfigSuccessResponseSchema
>;
registerSchema(
  "UpdateCloudConfigSuccessResponse",
  UpdateCloudConfigSuccessResponseSchema,
);

/*
    getCloudHistory() Schema
*/
export const GetCloudHistorySchema = z.object({
  access_token: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(500).default(25),
  sortBy: z
    .enum([
      "id",
      "receivedAt",
      "status",
      "verifySource",
      "accepted",
      "dedupHit",
      "createdAt",
    ])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  id: z.number().int().positive().optional(),
  deliveryId: z.string().optional(),
  status: CloudTriggerStatusSchema.optional(),
  verifySource: CloudVerifySourceSchema.optional(),
  accepted: z.boolean().optional(),
  dedupHit: z.boolean().optional(),
  createdAtStart: z.string().optional(),
  createdAtEnd: z.string().optional(),
});
export type GetCloudHistory = z.infer<typeof GetCloudHistorySchema>;
registerSchema("GetCloudHistory", GetCloudHistorySchema);

export const GetCloudHistorySuccessResponseSchema = createSuccessResponseSchema(
  z.array(CloudHistoryItemSchema),
);
export type GetCloudHistorySuccessResponse = z.infer<
  typeof GetCloudHistorySuccessResponseSchema
>;
registerSchema(
  "GetCloudHistorySuccessResponse",
  GetCloudHistorySuccessResponseSchema,
);

/*
    getCloudTrends() Schema
*/
export const GetCloudTrendsSchema = z.object({
  access_token: z.string().optional(),
  days: z.number().int().positive().max(365).default(30),
  count: z.number().int().positive().max(500).default(60),
});
export type GetCloudTrends = z.infer<typeof GetCloudTrendsSchema>;
registerSchema("GetCloudTrends", GetCloudTrendsSchema);

export const GetCloudTrendsSuccessResponseSchema = createSuccessResponseSchema(
  z.array(CloudTrendItemSchema),
);
export type GetCloudTrendsSuccessResponse = z.infer<
  typeof GetCloudTrendsSuccessResponseSchema
>;
registerSchema(
  "GetCloudTrendsSuccessResponse",
  GetCloudTrendsSuccessResponseSchema,
);

/*
    getCloudRemoteStatus() Schema
*/
export const GetCloudRemoteStatusSchema = z.object({
  access_token: z.string().optional(),
});
export type GetCloudRemoteStatus = z.infer<typeof GetCloudRemoteStatusSchema>;
registerSchema("GetCloudRemoteStatus", GetCloudRemoteStatusSchema);

export const GetCloudRemoteStatusSuccessResponseSchema =
  createSuccessResponseSchema(CloudRemoteStatusSchema);
export type GetCloudRemoteStatusSuccessResponse = z.infer<
  typeof GetCloudRemoteStatusSuccessResponseSchema
>;
registerSchema(
  "GetCloudRemoteStatusSuccessResponse",
  GetCloudRemoteStatusSuccessResponseSchema,
);

/*
    syncCloudNow() Schema
*/
export const SyncCloudNowSchema = z.object({
  access_token: z.string().optional(),
});
export type SyncCloudNow = z.infer<typeof SyncCloudNowSchema>;
registerSchema("SyncCloudNow", SyncCloudNowSchema);

export const SyncCloudNowSuccessResponseSchema = createSuccessResponseSchema(
  CloudManualSyncResultSchema,
);
export type SyncCloudNowSuccessResponse = z.infer<
  typeof SyncCloudNowSuccessResponseSchema
>;
registerSchema(
  "SyncCloudNowSuccessResponse",
  SyncCloudNowSuccessResponseSchema,
);

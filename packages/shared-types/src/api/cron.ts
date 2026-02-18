import { z } from "zod";
import { createSuccessResponseSchema, registerSchema } from "./common.js";

export const CronTriggerTypeSchema = z.enum(["MANUAL", "CLOUD", "AUTO"]);
export type CronTriggerType = z.infer<typeof CronTriggerTypeSchema>;

export const CronRunStatusSchema = z.enum(["OK", "PARTIAL", "ERROR"]);
export type CronRunStatus = z.infer<typeof CronRunStatusSchema>;

export const CronTaskExecutionStatusSchema = z.enum(["O", "E", "S"]);
export type CronTaskExecutionStatus = z.infer<
  typeof CronTaskExecutionStatusSchema
>;

export const CronTaskSnapshotSchema = z.object({
  e: z.boolean(),
  x: z.boolean(),
  s: CronTaskExecutionStatusSchema,
  d: z.number().int().nonnegative(),
  v: z.unknown().nullable(),
  m: z.string().nullable().optional(),
  b: z.string().optional(),
  f: z.string().optional(),
});
export type CronTaskSnapshot = z.infer<typeof CronTaskSnapshotSchema>;

export const CronAnalyticsReportModeSchema = z.enum([
  "NONE",
  "NOTICE",
  "EMAIL",
  "NOTICE_EMAIL",
]);
export type CronAnalyticsReportMode = z.infer<
  typeof CronAnalyticsReportModeSchema
>;

export const AnalyticsCronReportConfigSchema = z.object({
  mode: CronAnalyticsReportModeSchema,
  dailyEnabled: z.boolean(),
  weeklyEnabled: z.boolean(),
  monthlyEnabled: z.boolean(),
  notifyAdminUids: z.array(z.string().trim().min(1)),
});
export type AnalyticsCronReportConfig = z.infer<
  typeof AnalyticsCronReportConfigSchema
>;

export const AnalyticsCronConfigSchema = z.object({
  report: AnalyticsCronReportConfigSchema,
});
export type AnalyticsCronConfig = z.infer<typeof AnalyticsCronConfigSchema>;

export const CleanupCronConfigSchema = z.object({
  searchLogRetentionDays: z.number().int().nonnegative(),
  healthCheckRetentionDays: z.number().int().nonnegative(),
  auditLogRetentionDays: z.number().int().nonnegative(),
  cronHistoryRetentionDays: z.number().int().nonnegative(),
  cloudTriggerHistoryRetentionDays: z.number().int().nonnegative(),
  noticeRetentionDays: z.number().int().nonnegative(),
  recycleBinRetentionDays: z.number().int().nonnegative(),
  mailSubscriptionUnsubscribedRetentionDays: z.number().int().nonnegative(),
  refreshTokenExpiredRetentionDays: z.number().int().nonnegative(),
  passwordResetRetentionMinutes: z.number().int().nonnegative(),
  pushSubscriptionMarkInactiveDays: z.number().int().nonnegative(),
  pushSubscriptionDeleteInactiveDays: z.number().int().nonnegative(),
  pushSubscriptionDeleteDisabledUserDays: z.number().int().nonnegative(),
});
export type CleanupCronConfig = z.infer<typeof CleanupCronConfigSchema>;

export const CronSnapshotSchema = z.object({
  version: z.number().int().positive().default(1),
  tasks: z.object({
    doctor: CronTaskSnapshotSchema,
    projects: CronTaskSnapshotSchema,
    friends: CronTaskSnapshotSchema,
    cleanup: CronTaskSnapshotSchema,
    analytics: CronTaskSnapshotSchema,
  }),
});
export type CronSnapshot = z.infer<typeof CronSnapshotSchema>;

export const CronHistoryItemSchema = z.object({
  id: z.number().int().positive(),
  startedAt: z.string(),
  createdAt: z.string(),
  durationMs: z.number().int().nonnegative(),
  triggerType: CronTriggerTypeSchema,
  status: CronRunStatusSchema,
  totalCount: z.number().int().nonnegative(),
  enabledCount: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  snapshot: CronSnapshotSchema,
});
export type CronHistoryItem = z.infer<typeof CronHistoryItemSchema>;

/*
    triggerCron() Schema
*/
export const TriggerCronSchema = z.object({
  access_token: z.string().optional(),
  triggerType: CronTriggerTypeSchema.optional().default("MANUAL"),
});
export type TriggerCron = z.infer<typeof TriggerCronSchema>;
registerSchema("TriggerCron", TriggerCronSchema);

export const TriggerCronSuccessResponseSchema = createSuccessResponseSchema(
  CronHistoryItemSchema,
);
export type TriggerCronSuccessResponse = z.infer<
  typeof TriggerCronSuccessResponseSchema
>;
registerSchema("TriggerCronSuccessResponse", TriggerCronSuccessResponseSchema);

/*
    getCronHistory() Schema
*/
export const GetCronHistorySchema = z.object({
  access_token: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(500).default(25),
  sortBy: z
    .enum([
      "id",
      "createdAt",
      "startedAt",
      "status",
      "triggerType",
      "durationMs",
      "enabledCount",
      "successCount",
      "failedCount",
      "skippedCount",
    ])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  id: z.number().int().positive().optional(),
  status: CronRunStatusSchema.optional(),
  triggerType: CronTriggerTypeSchema.optional(),
  createdAtStart: z.string().optional(),
  createdAtEnd: z.string().optional(),
});
export type GetCronHistory = z.infer<typeof GetCronHistorySchema>;
registerSchema("GetCronHistory", GetCronHistorySchema);

export const GetCronHistorySuccessResponseSchema = createSuccessResponseSchema(
  z.array(CronHistoryItemSchema),
);
export type GetCronHistorySuccessResponse = z.infer<
  typeof GetCronHistorySuccessResponseSchema
>;
registerSchema(
  "GetCronHistorySuccessResponse",
  GetCronHistorySuccessResponseSchema,
);

/*
    getCronTrends() Schema
*/
export const GetCronTrendsSchema = z.object({
  access_token: z.string().optional(),
  days: z.number().int().positive().max(365).default(30),
  count: z.number().int().positive().max(500).default(30),
});
export type GetCronTrends = z.infer<typeof GetCronTrendsSchema>;
registerSchema("GetCronTrends", GetCronTrendsSchema);

export const CronTrendItemSchema = z.object({
  time: z.string(),
  data: z.object({
    totalDurationMs: z.number().int().nonnegative(),
    doctorDurationMs: z.number().int().nonnegative(),
    projectsDurationMs: z.number().int().nonnegative(),
    friendsDurationMs: z.number().int().nonnegative(),
    cleanupDurationMs: z.number().int().nonnegative(),
    analyticsDurationMs: z.number().int().nonnegative(),
    successCount: z.number().int().nonnegative(),
    failedCount: z.number().int().nonnegative(),
    skippedCount: z.number().int().nonnegative(),
  }),
});
export type CronTrendItem = z.infer<typeof CronTrendItemSchema>;

export const GetCronTrendsSuccessResponseSchema = createSuccessResponseSchema(
  z.array(CronTrendItemSchema),
);
export type GetCronTrendsSuccessResponse = z.infer<
  typeof GetCronTrendsSuccessResponseSchema
>;
registerSchema(
  "GetCronTrendsSuccessResponse",
  GetCronTrendsSuccessResponseSchema,
);

/*
    getCronConfig() Schema
*/
export const GetCronConfigSchema = z.object({
  access_token: z.string().optional(),
});
export type GetCronConfig = z.infer<typeof GetCronConfigSchema>;
registerSchema("GetCronConfig", GetCronConfigSchema);

export const CronConfigSchema = z.object({
  enabled: z.boolean(),
  tasks: z.object({
    doctor: z.boolean(),
    projects: z.boolean(),
    friends: z.boolean(),
    cleanup: z.boolean(),
    analytics: z.boolean(),
  }),
  cleanup: CleanupCronConfigSchema,
  analytics: AnalyticsCronConfigSchema,
  updatedAt: z.string(),
});
export type CronConfig = z.infer<typeof CronConfigSchema>;

export const GetCronConfigSuccessResponseSchema =
  createSuccessResponseSchema(CronConfigSchema);
export type GetCronConfigSuccessResponse = z.infer<
  typeof GetCronConfigSuccessResponseSchema
>;
registerSchema(
  "GetCronConfigSuccessResponse",
  GetCronConfigSuccessResponseSchema,
);

/*
    updateCronConfig() Schema
*/
export const UpdateCronConfigSchema = z
  .object({
    access_token: z.string().optional(),
    enabled: z.boolean().optional(),
    doctor: z.boolean().optional(),
    projects: z.boolean().optional(),
    friends: z.boolean().optional(),
    cleanup: z.boolean().optional(),
    analytics: z.boolean().optional(),
    searchLogRetentionDays: z.number().int().nonnegative().optional(),
    healthCheckRetentionDays: z.number().int().nonnegative().optional(),
    auditLogRetentionDays: z.number().int().nonnegative().optional(),
    cronHistoryRetentionDays: z.number().int().nonnegative().optional(),
    cloudTriggerHistoryRetentionDays: z.number().int().nonnegative().optional(),
    noticeRetentionDays: z.number().int().nonnegative().optional(),
    recycleBinRetentionDays: z.number().int().nonnegative().optional(),
    mailSubscriptionUnsubscribedRetentionDays: z
      .number()
      .int()
      .nonnegative()
      .optional(),
    refreshTokenExpiredRetentionDays: z.number().int().nonnegative().optional(),
    passwordResetRetentionMinutes: z.number().int().nonnegative().optional(),
    pushSubscriptionMarkInactiveDays: z.number().int().nonnegative().optional(),
    pushSubscriptionDeleteInactiveDays: z
      .number()
      .int()
      .nonnegative()
      .optional(),
    pushSubscriptionDeleteDisabledUserDays: z
      .number()
      .int()
      .nonnegative()
      .optional(),
    analyticsReportMode: CronAnalyticsReportModeSchema.optional(),
    analyticsReportDailyEnabled: z.boolean().optional(),
    analyticsReportWeeklyEnabled: z.boolean().optional(),
    analyticsReportMonthlyEnabled: z.boolean().optional(),
    analyticsReportNotifyAdminUids: z
      .array(z.string().trim().min(1))
      .max(500)
      .optional(),
  })
  .refine(
    (value) =>
      value.enabled !== undefined ||
      value.doctor !== undefined ||
      value.projects !== undefined ||
      value.friends !== undefined ||
      value.cleanup !== undefined ||
      value.analytics !== undefined ||
      value.searchLogRetentionDays !== undefined ||
      value.healthCheckRetentionDays !== undefined ||
      value.auditLogRetentionDays !== undefined ||
      value.cronHistoryRetentionDays !== undefined ||
      value.cloudTriggerHistoryRetentionDays !== undefined ||
      value.noticeRetentionDays !== undefined ||
      value.recycleBinRetentionDays !== undefined ||
      value.mailSubscriptionUnsubscribedRetentionDays !== undefined ||
      value.refreshTokenExpiredRetentionDays !== undefined ||
      value.passwordResetRetentionMinutes !== undefined ||
      value.pushSubscriptionMarkInactiveDays !== undefined ||
      value.pushSubscriptionDeleteInactiveDays !== undefined ||
      value.pushSubscriptionDeleteDisabledUserDays !== undefined ||
      value.analyticsReportMode !== undefined ||
      value.analyticsReportDailyEnabled !== undefined ||
      value.analyticsReportWeeklyEnabled !== undefined ||
      value.analyticsReportMonthlyEnabled !== undefined ||
      value.analyticsReportNotifyAdminUids !== undefined,
    {
      message: "必须提供至少一个配置项",
    },
  );
export type UpdateCronConfig = z.infer<typeof UpdateCronConfigSchema>;
registerSchema("UpdateCronConfig", UpdateCronConfigSchema);

export const UpdateCronConfigSuccessResponseSchema =
  createSuccessResponseSchema(CronConfigSchema);
export type UpdateCronConfigSuccessResponse = z.infer<
  typeof UpdateCronConfigSuccessResponseSchema
>;
registerSchema(
  "UpdateCronConfigSuccessResponse",
  UpdateCronConfigSuccessResponseSchema,
);

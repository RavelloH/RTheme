import { z } from "zod";
import { createSuccessResponseSchema, registerSchema } from "./common.js";

export const DoctorStatusSchema = z.enum(["OK", "WARNING", "ERROR"]);
export const DoctorTriggerTypeSchema = z.enum(["MANUAL", "AUTO", "CRON"]);
export const DoctorCheckStatusSchema = z.enum(["O", "W", "E"]);
export const DoctorCheckValueSchema = z.union([
  z.number(),
  z.string(),
  z.boolean(),
  z.null(),
]);

export const DoctorIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(["info", "warning", "error"]),
  details: z.string().optional(),
});

export const DoctorSnapshotSchema = z.object({
  checks: z.record(
    z.string(),
    z.object({
      v: DoctorCheckValueSchema,
      d: z.number().int().nonnegative(),
      s: DoctorCheckStatusSchema,
    }),
  ),
});

export const DoctorCheckDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(["info", "warning", "error"]),
  details: z.string().optional(),
  value: DoctorCheckValueSchema,
  durationMs: z.number().int().nonnegative(),
  status: DoctorCheckStatusSchema,
});
export type DoctorCheckDetail = z.infer<typeof DoctorCheckDetailSchema>;

/*
    doctor() Schema
*/
export const DoctorSchema = z.object({
  access_token: z.string().optional(),
  force: z.boolean().default(false),
});
export type Doctor = z.infer<typeof DoctorSchema>;
registerSchema("Doctor", DoctorSchema);

export const DoctorSuccessResponseSchema = createSuccessResponseSchema(
  z.object({
    createdAt: z.string(),
    startedAt: z.string(),
    durationMs: z.number().int().nonnegative(),
    triggerType: DoctorTriggerTypeSchema,
    status: DoctorStatusSchema,
    okCount: z.number().int().nonnegative(),
    warningCount: z.number().int().nonnegative(),
    errorCount: z.number().int().nonnegative(),
    issues: z.array(DoctorIssueSchema),
  }),
);
export type DoctorSuccessResponse = z.infer<typeof DoctorSuccessResponseSchema>;
registerSchema("DoctorSuccessResponse", DoctorSuccessResponseSchema);

/*
    getDoctorHistory() Schema
*/
export const GetDoctorHistorySchema = z.object({
  access_token: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(500).default(10),
  sortBy: z
    .enum([
      "id",
      "createdAt",
      "status",
      "okCount",
      "warningCount",
      "errorCount",
      "triggerType",
      "durationMs",
    ])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  // 筛选参数
  id: z.number().int().optional(),
  status: DoctorStatusSchema.optional(),
  triggerType: DoctorTriggerTypeSchema.optional(),
  okCount: z.number().int().optional(),
  errorCount: z.number().int().optional(),
  warningCount: z.number().int().optional(),
  createdAtStart: z.string().optional(),
  createdAtEnd: z.string().optional(),
});
export type GetDoctorHistory = z.infer<typeof GetDoctorHistorySchema>;
registerSchema("GetDoctorHistory", GetDoctorHistorySchema);

export const DoctorHistoryItemSchema = z.object({
  id: z.number(),
  brief: z.string().optional(),
  status: DoctorStatusSchema,
  triggerType: DoctorTriggerTypeSchema,
  durationMs: z.number().int().nonnegative(),
  startedAt: z.string(),
  createdAt: z.string(),
  okCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  checks: z.array(DoctorCheckDetailSchema),
});
export type DoctorHistoryItem = z.infer<typeof DoctorHistoryItemSchema>;

export const GetDoctorHistorySuccessResponseSchema =
  createSuccessResponseSchema(z.array(DoctorHistoryItemSchema));
export type GetDoctorHistorySuccessResponse = z.infer<
  typeof GetDoctorHistorySuccessResponseSchema
>;
registerSchema(
  "GetDoctorHistorySuccessResponse",
  GetDoctorHistorySuccessResponseSchema,
);

/*
    getDoctorTrends() Schema
*/
export const GetDoctorTrendsSchema = z.object({
  access_token: z.string().optional(),
  days: z.number().int().positive().max(365).default(30),
  count: z.number().int().positive().max(1000).default(30),
});
export type GetDoctorTrends = z.infer<typeof GetDoctorTrendsSchema>;
registerSchema("GetDoctorTrends", GetDoctorTrendsSchema);

export const DoctorTrendItemSchema = z.object({
  time: z.string(),
  data: z.object({
    info: z.number(),
    warning: z.number(),
    error: z.number(),
  }),
});
export type DoctorTrendItem = z.infer<typeof DoctorTrendItemSchema>;

export const GetDoctorTrendsSuccessResponseSchema = createSuccessResponseSchema(
  z.array(DoctorTrendItemSchema),
);
export type GetDoctorTrendsSuccessResponse = z.infer<
  typeof GetDoctorTrendsSuccessResponseSchema
>;
registerSchema(
  "GetDoctorTrendsSuccessResponse",
  GetDoctorTrendsSuccessResponseSchema,
);

import { z } from "zod";
import { createSuccessResponseSchema, registerSchema } from "./common.js";

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
    createdAt: z.iso.datetime(),
    issues: z.array(
      z.object({
        code: z.string(),
        message: z.string(),
        severity: z.enum(["info", "warning", "error"]),
        details: z.string().optional(),
      }),
    ),
  }),
);
export type DoctorSuccessResponse = z.infer<typeof DoctorSuccessResponseSchema>;
registerSchema("DcotorSuccessResponse", DoctorSuccessResponseSchema);

/*
    getDoctorHistory() Schema
*/
export const GetDoctorHistorySchema = z.object({
  access_token: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(500).default(10),
});
export type GetDoctorHistory = z.infer<typeof GetDoctorHistorySchema>;
registerSchema("GetDoctorHistory", GetDoctorHistorySchema);

export const DoctorHistoryItemSchema = z.object({
  id: z.number(),
  createdAt: z.iso.datetime(),
  issues: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
      severity: z.enum(["info", "warning", "error"]),
      details: z.string().optional(),
    }),
  ),
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

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
    createdAt: z.string().or(z.date()),
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

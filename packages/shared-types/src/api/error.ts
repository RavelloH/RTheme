import { z } from "zod";
import {
  createSuccessResponseSchema,
  createErrorResponseSchema,
  registerSchema,
} from "./common.js";

export const RateLimitErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("TOO_MANY_REQUESTS"),
    message: z.string(),
  }),
);
export type RateLimitErrorResponse = z.infer<
  typeof RateLimitErrorResponseSchema
>;
registerSchema("RateLimitErrorResponse", RateLimitErrorResponseSchema);

export const ServerErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("INTERNAL_SERVER_ERROR"),
    message: z.string(),
  }),
);
export type ServerErrorResponse = z.infer<typeof ServerErrorResponseSchema>;
registerSchema("ServerErrorResponse", ServerErrorResponseSchema);

export const UnauthorizedErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("UNAUTHORIZED"),
    message: z.string(),
  }),
);
export type UnauthorizedErrorResponse = z.infer<
  typeof UnauthorizedErrorResponseSchema
>;
registerSchema("UnauthorizedErrorResponse", UnauthorizedErrorResponseSchema);

export const ValidationErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("VALIDATION_ERROR"),
    message: z.string(),
    details: z
      .array(
        z.object({
          field: z.string(),
          message: z.string(),
        }),
      )
      .optional(),
  }),
);
export type ValidationErrorResponse = z.infer<
  typeof ValidationErrorResponseSchema
>;
registerSchema("ValidationErrorResponse", ValidationErrorResponseSchema);

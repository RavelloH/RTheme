import { z } from "zod";
import { createSuccessResponseSchema, registerSchema } from "./common.js";

/*
    getSettings() Schema
*/
export const GetSettingsSchema = z.object({
  access_token: z.string().optional(),
});
export type GetSettings = z.infer<typeof GetSettingsSchema>;
registerSchema("GetSettings", GetSettingsSchema);

export const SettingItemSchema = z.object({
  key: z.string(),
  value: z.unknown(), // JSON 类型
  description: z.string().nullable(),
  updatedAt: z.string(),
});
export type SettingItem = z.infer<typeof SettingItemSchema>;

export const GetSettingsSuccessResponseSchema = createSuccessResponseSchema(
  z.array(SettingItemSchema),
);
export type GetSettingsSuccessResponse = z.infer<
  typeof GetSettingsSuccessResponseSchema
>;
registerSchema("GetSettingsSuccessResponse", GetSettingsSuccessResponseSchema);

/*
    updateSettings() Schema
*/
export const UpdateSettingsSchema = z.object({
  access_token: z.string().optional(),
  settings: z
    .array(
      z.object({
        key: z.string().min(1, "配置项键名不能为空"),
        value: z.unknown(), // JSON 类型，支持任意值
      }),
    )
    .min(1, "必须提供至少一个配置项"),
});
export type UpdateSettings = z.infer<typeof UpdateSettingsSchema>;
registerSchema("UpdateSettings", UpdateSettingsSchema);

export const UpdateSettingsResultSchema = z.object({
  updated: z.number().int().nonnegative(),
});
export type UpdateSettingsResult = z.infer<typeof UpdateSettingsResultSchema>;

export const UpdateSettingsSuccessResponseSchema = createSuccessResponseSchema(
  UpdateSettingsResultSchema,
);
export type UpdateSettingsSuccessResponse = z.infer<
  typeof UpdateSettingsSuccessResponseSchema
>;
registerSchema(
  "UpdateSettingsSuccessResponse",
  UpdateSettingsSuccessResponseSchema,
);

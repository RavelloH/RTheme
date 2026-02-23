import { z } from "zod";
import { createSuccessResponseSchema, registerSchema } from "./common.js";

export const AutoUpdateModeSchema = z.enum(["REPOSITORY", "CONTAINER"]);
export type AutoUpdateMode = z.infer<typeof AutoUpdateModeSchema>;

export const RepoSyncStatusSchema = z.enum([
  "UNKNOWN",
  "MISSING_CONFIG",
  "IDENTICAL",
  "BEHIND",
  "AHEAD",
  "DIVERGED",
  "BLOCKED_VERSION",
  "ERROR",
]);
export type RepoSyncStatus = z.infer<typeof RepoSyncStatusSchema>;

export const AutoUpdateRepoConfigSchema = z.object({
  fullName: z.string(),
  branch: z.string(),
  pat: z.string(),
});
export type AutoUpdateRepoConfig = z.infer<typeof AutoUpdateRepoConfigSchema>;

export const AutoUpdateContainerConfigSchema = z.object({
  watchtowerBaseUrl: z.string(),
});
export type AutoUpdateContainerConfig = z.infer<
  typeof AutoUpdateContainerConfigSchema
>;

export const AutoUpdateConfigSchema = z.object({
  mode: AutoUpdateModeSchema,
  repo: AutoUpdateRepoConfigSchema,
  container: AutoUpdateContainerConfigSchema,
  updatedAt: z.string(),
});
export type AutoUpdateConfig = z.infer<typeof AutoUpdateConfigSchema>;

export const RuntimeVersionInfoSchema = z.object({
  appVersion: z.string().nullable(),
  commit: z.string().nullable(),
  buildId: z.string().nullable(),
  builtAt: z.string().nullable(),
  collectedAt: z.string(),
});
export type RuntimeVersionInfo = z.infer<typeof RuntimeVersionInfoSchema>;

export const RepoUpdateStatusSchema = z.object({
  available: z.boolean(),
  status: RepoSyncStatusSchema,
  message: z.string().nullable(),
  currentVersion: z.string().nullable(),
  targetVersion: z.string().nullable(),
  localSha: z.string().nullable(),
  upstreamSha: z.string().nullable(),
  aheadBy: z.number().int().nonnegative().nullable(),
  behindBy: z.number().int().nonnegative().nullable(),
  compareUrl: z.string().nullable(),
});
export type RepoUpdateStatus = z.infer<typeof RepoUpdateStatusSchema>;

export const AutoUpdateOverviewSchema = z.object({
  config: AutoUpdateConfigSchema,
  runtime: RuntimeVersionInfoSchema,
  repoStatus: RepoUpdateStatusSchema.nullable(),
});
export type AutoUpdateOverview = z.infer<typeof AutoUpdateOverviewSchema>;

export const TriggerAutoUpdateResultSchema = z.object({
  mode: AutoUpdateModeSchema,
  accepted: z.boolean(),
  startedAt: z.string(),
  message: z.string().nullable(),
  runtimeBefore: RuntimeVersionInfoSchema,
  repoStatusBefore: RepoUpdateStatusSchema.nullable().optional(),
});
export type TriggerAutoUpdateResult = z.infer<
  typeof TriggerAutoUpdateResultSchema
>;

/*
    getAutoUpdateOverview() Schema
*/
export const GetAutoUpdateOverviewSchema = z.object({
  access_token: z.string().optional(),
});
export type GetAutoUpdateOverview = z.infer<typeof GetAutoUpdateOverviewSchema>;
registerSchema("GetAutoUpdateOverview", GetAutoUpdateOverviewSchema);

export const GetAutoUpdateOverviewSuccessResponseSchema =
  createSuccessResponseSchema(AutoUpdateOverviewSchema);
export type GetAutoUpdateOverviewSuccessResponse = z.infer<
  typeof GetAutoUpdateOverviewSuccessResponseSchema
>;
registerSchema(
  "GetAutoUpdateOverviewSuccessResponse",
  GetAutoUpdateOverviewSuccessResponseSchema,
);

/*
    updateAutoUpdateConfig() Schema
*/
export const UpdateAutoUpdateConfigSchema = z
  .object({
    access_token: z.string().optional(),
    mode: AutoUpdateModeSchema.optional(),
    repoFullName: z.string().optional(),
    repoBranch: z.string().optional(),
    repoPat: z.string().optional(),
    watchtowerBaseUrl: z.string().url().or(z.literal("")).optional(),
  })
  .refine(
    (value) =>
      value.mode !== undefined ||
      value.repoFullName !== undefined ||
      value.repoBranch !== undefined ||
      value.repoPat !== undefined ||
      value.watchtowerBaseUrl !== undefined,
    {
      message: "必须提供至少一个配置项",
    },
  );
export type UpdateAutoUpdateConfig = z.infer<
  typeof UpdateAutoUpdateConfigSchema
>;
registerSchema("UpdateAutoUpdateConfig", UpdateAutoUpdateConfigSchema);

export const UpdateAutoUpdateConfigSuccessResponseSchema =
  createSuccessResponseSchema(AutoUpdateConfigSchema);
export type UpdateAutoUpdateConfigSuccessResponse = z.infer<
  typeof UpdateAutoUpdateConfigSuccessResponseSchema
>;
registerSchema(
  "UpdateAutoUpdateConfigSuccessResponse",
  UpdateAutoUpdateConfigSuccessResponseSchema,
);

/*
    triggerAutoUpdate() Schema
*/
export const TriggerAutoUpdateSchema = z.object({
  access_token: z.string().optional(),
  mode: AutoUpdateModeSchema.optional(),
});
export type TriggerAutoUpdate = z.infer<typeof TriggerAutoUpdateSchema>;
registerSchema("TriggerAutoUpdate", TriggerAutoUpdateSchema);

export const TriggerAutoUpdateSuccessResponseSchema =
  createSuccessResponseSchema(TriggerAutoUpdateResultSchema);
export type TriggerAutoUpdateSuccessResponse = z.infer<
  typeof TriggerAutoUpdateSuccessResponseSchema
>;
registerSchema(
  "TriggerAutoUpdateSuccessResponse",
  TriggerAutoUpdateSuccessResponseSchema,
);

/*
    getRuntimeVersionInfo() Schema
*/
export const GetRuntimeVersionInfoSchema = z.object({
  access_token: z.string().optional(),
});
export type GetRuntimeVersionInfo = z.infer<typeof GetRuntimeVersionInfoSchema>;
registerSchema("GetRuntimeVersionInfo", GetRuntimeVersionInfoSchema);

export const GetRuntimeVersionInfoSuccessResponseSchema =
  createSuccessResponseSchema(RuntimeVersionInfoSchema);
export type GetRuntimeVersionInfoSuccessResponse = z.infer<
  typeof GetRuntimeVersionInfoSuccessResponseSchema
>;
registerSchema(
  "GetRuntimeVersionInfoSuccessResponse",
  GetRuntimeVersionInfoSuccessResponseSchema,
);

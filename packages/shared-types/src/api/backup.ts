import { z } from "zod";
import { createSuccessResponseSchema, registerSchema } from "./common.js";

export const BackupScopeSchema = z.enum([
  "CORE_BASE",
  "ASSETS",
  "CONTENT",
  "ANALYTICS",
  "OPS_LOGS",
]);
export type BackupScope = z.infer<typeof BackupScopeSchema>;
registerSchema("BackupScope", BackupScopeSchema);

export const BackupExportModeSchema = z.enum(["AUTO", "DIRECT", "OSS"]);
export type BackupExportMode = z.infer<typeof BackupExportModeSchema>;
registerSchema("BackupExportMode", BackupExportModeSchema);

export const BackupRestoreModeSchema = z.enum(["REPLACE"]);
export type BackupRestoreMode = z.infer<typeof BackupRestoreModeSchema>;
registerSchema("BackupRestoreMode", BackupRestoreModeSchema);

export const BackupSourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("DIRECT"),
    content: z.string().min(1, "备份内容不能为空"),
  }),
  z.object({
    type: z.literal("OSS_URL"),
    url: z.string().url("URL 格式不正确"),
    expectedChecksum: z
      .string()
      .regex(/^[a-f0-9]{64}$/i, "校验和格式错误")
      .optional(),
  }),
]);
export type BackupSource = z.infer<typeof BackupSourceSchema>;
registerSchema("BackupSource", BackupSourceSchema);

export const BackupScopeItemSchema = z.object({
  scope: BackupScopeSchema,
  label: z.string(),
  description: z.string(),
  dependsOn: z.array(BackupScopeSchema),
});
export type BackupScopeItem = z.infer<typeof BackupScopeItemSchema>;
registerSchema("BackupScopeItem", BackupScopeItemSchema);

export const BackupArchiveMetaSchema = z.object({
  schemaVersion: z.literal(1),
  scope: BackupScopeSchema,
  exportedAt: z.string(),
  fileName: z.string(),
  checksum: z.string().regex(/^[a-f0-9]{64}$/i),
});
export type BackupArchiveMeta = z.infer<typeof BackupArchiveMetaSchema>;
registerSchema("BackupArchiveMeta", BackupArchiveMetaSchema);

export const BackupArchiveSchema = z.object({
  meta: BackupArchiveMetaSchema,
  data: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
});
export type BackupArchive = z.infer<typeof BackupArchiveSchema>;
registerSchema("BackupArchive", BackupArchiveSchema);

export const BackupExportDirectResultSchema = z.object({
  mode: z.literal("DIRECT"),
  scope: BackupScopeSchema,
  fileName: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  checksum: z.string().regex(/^[a-f0-9]{64}$/i),
  content: z.string(),
});
export type BackupExportDirectResult = z.infer<
  typeof BackupExportDirectResultSchema
>;
registerSchema("BackupExportDirectResult", BackupExportDirectResultSchema);

export const BackupExportOssResultSchema = z.object({
  mode: z.literal("OSS"),
  scope: BackupScopeSchema,
  fileName: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  checksum: z.string().regex(/^[a-f0-9]{64}$/i),
  url: z.string().url(),
  key: z.string(),
  providerId: z.string(),
  providerName: z.string(),
});
export type BackupExportOssResult = z.infer<typeof BackupExportOssResultSchema>;
registerSchema("BackupExportOssResult", BackupExportOssResultSchema);

export const BackupExportOssRequiredResultSchema = z.object({
  mode: z.literal("OSS_REQUIRED"),
  scope: BackupScopeSchema,
  fileName: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  limitBytes: z.number().int().positive(),
  message: z.string(),
});
export type BackupExportOssRequiredResult = z.infer<
  typeof BackupExportOssRequiredResultSchema
>;
registerSchema(
  "BackupExportOssRequiredResult",
  BackupExportOssRequiredResultSchema,
);

export const BackupExportResultSchema = z.discriminatedUnion("mode", [
  BackupExportDirectResultSchema,
  BackupExportOssResultSchema,
  BackupExportOssRequiredResultSchema,
]);
export type BackupExportResult = z.infer<typeof BackupExportResultSchema>;
registerSchema("BackupExportResult", BackupExportResultSchema);

export const BackupIssueSchema = z.object({
  level: z.enum(["error", "warning"]),
  code: z.string(),
  message: z.string(),
});
export type BackupIssue = z.infer<typeof BackupIssueSchema>;
registerSchema("BackupIssue", BackupIssueSchema);

export const BackupTablePlanSchema = z.object({
  table: z.string(),
  current: z.number().int().nonnegative(),
  incoming: z.number().int().nonnegative(),
  toDelete: z.number().int().nonnegative(),
  toInsert: z.number().int().nonnegative(),
});
export type BackupTablePlan = z.infer<typeof BackupTablePlanSchema>;
registerSchema("BackupTablePlan", BackupTablePlanSchema);

export const BackupDryRunResultSchema = z.object({
  scope: BackupScopeSchema,
  mode: BackupRestoreModeSchema,
  checksum: z.string().regex(/^[a-f0-9]{64}$/i),
  sizeBytes: z.number().int().nonnegative(),
  ready: z.boolean(),
  confirmText: z.string(),
  issues: z.array(BackupIssueSchema),
  tablePlans: z.array(BackupTablePlanSchema),
  summary: z.object({
    currentRows: z.number().int().nonnegative(),
    incomingRows: z.number().int().nonnegative(),
    toDelete: z.number().int().nonnegative(),
    toInsert: z.number().int().nonnegative(),
  }),
});
export type BackupDryRunResult = z.infer<typeof BackupDryRunResultSchema>;
registerSchema("BackupDryRunResult", BackupDryRunResultSchema);

export const BackupImportResultSchema = z.object({
  scope: BackupScopeSchema,
  mode: BackupRestoreModeSchema,
  checksum: z.string().regex(/^[a-f0-9]{64}$/i),
  importedAt: z.string(),
  tableStats: z.array(BackupTablePlanSchema),
  summary: z.object({
    deletedRows: z.number().int().nonnegative(),
    insertedRows: z.number().int().nonnegative(),
  }),
});
export type BackupImportResult = z.infer<typeof BackupImportResultSchema>;
registerSchema("BackupImportResult", BackupImportResultSchema);

export const BackupImportUploadInitUnsupportedResultSchema = z.object({
  strategy: z.literal("UNSUPPORTED"),
  providerType: z.string(),
  providerName: z.string(),
  message: z.string(),
});
export type BackupImportUploadInitUnsupportedResult = z.infer<
  typeof BackupImportUploadInitUnsupportedResultSchema
>;
registerSchema(
  "BackupImportUploadInitUnsupportedResult",
  BackupImportUploadInitUnsupportedResultSchema,
);

export const BackupImportUploadInitS3ResultSchema = z.object({
  strategy: z.literal("CLIENT_S3"),
  providerType: z.literal("AWS_S3"),
  providerName: z.string(),
  storageProviderId: z.string(),
  key: z.string(),
  sourceUrl: z.string().url(),
  uploadMethod: z.literal("PUT"),
  uploadUrl: z.string().url(),
  uploadHeaders: z.record(z.string(), z.string()).optional(),
});
export type BackupImportUploadInitS3Result = z.infer<
  typeof BackupImportUploadInitS3ResultSchema
>;
registerSchema(
  "BackupImportUploadInitS3Result",
  BackupImportUploadInitS3ResultSchema,
);

export const BackupImportUploadInitBlobResultSchema = z.object({
  strategy: z.literal("CLIENT_BLOB"),
  providerType: z.literal("VERCEL_BLOB"),
  providerName: z.string(),
  storageProviderId: z.string(),
  key: z.string(),
  sourceUrl: z.string().url(),
  blobPathname: z.string(),
  blobClientToken: z.string(),
});
export type BackupImportUploadInitBlobResult = z.infer<
  typeof BackupImportUploadInitBlobResultSchema
>;
registerSchema(
  "BackupImportUploadInitBlobResult",
  BackupImportUploadInitBlobResultSchema,
);

export const BackupImportUploadInitResultSchema = z.discriminatedUnion(
  "strategy",
  [
    BackupImportUploadInitUnsupportedResultSchema,
    BackupImportUploadInitS3ResultSchema,
    BackupImportUploadInitBlobResultSchema,
  ],
);
export type BackupImportUploadInitResult = z.infer<
  typeof BackupImportUploadInitResultSchema
>;
registerSchema(
  "BackupImportUploadInitResult",
  BackupImportUploadInitResultSchema,
);

export const GetBackupScopesSchema = z.object({
  access_token: z.string().optional(),
});
export type GetBackupScopes = z.infer<typeof GetBackupScopesSchema>;
registerSchema("GetBackupScopes", GetBackupScopesSchema);

export const GetBackupScopesSuccessResponseSchema = createSuccessResponseSchema(
  z.array(BackupScopeItemSchema),
);
export type GetBackupScopesSuccessResponse = z.infer<
  typeof GetBackupScopesSuccessResponseSchema
>;
registerSchema(
  "GetBackupScopesSuccessResponse",
  GetBackupScopesSuccessResponseSchema,
);

export const ExportBackupSchema = z.object({
  access_token: z.string().optional(),
  scope: BackupScopeSchema,
  mode: BackupExportModeSchema.optional(),
});
export type ExportBackup = z.infer<typeof ExportBackupSchema>;
registerSchema("ExportBackup", ExportBackupSchema);

export const ExportBackupSuccessResponseSchema = createSuccessResponseSchema(
  BackupExportResultSchema,
);
export type ExportBackupSuccessResponse = z.infer<
  typeof ExportBackupSuccessResponseSchema
>;
registerSchema(
  "ExportBackupSuccessResponse",
  ExportBackupSuccessResponseSchema,
);

export const InitBackupImportUploadSchema = z.object({
  access_token: z.string().optional(),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  contentType: z.string().optional(),
});
export type InitBackupImportUpload = z.infer<
  typeof InitBackupImportUploadSchema
>;
registerSchema("InitBackupImportUpload", InitBackupImportUploadSchema);

export const InitBackupImportUploadSuccessResponseSchema =
  createSuccessResponseSchema(BackupImportUploadInitResultSchema);
export type InitBackupImportUploadSuccessResponse = z.infer<
  typeof InitBackupImportUploadSuccessResponseSchema
>;
registerSchema(
  "InitBackupImportUploadSuccessResponse",
  InitBackupImportUploadSuccessResponseSchema,
);

export const DryRunBackupImportSchema = z.object({
  access_token: z.string().optional(),
  source: BackupSourceSchema,
  mode: BackupRestoreModeSchema.optional(),
  scope: BackupScopeSchema.optional(),
});
export type DryRunBackupImport = z.infer<typeof DryRunBackupImportSchema>;
registerSchema("DryRunBackupImport", DryRunBackupImportSchema);

export const DryRunBackupImportSuccessResponseSchema =
  createSuccessResponseSchema(BackupDryRunResultSchema);
export type DryRunBackupImportSuccessResponse = z.infer<
  typeof DryRunBackupImportSuccessResponseSchema
>;
registerSchema(
  "DryRunBackupImportSuccessResponse",
  DryRunBackupImportSuccessResponseSchema,
);

export const ImportBackupSchema = z.object({
  access_token: z.string().optional(),
  source: BackupSourceSchema,
  mode: BackupRestoreModeSchema.optional(),
  scope: BackupScopeSchema.optional(),
  expectedChecksum: z.string().regex(/^[a-f0-9]{64}$/i),
  confirmText: z.string().min(1),
});
export type ImportBackup = z.infer<typeof ImportBackupSchema>;
registerSchema("ImportBackup", ImportBackupSchema);

export const ImportBackupSuccessResponseSchema = createSuccessResponseSchema(
  BackupImportResultSchema,
);
export type ImportBackupSuccessResponse = z.infer<
  typeof ImportBackupSuccessResponseSchema
>;
registerSchema(
  "ImportBackupSuccessResponse",
  ImportBackupSuccessResponseSchema,
);

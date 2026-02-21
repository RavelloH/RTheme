import "server-only";

import { createHash } from "node:crypto";
import path from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
  BackupArchive,
  BackupDryRunResult,
  BackupExportMode,
  BackupExportResult,
  BackupImportResult,
  BackupImportUploadInitResult,
  BackupIssue,
  BackupScope,
  BackupScopeItem,
  BackupSource,
  BackupTablePlan,
} from "@repo/shared-types/api/backup";
import { BackupArchiveSchema } from "@repo/shared-types/api/backup";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";

import { buildObjectKey, uploadObject } from "@/lib/server/oss";
import prisma, { type PrismaTransaction } from "@/lib/server/prisma";
import {
  assertPublicHttpUrl,
  readResponseBufferWithLimit,
} from "@/lib/server/url-security";
import type { StorageProviderType } from "@/template/storages";

type BackupRow = Record<string, unknown>;
type BackupData = Record<string, BackupRow[]>;

type BackupArchiveBuildResult = {
  archive: BackupArchive;
  content: string;
  fileName: string;
  sizeBytes: number;
  checksum: string;
};

type LoadedBackupSource = {
  content: string;
  sizeBytes: number;
  sourceType: BackupSource["type"];
};

type BackupApplySummary = {
  tableStats: BackupTablePlan[];
  deletedRows: number;
  insertedRows: number;
};

type BackupScopeDefinition = BackupScopeItem & {
  dataKeys: string[];
};

type SequenceTarget = {
  table: string;
  column: string;
};

type ParsedAndValidatedArchive = {
  archive: BackupArchive;
  checksum: string;
  sizeBytes: number;
};

const BACKUP_SCHEMA_VERSION = 1 as const;

// 预留响应体与请求体开销，按 4MB 安全线处理
export const BACKUP_DIRECT_LIMIT_BYTES = 4 * 1024 * 1024;
export const BACKUP_OSS_IMPORT_LIMIT_BYTES = 64 * 1024 * 1024;
export const BACKUP_IMPORT_CONFIRM_TEXT = "确认还原";
const BACKUP_UPLOAD_TEMP_PATH_TEMPLATE =
  "temp/backups/import/{year}/{month}/{filename}";
const BACKUP_DIRECT_UPLOAD_SIGN_EXPIRES_SECONDS = 10 * 60;
const BACKUP_DIRECT_UPLOAD_TOKEN_EXPIRES_MS = 10 * 60 * 1000;

const SCOPE_DEFINITIONS: BackupScopeDefinition[] = [
  {
    scope: "CORE_BASE",
    label: "核心基础",
    description: "用户、认证会话、站点配置、页面菜单、通知与消息",
    dependsOn: [],
    dataKeys: [
      "users",
      "accounts",
      "refreshTokens",
      "passwordResets",
      "passkeys",
      "configs",
      "pages",
      "menus",
      "customDictionary",
      "notices",
      "conversations",
      "conversationParticipants",
      "messages",
      "mailSubscriptions",
      "pushSubscriptions",
    ],
  },
  {
    scope: "CONTENT",
    label: "内容数据",
    description: "文章、标签、分类、评论、作品与友链",
    dependsOn: ["CORE_BASE"],
    dataKeys: [
      "tags",
      "categories",
      "posts",
      "postTagLinks",
      "postCategoryLinks",
      "comments",
      "commentLikes",
      "projects",
      "projectTagLinks",
      "projectCategoryLinks",
      "friendLinks",
    ],
  },
  {
    scope: "ASSETS",
    label: "媒体资产",
    description: "存储提供商、虚拟目录、媒体、图库与媒体引用关系",
    dependsOn: ["CORE_BASE", "CONTENT"],
    dataKeys: [
      "storageProviders",
      "virtualFolders",
      "media",
      "photos",
      "mediaReferences",
    ],
  },
  {
    scope: "ANALYTICS",
    label: "访问分析",
    description: "访问统计缓存、明细与归档、搜索日志",
    dependsOn: ["CONTENT"],
    dataKeys: [
      "viewCountCaches",
      "pageViews",
      "pageViewArchives",
      "searchLogs",
    ],
  },
  {
    scope: "OPS_LOGS",
    label: "运维日志",
    description: "审计日志、健康检查、计划任务与云触发历史",
    dependsOn: [],
    dataKeys: [
      "auditLogs",
      "healthChecks",
      "cronHistories",
      "cloudTriggerHistories",
    ],
  },
];

const AUTOINCREMENT_SEQUENCE_TARGETS: Record<BackupScope, SequenceTarget[]> = {
  CORE_BASE: [
    { table: "User", column: "uid" },
    { table: "CustomDictionary", column: "id" },
    { table: "MailSubscription", column: "id" },
  ],
  ASSETS: [
    { table: "VirtualFolder", column: "id" },
    { table: "Media", column: "id" },
    { table: "Photo", column: "id" },
  ],
  CONTENT: [
    { table: "Category", column: "id" },
    { table: "Post", column: "id" },
    { table: "Project", column: "id" },
    { table: "FriendLink", column: "id" },
  ],
  ANALYTICS: [{ table: "SearchLog", column: "id" }],
  OPS_LOGS: [
    { table: "AuditLog", column: "id" },
    { table: "HealthCheck", column: "id" },
    { table: "CronHistory", column: "id" },
    { table: "CloudTriggerHistory", column: "id" },
  ],
};

function getScopeDefinition(scope: BackupScope): BackupScopeDefinition {
  const found = SCOPE_DEFINITIONS.find((item) => item.scope === scope);
  if (!found) {
    throw new Error(`未知备份分组: ${scope}`);
  }
  return found;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeJsonValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item));
  }

  if (!isRecord(value)) {
    return value;
  }

  const sortedKeys = Object.keys(value).sort((left, right) =>
    left.localeCompare(right),
  );
  const result: Record<string, unknown> = {};

  for (const key of sortedKeys) {
    result[key] = normalizeJsonValue(value[key]);
  }

  return result;
}

function toBackupRows(rows: unknown[]): BackupRow[] {
  return rows.map((row) => {
    const normalized = normalizeJsonValue(row);
    return isRecord(normalized) ? normalized : {};
  });
}

function computeChecksum(scope: BackupScope, data: BackupData): string {
  const payload = JSON.stringify(
    normalizeJsonValue({
      scope,
      data,
    }),
  );

  return createHash("sha256").update(payload).digest("hex");
}

function createBackupFileName(scope: BackupScope, date: Date): string {
  const part = `${date.getFullYear()}${`${date.getMonth() + 1}`.padStart(2, "0")}${`${date.getDate()}`.padStart(2, "0")}-${`${date.getHours()}`.padStart(2, "0")}${`${date.getMinutes()}`.padStart(2, "0")}${`${date.getSeconds()}`.padStart(2, "0")}`;
  return `neutralpress-${scope.toLowerCase()}-backup-${part}.json`;
}

function normalizePosixPath(input: string): string {
  const normalized = path.posix.normalize(input.trim() || "/{filename}");
  const withoutDots = normalized.replace(/^(\.\.(\/|\\|$))+/, "");
  return withoutDots.replace(/^\/+/, "");
}

function joinStoragePrefix(prefix: string | undefined, key: string): string {
  const normalizedKey = normalizePosixPath(key);
  if (!prefix) return normalizedKey;

  const normalizedPrefix = normalizePosixPath(prefix);
  if (!normalizedPrefix) return normalizedKey;

  if (
    normalizedKey === normalizedPrefix ||
    normalizedKey.startsWith(`${normalizedPrefix}/`)
  ) {
    return normalizedKey;
  }

  return normalizePosixPath(path.posix.join(normalizedPrefix, normalizedKey));
}

function toPublicUrl(baseUrl: string, key: string): string {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const trimmedKey = key.replace(/^\/+/, "");
  return `${trimmedBase}/${trimmedKey}`;
}

function readNumber(row: BackupRow, field: string): number | null {
  const value = row[field];
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  return null;
}

function readString(row: BackupRow, field: string): string | null {
  const value = row[field];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function uniqueNumbers(values: Array<number | null>): number[] {
  return Array.from(
    new Set(
      values.filter((value): value is number => Number.isFinite(value ?? NaN)),
    ),
  );
}

function uniqueStrings(values: Array<string | null>): string[] {
  return Array.from(
    new Set(
      values.filter((value): value is string => typeof value === "string"),
    ),
  );
}

function getRows(data: BackupData, key: string): BackupRow[] {
  const value = data[key];
  if (!Array.isArray(value)) return [];
  return value;
}

function requireDataKeys(scope: BackupScope, data: BackupData): BackupIssue[] {
  const definition = getScopeDefinition(scope);
  const issues: BackupIssue[] = [];

  for (const key of definition.dataKeys) {
    if (!Array.isArray(data[key])) {
      issues.push({
        level: "error",
        code: "MISSING_DATA_KEY",
        message: `备份文件缺少数据字段: ${key}`,
      });
    }
  }

  return issues;
}

function sumTableRows(
  tablePlans: BackupTablePlan[],
  key: keyof BackupTablePlan,
) {
  return tablePlans.reduce((total, item) => total + (item[key] as number), 0);
}

async function countPostTagLinks(): Promise<number> {
  const rows = await prisma.post.findMany({
    select: {
      _count: {
        select: {
          tags: true,
        },
      },
    },
  });

  return rows.reduce((total, row) => total + row._count.tags, 0);
}

async function countPostCategoryLinks(): Promise<number> {
  const rows = await prisma.post.findMany({
    select: {
      _count: {
        select: {
          categories: true,
        },
      },
    },
  });

  return rows.reduce((total, row) => total + row._count.categories, 0);
}

async function countProjectTagLinks(): Promise<number> {
  const rows = await prisma.project.findMany({
    select: {
      _count: {
        select: {
          tags: true,
        },
      },
    },
  });

  return rows.reduce((total, row) => total + row._count.tags, 0);
}

async function countProjectCategoryLinks(): Promise<number> {
  const rows = await prisma.project.findMany({
    select: {
      _count: {
        select: {
          categories: true,
        },
      },
    },
  });

  return rows.reduce((total, row) => total + row._count.categories, 0);
}

function buildScopeTableNames(scope: BackupScope): string[] {
  switch (scope) {
    case "CORE_BASE":
      return [
        "User",
        "Account",
        "RefreshToken",
        "PasswordReset",
        "Passkey",
        "Config",
        "Page",
        "Menu",
        "CustomDictionary",
        "Notice",
        "Conversation",
        "ConversationParticipant",
        "Message",
        "MailSubscription",
        "PushSubscription",
      ];
    case "ASSETS":
      return [
        "StorageProvider",
        "VirtualFolder",
        "Media",
        "Photo",
        "MediaReference",
      ];
    case "CONTENT":
      return [
        "Tag",
        "Category",
        "Post",
        "PostTagLink",
        "PostCategoryLink",
        "Comment",
        "CommentLike",
        "Project",
        "ProjectTagLink",
        "ProjectCategoryLink",
        "FriendLink",
      ];
    case "ANALYTICS":
      return ["ViewCountCache", "PageView", "PageViewArchive", "SearchLog"];
    case "OPS_LOGS":
      return ["AuditLog", "HealthCheck", "CronHistory", "CloudTriggerHistory"];
  }
  throw new Error(`未知备份分组: ${scope}`);
}

function buildBackupArchive(
  scope: BackupScope,
  data: BackupData,
): BackupArchive {
  const exportedAt = new Date();
  const fileName = createBackupFileName(scope, exportedAt);
  const checksum = computeChecksum(scope, data);

  return {
    meta: {
      schemaVersion: BACKUP_SCHEMA_VERSION,
      scope,
      exportedAt: exportedAt.toISOString(),
      fileName,
      checksum,
    },
    data,
  };
}

async function exportCoreBaseData(): Promise<BackupData> {
  const [
    users,
    accounts,
    refreshTokens,
    passwordResets,
    passkeys,
    configs,
    pages,
    menus,
    customDictionary,
    notices,
    conversations,
    conversationParticipants,
    messages,
    mailSubscriptions,
    pushSubscriptions,
  ] = await Promise.all([
    prisma.user.findMany({ orderBy: { uid: "asc" } }),
    prisma.account.findMany({ orderBy: { id: "asc" } }),
    prisma.refreshToken.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.passwordReset.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.passkey.findMany({ orderBy: { id: "asc" } }),
    prisma.config.findMany({ orderBy: { key: "asc" } }),
    prisma.page.findMany({ orderBy: { id: "asc" } }),
    prisma.menu.findMany({ orderBy: { id: "asc" } }),
    prisma.customDictionary.findMany({ orderBy: { id: "asc" } }),
    prisma.notice.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.conversation.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.conversationParticipant.findMany({
      orderBy: [{ conversationId: "asc" }, { userUid: "asc" }],
    }),
    prisma.message.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.mailSubscription.findMany({ orderBy: { id: "asc" } }),
    prisma.pushSubscription.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return {
    users: toBackupRows(users),
    accounts: toBackupRows(accounts),
    refreshTokens: toBackupRows(refreshTokens),
    passwordResets: toBackupRows(passwordResets),
    passkeys: toBackupRows(passkeys),
    configs: toBackupRows(configs),
    pages: toBackupRows(pages),
    menus: toBackupRows(menus),
    customDictionary: toBackupRows(customDictionary),
    notices: toBackupRows(notices),
    conversations: toBackupRows(conversations),
    conversationParticipants: toBackupRows(conversationParticipants),
    messages: toBackupRows(messages),
    mailSubscriptions: toBackupRows(mailSubscriptions),
    pushSubscriptions: toBackupRows(pushSubscriptions),
  };
}

async function exportAssetsData(): Promise<BackupData> {
  const [storageProviders, virtualFolders, media, photos, mediaReferences] =
    await Promise.all([
      prisma.storageProvider.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.virtualFolder.findMany({ orderBy: { id: "asc" } }),
      prisma.media.findMany({ orderBy: { id: "asc" } }),
      prisma.photo.findMany({ orderBy: { id: "asc" } }),
      prisma.mediaReference.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

  return {
    storageProviders: toBackupRows(storageProviders),
    virtualFolders: toBackupRows(virtualFolders),
    media: toBackupRows(media),
    photos: toBackupRows(photos),
    mediaReferences: toBackupRows(mediaReferences),
  };
}

async function exportContentData(): Promise<BackupData> {
  const [
    tags,
    categories,
    postsRaw,
    comments,
    commentLikes,
    projectsRaw,
    friendLinks,
  ] = await Promise.all([
    prisma.tag.findMany({ orderBy: { slug: "asc" } }),
    prisma.category.findMany({ orderBy: { id: "asc" } }),
    prisma.post.findMany({
      orderBy: { id: "asc" },
      include: {
        tags: {
          select: { slug: true },
        },
        categories: {
          select: { id: true },
        },
      },
    }),
    prisma.comment.findMany({
      orderBy: [{ depth: "asc" }, { createdAt: "asc" }],
    }),
    prisma.commentLike.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.project.findMany({
      orderBy: { id: "asc" },
      include: {
        tags: {
          select: { slug: true },
        },
        categories: {
          select: { id: true },
        },
      },
    }),
    prisma.friendLink.findMany({ orderBy: { id: "asc" } }),
  ]);

  const postTagLinks: BackupRow[] = [];
  const postCategoryLinks: BackupRow[] = [];
  const posts = postsRaw.map((post) => {
    for (const tag of post.tags) {
      postTagLinks.push({
        postId: post.id,
        tagSlug: tag.slug,
      });
    }

    for (const category of post.categories) {
      postCategoryLinks.push({
        postId: post.id,
        categoryId: category.id,
      });
    }

    const { tags: _postTags, categories: _postCategories, ...plainPost } = post;
    return plainPost;
  });

  const projectTagLinks: BackupRow[] = [];
  const projectCategoryLinks: BackupRow[] = [];
  const projects = projectsRaw.map((project) => {
    for (const tag of project.tags) {
      projectTagLinks.push({
        projectId: project.id,
        tagSlug: tag.slug,
      });
    }

    for (const category of project.categories) {
      projectCategoryLinks.push({
        projectId: project.id,
        categoryId: category.id,
      });
    }

    const {
      tags: _projectTags,
      categories: _projectCategories,
      ...plainProject
    } = project;
    return plainProject;
  });

  return {
    tags: toBackupRows(tags),
    categories: toBackupRows(categories),
    posts: toBackupRows(posts),
    postTagLinks: toBackupRows(postTagLinks),
    postCategoryLinks: toBackupRows(postCategoryLinks),
    comments: toBackupRows(comments),
    commentLikes: toBackupRows(commentLikes),
    projects: toBackupRows(projects),
    projectTagLinks: toBackupRows(projectTagLinks),
    projectCategoryLinks: toBackupRows(projectCategoryLinks),
    friendLinks: toBackupRows(friendLinks),
  };
}

async function exportAnalyticsData(): Promise<BackupData> {
  const [viewCountCaches, pageViews, pageViewArchives, searchLogs] =
    await Promise.all([
      prisma.viewCountCache.findMany({ orderBy: { path: "asc" } }),
      prisma.pageView.findMany({ orderBy: { timestamp: "asc" } }),
      prisma.pageViewArchive.findMany({ orderBy: { date: "asc" } }),
      prisma.searchLog.findMany({ orderBy: { id: "asc" } }),
    ]);

  return {
    viewCountCaches: toBackupRows(viewCountCaches),
    pageViews: toBackupRows(pageViews),
    pageViewArchives: toBackupRows(pageViewArchives),
    searchLogs: toBackupRows(searchLogs),
  };
}

async function exportOpsLogsData(): Promise<BackupData> {
  const [auditLogs, healthChecks, cronHistories, cloudTriggerHistories] =
    await Promise.all([
      prisma.auditLog.findMany({ orderBy: { id: "asc" } }),
      prisma.healthCheck.findMany({ orderBy: { id: "asc" } }),
      prisma.cronHistory.findMany({ orderBy: { id: "asc" } }),
      prisma.cloudTriggerHistory.findMany({ orderBy: { id: "asc" } }),
    ]);

  return {
    auditLogs: toBackupRows(auditLogs),
    healthChecks: toBackupRows(healthChecks),
    cronHistories: toBackupRows(cronHistories),
    cloudTriggerHistories: toBackupRows(cloudTriggerHistories),
  };
}

async function exportDataByScope(scope: BackupScope): Promise<BackupData> {
  switch (scope) {
    case "CORE_BASE":
      return exportCoreBaseData();
    case "ASSETS":
      return exportAssetsData();
    case "CONTENT":
      return exportContentData();
    case "ANALYTICS":
      return exportAnalyticsData();
    case "OPS_LOGS":
      return exportOpsLogsData();
  }
  throw new Error(`未知备份分组: ${scope}`);
}

export function getBackupScopes(): BackupScopeItem[] {
  return SCOPE_DEFINITIONS.map(({ scope, label, description, dependsOn }) => ({
    scope,
    label,
    description,
    dependsOn,
  }));
}

export async function createBackupArchiveForScope(
  scope: BackupScope,
): Promise<BackupArchiveBuildResult> {
  const data = await exportDataByScope(scope);
  const archive = buildBackupArchive(scope, data);
  const content = JSON.stringify(archive, null, 2);
  const sizeBytes = Buffer.byteLength(content, "utf8");

  return {
    archive,
    content,
    fileName: archive.meta.fileName,
    sizeBytes,
    checksum: archive.meta.checksum,
  };
}

async function resolveWritableStorageProvider() {
  const provider =
    (await prisma.storageProvider.findFirst({
      where: {
        isDefault: true,
        isActive: true,
      },
    })) ||
    (await prisma.storageProvider.findFirst({
      where: {
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
    }));

  if (!provider) {
    throw new Error("当前没有可用的启用存储提供商");
  }

  if (provider.type === "EXTERNAL_URL") {
    throw new Error("默认存储为 EXTERNAL_URL，不支持备份文件写入");
  }

  return provider;
}

export async function initBackupImportUpload(params: {
  fileName: string;
  fileSize: number;
  contentType?: string;
}): Promise<BackupImportUploadInitResult> {
  const provider = await resolveWritableStorageProvider();
  const maxAllowedSize = Math.min(
    Math.max(provider.maxFileSize, 1),
    BACKUP_OSS_IMPORT_LIMIT_BYTES,
  );

  if (params.fileSize > maxAllowedSize) {
    throw new Error(
      `文件大小超出限制，最大允许 ${(maxAllowedSize / 1024 / 1024).toFixed(2)}MB`,
    );
  }

  const normalizedContentType = (
    params.contentType?.trim().toLowerCase() || "application/octet-stream"
  )
    .split(";")[0]
    ?.trim();
  const contentType = normalizedContentType || "application/octet-stream";

  const tempKey = buildObjectKey({
    filename: params.fileName,
    pathTemplate: BACKUP_UPLOAD_TEMP_PATH_TEMPLATE,
    ensureUniqueName: true,
  });

  if (provider.type === "AWS_S3") {
    const s3Config = (provider.config || {}) as {
      accessKeyId?: string;
      secretAccessKey?: string;
      region?: string;
      bucket?: string;
      endpoint?: string;
      basePath?: string;
      forcePathStyle?: boolean | string;
    };

    if (
      !s3Config.accessKeyId ||
      !s3Config.secretAccessKey ||
      !s3Config.region ||
      !s3Config.bucket
    ) {
      throw new Error(
        "AWS_S3 配置不完整，请检查 accessKeyId/secretAccessKey/region/bucket",
      );
    }

    const objectKey = joinStoragePrefix(s3Config.basePath, tempKey);
    const sourceUrl = toPublicUrl(provider.baseUrl, objectKey);

    const s3Client = new S3Client({
      region: s3Config.region,
      endpoint: s3Config.endpoint,
      forcePathStyle:
        s3Config.forcePathStyle === true || s3Config.forcePathStyle === "true",
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });

    const uploadCommand = new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: objectKey,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(
      s3Client as unknown as Parameters<typeof getSignedUrl>[0],
      uploadCommand as unknown as Parameters<typeof getSignedUrl>[1],
      {
        expiresIn: BACKUP_DIRECT_UPLOAD_SIGN_EXPIRES_SECONDS,
      },
    );

    return {
      strategy: "CLIENT_S3",
      providerType: "AWS_S3",
      providerName: provider.name,
      storageProviderId: provider.id,
      key: objectKey,
      sourceUrl,
      uploadMethod: "PUT",
      uploadUrl,
      uploadHeaders: {
        "Content-Type": contentType,
      },
    };
  }

  if (provider.type === "VERCEL_BLOB") {
    const blobConfig = (provider.config || {}) as {
      token?: string;
      basePath?: string;
    };
    if (!blobConfig.token) {
      throw new Error("VERCEL_BLOB 配置缺少 token");
    }

    const objectKey = joinStoragePrefix(blobConfig.basePath, tempKey);
    const sourceUrl = toPublicUrl(provider.baseUrl, objectKey);

    const allowedContentTypes = Array.from(
      new Set([
        "application/json",
        "text/plain",
        "application/octet-stream",
        contentType,
      ]),
    );

    const blobClientToken = await generateClientTokenFromReadWriteToken({
      token: blobConfig.token,
      pathname: objectKey,
      maximumSizeInBytes: maxAllowedSize,
      allowedContentTypes,
      validUntil: Date.now() + BACKUP_DIRECT_UPLOAD_TOKEN_EXPIRES_MS,
      addRandomSuffix: false,
      allowOverwrite: false,
    });

    return {
      strategy: "CLIENT_BLOB",
      providerType: "VERCEL_BLOB",
      providerName: provider.name,
      storageProviderId: provider.id,
      key: objectKey,
      sourceUrl,
      blobPathname: objectKey,
      blobClientToken,
    };
  }

  return {
    strategy: "UNSUPPORTED",
    providerType: provider.type,
    providerName: provider.name,
    message:
      "当前默认存储不支持客户端直传备份文件，请切换到 AWS_S3 或 VERCEL_BLOB 后重试",
  };
}

async function uploadBackupToOss(params: {
  scope: BackupScope;
  fileName: string;
  content: string;
  checksum: string;
  sizeBytes: number;
}): Promise<BackupExportResult> {
  const provider = await resolveWritableStorageProvider();
  const pathTemplate = provider.pathTemplate || "/{year}/{month}/{filename}";
  const customPath = `temp/backups/${params.scope.toLowerCase()}/{year}/{month}/{filename}`;

  const result = await uploadObject({
    type: provider.type as StorageProviderType,
    baseUrl: provider.baseUrl,
    pathTemplate,
    customPath,
    ensureUniqueName: true,
    config: provider.config as never,
    file: {
      buffer: Buffer.from(params.content, "utf8"),
      filename: params.fileName,
      contentType: "application/json; charset=utf-8",
    },
  });

  return {
    mode: "OSS",
    scope: params.scope,
    fileName: params.fileName,
    sizeBytes: params.sizeBytes,
    checksum: params.checksum,
    url: result.url,
    key: result.key,
    providerId: provider.id,
    providerName: provider.name,
  };
}

export async function createBackupExport(
  scope: BackupScope,
  mode: BackupExportMode,
): Promise<BackupExportResult> {
  const built = await createBackupArchiveForScope(scope);

  if (mode === "OSS") {
    return uploadBackupToOss({
      scope,
      content: built.content,
      fileName: built.fileName,
      checksum: built.checksum,
      sizeBytes: built.sizeBytes,
    });
  }

  if (built.sizeBytes <= BACKUP_DIRECT_LIMIT_BYTES) {
    return {
      mode: "DIRECT",
      scope,
      fileName: built.fileName,
      sizeBytes: built.sizeBytes,
      checksum: built.checksum,
      content: built.content,
    };
  }

  return {
    mode: "OSS_REQUIRED",
    scope,
    fileName: built.fileName,
    sizeBytes: built.sizeBytes,
    limitBytes: BACKUP_DIRECT_LIMIT_BYTES,
    message: "备份文件超过直连安全上限，请改用 OSS 模式导出",
  };
}

export async function loadBackupSource(
  source: BackupSource,
): Promise<LoadedBackupSource> {
  if (source.type === "DIRECT") {
    return {
      content: source.content,
      sizeBytes: Buffer.byteLength(source.content, "utf8"),
      sourceType: "DIRECT",
    };
  }

  const { url } = await assertPublicHttpUrl(source.url);
  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`下载备份文件失败（HTTP ${response.status}）`);
  }

  const buffer = await readResponseBufferWithLimit(
    response,
    BACKUP_OSS_IMPORT_LIMIT_BYTES,
  );

  return {
    content: buffer.toString("utf8"),
    sizeBytes: buffer.byteLength,
    sourceType: "OSS_URL",
  };
}

function parseBackupArchive(content: string): BackupArchive {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("备份文件不是有效的 JSON");
  }

  const parsedResult = BackupArchiveSchema.safeParse(parsed);
  if (!parsedResult.success) {
    throw new Error("备份文件结构不符合要求");
  }

  return parsedResult.data;
}

function verifyBackupChecksum(archive: BackupArchive): boolean {
  const checksum = computeChecksum(archive.meta.scope, archive.data);
  return checksum.toLowerCase() === archive.meta.checksum.toLowerCase();
}

async function createTablePlans(
  scope: BackupScope,
  data: BackupData,
): Promise<BackupTablePlan[]> {
  if (scope === "CORE_BASE") {
    const [
      userCount,
      accountCount,
      refreshTokenCount,
      passwordResetCount,
      passkeyCount,
      configCount,
      pageCount,
      menuCount,
      dictionaryCount,
      noticeCount,
      conversationCount,
      conversationParticipantCount,
      messageCount,
      mailSubscriptionCount,
      pushSubscriptionCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.account.count(),
      prisma.refreshToken.count(),
      prisma.passwordReset.count(),
      prisma.passkey.count(),
      prisma.config.count(),
      prisma.page.count(),
      prisma.menu.count(),
      prisma.customDictionary.count(),
      prisma.notice.count(),
      prisma.conversation.count(),
      prisma.conversationParticipant.count(),
      prisma.message.count(),
      prisma.mailSubscription.count(),
      prisma.pushSubscription.count(),
    ]);

    return [
      {
        table: "User",
        current: userCount,
        incoming: getRows(data, "users").length,
        toDelete: userCount,
        toInsert: getRows(data, "users").length,
      },
      {
        table: "Account",
        current: accountCount,
        incoming: getRows(data, "accounts").length,
        toDelete: accountCount,
        toInsert: getRows(data, "accounts").length,
      },
      {
        table: "RefreshToken",
        current: refreshTokenCount,
        incoming: getRows(data, "refreshTokens").length,
        toDelete: refreshTokenCount,
        toInsert: getRows(data, "refreshTokens").length,
      },
      {
        table: "PasswordReset",
        current: passwordResetCount,
        incoming: getRows(data, "passwordResets").length,
        toDelete: passwordResetCount,
        toInsert: getRows(data, "passwordResets").length,
      },
      {
        table: "Passkey",
        current: passkeyCount,
        incoming: getRows(data, "passkeys").length,
        toDelete: passkeyCount,
        toInsert: getRows(data, "passkeys").length,
      },
      {
        table: "Config",
        current: configCount,
        incoming: getRows(data, "configs").length,
        toDelete: configCount,
        toInsert: getRows(data, "configs").length,
      },
      {
        table: "Page",
        current: pageCount,
        incoming: getRows(data, "pages").length,
        toDelete: pageCount,
        toInsert: getRows(data, "pages").length,
      },
      {
        table: "Menu",
        current: menuCount,
        incoming: getRows(data, "menus").length,
        toDelete: menuCount,
        toInsert: getRows(data, "menus").length,
      },
      {
        table: "CustomDictionary",
        current: dictionaryCount,
        incoming: getRows(data, "customDictionary").length,
        toDelete: dictionaryCount,
        toInsert: getRows(data, "customDictionary").length,
      },
      {
        table: "Notice",
        current: noticeCount,
        incoming: getRows(data, "notices").length,
        toDelete: noticeCount,
        toInsert: getRows(data, "notices").length,
      },
      {
        table: "Conversation",
        current: conversationCount,
        incoming: getRows(data, "conversations").length,
        toDelete: conversationCount,
        toInsert: getRows(data, "conversations").length,
      },
      {
        table: "ConversationParticipant",
        current: conversationParticipantCount,
        incoming: getRows(data, "conversationParticipants").length,
        toDelete: conversationParticipantCount,
        toInsert: getRows(data, "conversationParticipants").length,
      },
      {
        table: "Message",
        current: messageCount,
        incoming: getRows(data, "messages").length,
        toDelete: messageCount,
        toInsert: getRows(data, "messages").length,
      },
      {
        table: "MailSubscription",
        current: mailSubscriptionCount,
        incoming: getRows(data, "mailSubscriptions").length,
        toDelete: mailSubscriptionCount,
        toInsert: getRows(data, "mailSubscriptions").length,
      },
      {
        table: "PushSubscription",
        current: pushSubscriptionCount,
        incoming: getRows(data, "pushSubscriptions").length,
        toDelete: pushSubscriptionCount,
        toInsert: getRows(data, "pushSubscriptions").length,
      },
    ];
  }

  if (scope === "ASSETS") {
    const [storageCount, folderCount, mediaCount, photosCount, mediaRefsCount] =
      await Promise.all([
        prisma.storageProvider.count(),
        prisma.virtualFolder.count(),
        prisma.media.count(),
        prisma.photo.count(),
        prisma.mediaReference.count(),
      ]);

    return [
      {
        table: "StorageProvider",
        current: storageCount,
        incoming: getRows(data, "storageProviders").length,
        toDelete: storageCount,
        toInsert: getRows(data, "storageProviders").length,
      },
      {
        table: "VirtualFolder",
        current: folderCount,
        incoming: getRows(data, "virtualFolders").length,
        toDelete: folderCount,
        toInsert: getRows(data, "virtualFolders").length,
      },
      {
        table: "Media",
        current: mediaCount,
        incoming: getRows(data, "media").length,
        toDelete: mediaCount,
        toInsert: getRows(data, "media").length,
      },
      {
        table: "Photo",
        current: photosCount,
        incoming: getRows(data, "photos").length,
        toDelete: photosCount,
        toInsert: getRows(data, "photos").length,
      },
      {
        table: "MediaReference",
        current: mediaRefsCount,
        incoming: getRows(data, "mediaReferences").length,
        toDelete: mediaRefsCount,
        toInsert: getRows(data, "mediaReferences").length,
      },
    ];
  }

  if (scope === "CONTENT") {
    const [
      tagsCurrent,
      categoriesCurrent,
      postsCurrent,
      commentsCurrent,
      commentLikesCurrent,
      projectsCurrent,
      friendLinksCurrent,
      postTagCurrent,
      postCategoryCurrent,
      projectTagCurrent,
      projectCategoryCurrent,
    ] = await Promise.all([
      prisma.tag.count(),
      prisma.category.count(),
      prisma.post.count(),
      prisma.comment.count(),
      prisma.commentLike.count(),
      prisma.project.count(),
      prisma.friendLink.count(),
      countPostTagLinks(),
      countPostCategoryLinks(),
      countProjectTagLinks(),
      countProjectCategoryLinks(),
    ]);

    return [
      {
        table: "Tag",
        current: tagsCurrent,
        incoming: getRows(data, "tags").length,
        toDelete: tagsCurrent,
        toInsert: getRows(data, "tags").length,
      },
      {
        table: "Category",
        current: categoriesCurrent,
        incoming: getRows(data, "categories").length,
        toDelete: categoriesCurrent,
        toInsert: getRows(data, "categories").length,
      },
      {
        table: "Post",
        current: postsCurrent,
        incoming: getRows(data, "posts").length,
        toDelete: postsCurrent,
        toInsert: getRows(data, "posts").length,
      },
      {
        table: "PostTagLink",
        current: postTagCurrent,
        incoming: getRows(data, "postTagLinks").length,
        toDelete: postTagCurrent,
        toInsert: getRows(data, "postTagLinks").length,
      },
      {
        table: "PostCategoryLink",
        current: postCategoryCurrent,
        incoming: getRows(data, "postCategoryLinks").length,
        toDelete: postCategoryCurrent,
        toInsert: getRows(data, "postCategoryLinks").length,
      },
      {
        table: "Comment",
        current: commentsCurrent,
        incoming: getRows(data, "comments").length,
        toDelete: commentsCurrent,
        toInsert: getRows(data, "comments").length,
      },
      {
        table: "CommentLike",
        current: commentLikesCurrent,
        incoming: getRows(data, "commentLikes").length,
        toDelete: commentLikesCurrent,
        toInsert: getRows(data, "commentLikes").length,
      },
      {
        table: "Project",
        current: projectsCurrent,
        incoming: getRows(data, "projects").length,
        toDelete: projectsCurrent,
        toInsert: getRows(data, "projects").length,
      },
      {
        table: "ProjectTagLink",
        current: projectTagCurrent,
        incoming: getRows(data, "projectTagLinks").length,
        toDelete: projectTagCurrent,
        toInsert: getRows(data, "projectTagLinks").length,
      },
      {
        table: "ProjectCategoryLink",
        current: projectCategoryCurrent,
        incoming: getRows(data, "projectCategoryLinks").length,
        toDelete: projectCategoryCurrent,
        toInsert: getRows(data, "projectCategoryLinks").length,
      },
      {
        table: "FriendLink",
        current: friendLinksCurrent,
        incoming: getRows(data, "friendLinks").length,
        toDelete: friendLinksCurrent,
        toInsert: getRows(data, "friendLinks").length,
      },
    ];
  }

  if (scope === "ANALYTICS") {
    const [viewCountCurrent, pageViewCurrent, archiveCurrent, searchCurrent] =
      await Promise.all([
        prisma.viewCountCache.count(),
        prisma.pageView.count(),
        prisma.pageViewArchive.count(),
        prisma.searchLog.count(),
      ]);

    return [
      {
        table: "ViewCountCache",
        current: viewCountCurrent,
        incoming: getRows(data, "viewCountCaches").length,
        toDelete: viewCountCurrent,
        toInsert: getRows(data, "viewCountCaches").length,
      },
      {
        table: "PageView",
        current: pageViewCurrent,
        incoming: getRows(data, "pageViews").length,
        toDelete: pageViewCurrent,
        toInsert: getRows(data, "pageViews").length,
      },
      {
        table: "PageViewArchive",
        current: archiveCurrent,
        incoming: getRows(data, "pageViewArchives").length,
        toDelete: archiveCurrent,
        toInsert: getRows(data, "pageViewArchives").length,
      },
      {
        table: "SearchLog",
        current: searchCurrent,
        incoming: getRows(data, "searchLogs").length,
        toDelete: searchCurrent,
        toInsert: getRows(data, "searchLogs").length,
      },
    ];
  }

  const [auditCurrent, healthCurrent, cronCurrent, cloudCurrent] =
    await Promise.all([
      prisma.auditLog.count(),
      prisma.healthCheck.count(),
      prisma.cronHistory.count(),
      prisma.cloudTriggerHistory.count(),
    ]);

  return [
    {
      table: "AuditLog",
      current: auditCurrent,
      incoming: getRows(data, "auditLogs").length,
      toDelete: auditCurrent,
      toInsert: getRows(data, "auditLogs").length,
    },
    {
      table: "HealthCheck",
      current: healthCurrent,
      incoming: getRows(data, "healthChecks").length,
      toDelete: healthCurrent,
      toInsert: getRows(data, "healthChecks").length,
    },
    {
      table: "CronHistory",
      current: cronCurrent,
      incoming: getRows(data, "cronHistories").length,
      toDelete: cronCurrent,
      toInsert: getRows(data, "cronHistories").length,
    },
    {
      table: "CloudTriggerHistory",
      current: cloudCurrent,
      incoming: getRows(data, "cloudTriggerHistories").length,
      toDelete: cloudCurrent,
      toInsert: getRows(data, "cloudTriggerHistories").length,
    },
  ];
}

async function buildDependencyIssues(
  scope: BackupScope,
  data: BackupData,
): Promise<BackupIssue[]> {
  const issues: BackupIssue[] = [];

  if (scope === "CORE_BASE") {
    const incomingUserUids = new Set(
      uniqueNumbers(
        getRows(data, "users").map((row) => readNumber(row, "uid")),
      ),
    );
    const incomingConversationIds = new Set(
      uniqueStrings(
        getRows(data, "conversations").map((row) => readString(row, "id")),
      ),
    );
    const incomingMessageIds = new Set(
      uniqueStrings(
        getRows(data, "messages").map((row) => readString(row, "id")),
      ),
    );

    const participantConversationIds = uniqueStrings(
      getRows(data, "conversationParticipants").map((row) =>
        readString(row, "conversationId"),
      ),
    );
    const participantUserUids = uniqueNumbers(
      getRows(data, "conversationParticipants").map((row) =>
        readNumber(row, "userUid"),
      ),
    );
    const messageConversationIds = uniqueStrings(
      getRows(data, "messages").map((row) => readString(row, "conversationId")),
    );
    const messageSenderUids = uniqueNumbers(
      getRows(data, "messages").map((row) => readNumber(row, "senderUid")),
    );
    const replyToMessageIds = uniqueStrings(
      getRows(data, "messages").map((row) =>
        readString(row, "replyToMessageId"),
      ),
    );

    const missingParticipantConversations = participantConversationIds.filter(
      (conversationId) => !incomingConversationIds.has(conversationId),
    );
    if (missingParticipantConversations.length > 0) {
      issues.push({
        level: "error",
        code: "MISSING_CONVERSATIONS_FOR_PARTICIPANTS",
        message: "会话参与者数据存在未定义的 Conversation 引用",
      });
    }

    const missingParticipantUsers = participantUserUids.filter(
      (userUid) => !incomingUserUids.has(userUid),
    );
    if (missingParticipantUsers.length > 0) {
      issues.push({
        level: "error",
        code: "MISSING_USERS_FOR_PARTICIPANTS",
        message: "会话参与者数据存在未定义的 User 引用",
      });
    }

    const missingMessageConversations = messageConversationIds.filter(
      (conversationId) => !incomingConversationIds.has(conversationId),
    );
    if (missingMessageConversations.length > 0) {
      issues.push({
        level: "error",
        code: "MISSING_CONVERSATIONS_FOR_MESSAGES",
        message: "私信数据存在未定义的 Conversation 引用",
      });
    }

    const missingMessageSenders = messageSenderUids.filter(
      (userUid) => !incomingUserUids.has(userUid),
    );
    if (missingMessageSenders.length > 0) {
      issues.push({
        level: "error",
        code: "MISSING_USERS_FOR_MESSAGES",
        message: "私信数据存在未定义的发送者 User 引用",
      });
    }

    const missingReplyTargets = replyToMessageIds.filter(
      (messageId) => !incomingMessageIds.has(messageId),
    );
    if (missingReplyTargets.length > 0) {
      issues.push({
        level: "error",
        code: "MISSING_MESSAGE_REPLY_TARGETS",
        message: "私信回复关系中存在找不到的 replyToMessageId",
      });
    }

    const [postCount, projectCount, commentCount, mediaCount, mediaRefCount] =
      await Promise.all([
        prisma.post.count(),
        prisma.project.count(),
        prisma.comment.count(),
        prisma.media.count(),
        prisma.mediaReference.count(),
      ]);

    if (
      postCount + projectCount + commentCount + mediaCount + mediaRefCount >
      0
    ) {
      issues.push({
        level: "warning",
        code: "CORE_BASE_RESTORE_RISK",
        message:
          "当前实例已有内容或媒体数据，替换核心基础配置可能导致关联数据异常，建议在空库或新实例执行，或者依次按顺序还原全部内容",
      });
    }
  }

  if (scope === "CONTENT") {
    const users = uniqueNumbers([
      ...getRows(data, "posts").map((row) => readNumber(row, "userUid")),
      ...getRows(data, "projects").map((row) => readNumber(row, "userUid")),
      ...getRows(data, "friendLinks").map((row) => readNumber(row, "ownerId")),
      ...getRows(data, "friendLinks").map((row) =>
        readNumber(row, "auditorId"),
      ),
      ...getRows(data, "comments").map((row) => readNumber(row, "userUid")),
      ...getRows(data, "commentLikes").map((row) => readNumber(row, "userUid")),
    ]);
    if (users.length > 0) {
      const existed = await prisma.user.count({
        where: {
          uid: {
            in: users,
          },
        },
      });
      if (existed !== users.length) {
        issues.push({
          level: "error",
          code: "MISSING_CORE_BASE_USERS",
          message:
            "内容包依赖的用户数据不完整，请先还原核心基础分组或确认目标库用户存在",
        });
      }
    }

    const pageIds = uniqueStrings(
      getRows(data, "comments").map((row) => readString(row, "pageId")),
    );
    if (pageIds.length > 0) {
      const existed = await prisma.page.count({
        where: {
          id: {
            in: pageIds,
          },
        },
      });
      if (existed !== pageIds.length) {
        issues.push({
          level: "error",
          code: "MISSING_CORE_BASE_PAGES",
          message:
            "评论数据引用了不存在的页面，请先还原核心基础分组中的 Page 数据",
        });
      }
    }

    const incomingPostIds = new Set(
      uniqueNumbers(getRows(data, "posts").map((row) => readNumber(row, "id"))),
    );
    const commentPostIds = uniqueNumbers(
      getRows(data, "comments").map((row) => readNumber(row, "postId")),
    );
    const missingCommentPost = commentPostIds.filter(
      (postId) => !incomingPostIds.has(postId),
    );
    if (missingCommentPost.length > 0) {
      issues.push({
        level: "error",
        code: "MISSING_COMMENT_POSTS",
        message: "评论数据中存在找不到对应 Post 的记录",
      });
    }

    const incomingCommentIds = new Set(
      uniqueStrings(
        getRows(data, "comments").map((row) => readString(row, "id")),
      ),
    );
    const parentCommentIds = uniqueStrings(
      getRows(data, "comments").map((row) => readString(row, "parentId")),
    );
    const missingParentComments = parentCommentIds.filter(
      (commentId) => !incomingCommentIds.has(commentId),
    );
    if (missingParentComments.length > 0) {
      issues.push({
        level: "error",
        code: "MISSING_COMMENT_PARENTS",
        message: "评论数据中存在找不到对应父评论的 parentId",
      });
    }

    const likedCommentIds = uniqueStrings(
      getRows(data, "commentLikes").map((row) => readString(row, "commentId")),
    );
    const missingLikeComment = likedCommentIds.filter(
      (commentId) => !incomingCommentIds.has(commentId),
    );
    if (missingLikeComment.length > 0) {
      issues.push({
        level: "error",
        code: "MISSING_LIKE_COMMENTS",
        message: "评论点赞数据中存在找不到对应 Comment 的记录",
      });
    }

    const existingCommentCount = await prisma.comment.count({
      where: {
        deletedAt: null,
      },
    });
    if (existingCommentCount > 0) {
      issues.push({
        level: "warning",
        code: "CONTENT_CASCADE_WARNING",
        message:
          "当前实例存在评论数据，替换内容会覆盖现有评论与点赞，请确认这是预期行为",
      });
    }

    const [existingMediaReferenceCount, existingViewCountCacheCount] =
      await Promise.all([
        prisma.mediaReference.count({
          where: {
            OR: [
              { postId: { not: null } },
              { projectId: { not: null } },
              { tagSlug: { not: null } },
              { categoryId: { not: null } },
            ],
          },
        }),
        prisma.viewCountCache.count({
          where: {
            postSlug: {
              not: null,
            },
          },
        }),
      ]);

    if (existingMediaReferenceCount > 0) {
      issues.push({
        level: "warning",
        code: "CONTENT_ASSETS_CASCADE_WARNING",
        message:
          "替换内容会级联删除与文章/项目/标签/分类关联的媒体引用，请确认是否已准备重建媒体关系",
      });
    }

    if (existingViewCountCacheCount > 0) {
      issues.push({
        level: "warning",
        code: "CONTENT_ANALYTICS_CASCADE_WARNING",
        message:
          "替换内容会级联删除与文章 slug 绑定的访问缓存数据，请确认统计数据可接受重建",
      });
    }
  }

  if (scope === "ASSETS") {
    const users = uniqueNumbers(
      getRows(data, "media").map((row) => readNumber(row, "userUid")),
    );
    if (users.length > 0) {
      const existed = await prisma.user.count({
        where: {
          uid: {
            in: users,
          },
        },
      });
      if (existed !== users.length) {
        issues.push({
          level: "error",
          code: "MISSING_CORE_BASE_USERS",
          message:
            "媒体数据依赖的用户不存在，请先还原核心基础分组或确认目标库用户存在",
        });
      }
    }

    const incomingStorageIds = new Set(
      uniqueStrings(
        getRows(data, "storageProviders").map((row) => readString(row, "id")),
      ),
    );
    const referencedStorageIds = uniqueStrings(
      getRows(data, "media").map((row) => readString(row, "storageProviderId")),
    );
    const missingStorageIds = referencedStorageIds.filter(
      (id) => !incomingStorageIds.has(id),
    );
    if (missingStorageIds.length > 0) {
      issues.push({
        level: "error",
        code: "MISSING_STORAGE_PROVIDER",
        message: "媒体数据引用了未出现在分组中的 StorageProvider",
      });
    }

    const incomingFolderIds = new Set(
      uniqueNumbers(
        getRows(data, "virtualFolders").map((row) => readNumber(row, "id")),
      ),
    );
    const referencedFolderIds = uniqueNumbers(
      getRows(data, "media").map((row) => readNumber(row, "folderId")),
    );
    const missingFolderIds = referencedFolderIds.filter(
      (id) => !incomingFolderIds.has(id),
    );
    if (missingFolderIds.length > 0) {
      issues.push({
        level: "error",
        code: "MISSING_FOLDERS",
        message: "媒体数据引用了未出现在分组中的 VirtualFolder",
      });
    }

    const incomingMediaIds = new Set(
      uniqueNumbers(getRows(data, "media").map((row) => readNumber(row, "id"))),
    );
    const photoMediaIds = uniqueNumbers(
      getRows(data, "photos").map((row) => readNumber(row, "mediaId")),
    );
    const missingPhotoMedia = photoMediaIds.filter(
      (mediaId) => !incomingMediaIds.has(mediaId),
    );
    if (missingPhotoMedia.length > 0) {
      issues.push({
        level: "error",
        code: "MISSING_MEDIA_FOR_PHOTO",
        message: "图库数据中存在找不到对应 Media 的记录",
      });
    }

    const mediaRefMediaIds = uniqueNumbers(
      getRows(data, "mediaReferences").map((row) => readNumber(row, "mediaId")),
    );
    const missingReferenceMedia = mediaRefMediaIds.filter(
      (mediaId) => !incomingMediaIds.has(mediaId),
    );
    if (missingReferenceMedia.length > 0) {
      issues.push({
        level: "error",
        code: "MISSING_MEDIA_FOR_REFERENCE",
        message: "媒体引用关系中存在找不到对应 Media 的记录",
      });
    }

    const [refPostIds, refPageIds, refTagSlugs, refCategoryIds, refProjectIds] =
      [
        uniqueNumbers(
          getRows(data, "mediaReferences").map((row) =>
            readNumber(row, "postId"),
          ),
        ),
        uniqueStrings(
          getRows(data, "mediaReferences").map((row) =>
            readString(row, "pageId"),
          ),
        ),
        uniqueStrings(
          getRows(data, "mediaReferences").map((row) =>
            readString(row, "tagSlug"),
          ),
        ),
        uniqueNumbers(
          getRows(data, "mediaReferences").map((row) =>
            readNumber(row, "categoryId"),
          ),
        ),
        uniqueNumbers(
          getRows(data, "mediaReferences").map((row) =>
            readNumber(row, "projectId"),
          ),
        ),
      ];

    const [postExists, pageExists, tagExists, categoryExists, projectExists] =
      await Promise.all([
        refPostIds.length > 0
          ? prisma.post.count({ where: { id: { in: refPostIds } } })
          : Promise.resolve(0),
        refPageIds.length > 0
          ? prisma.page.count({ where: { id: { in: refPageIds } } })
          : Promise.resolve(0),
        refTagSlugs.length > 0
          ? prisma.tag.count({ where: { slug: { in: refTagSlugs } } })
          : Promise.resolve(0),
        refCategoryIds.length > 0
          ? prisma.category.count({ where: { id: { in: refCategoryIds } } })
          : Promise.resolve(0),
        refProjectIds.length > 0
          ? prisma.project.count({ where: { id: { in: refProjectIds } } })
          : Promise.resolve(0),
      ]);

    if (refPostIds.length > 0 && postExists !== refPostIds.length) {
      issues.push({
        level: "error",
        code: "MISSING_POSTS_FOR_MEDIA_REFERENCE",
        message: "媒体引用关系中的 Post 不存在，请先还原内容分组",
      });
    }
    if (refPageIds.length > 0 && pageExists !== refPageIds.length) {
      issues.push({
        level: "error",
        code: "MISSING_PAGES_FOR_MEDIA_REFERENCE",
        message: "媒体引用关系中的 Page 不存在，请先还原核心基础分组",
      });
    }
    if (refTagSlugs.length > 0 && tagExists !== refTagSlugs.length) {
      issues.push({
        level: "error",
        code: "MISSING_TAGS_FOR_MEDIA_REFERENCE",
        message: "媒体引用关系中的 Tag 不存在，请先还原内容分组",
      });
    }
    if (refCategoryIds.length > 0 && categoryExists !== refCategoryIds.length) {
      issues.push({
        level: "error",
        code: "MISSING_CATEGORIES_FOR_MEDIA_REFERENCE",
        message: "媒体引用关系中的 Category 不存在，请先还原内容分组",
      });
    }
    if (refProjectIds.length > 0 && projectExists !== refProjectIds.length) {
      issues.push({
        level: "error",
        code: "MISSING_PROJECTS_FOR_MEDIA_REFERENCE",
        message: "媒体引用关系中的 Project 不存在，请先还原内容分组",
      });
    }
  }

  if (scope === "ANALYTICS") {
    const slugs = uniqueStrings(
      getRows(data, "viewCountCaches").map((row) =>
        readString(row, "postSlug"),
      ),
    );
    if (slugs.length > 0) {
      const existed = await prisma.post.count({
        where: {
          slug: {
            in: slugs,
          },
        },
      });
      if (existed !== slugs.length) {
        issues.push({
          level: "error",
          code: "MISSING_POST_SLUGS",
          message:
            "访问统计中存在部分文章 slug 在目标库中不存在，请先还原内容分组后再导入分析数据",
        });
      }
    }
  }

  return issues;
}

function parseAndValidateArchive(content: string, sizeBytes: number) {
  const archive = parseBackupArchive(content);
  const checksum = computeChecksum(archive.meta.scope, archive.data);

  if (!verifyBackupChecksum(archive)) {
    throw new Error("备份文件校验和不一致，文件可能被修改或损坏");
  }

  return {
    archive,
    checksum,
    sizeBytes,
  } satisfies ParsedAndValidatedArchive;
}

function ensureArchiveScope(
  parsed: ParsedAndValidatedArchive,
  expectedScope?: BackupScope,
) {
  if (expectedScope && parsed.archive.meta.scope !== expectedScope) {
    throw new Error(
      `备份分组不匹配：期望 ${expectedScope}，实际 ${parsed.archive.meta.scope}`,
    );
  }
}

async function createManyInBatches(
  rows: BackupRow[],
  handler: (batch: BackupRow[]) => Promise<number>,
  batchSize = 300,
): Promise<number> {
  if (rows.length === 0) return 0;

  let total = 0;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    total += await handler(batch);
  }
  return total;
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function assertSafeSqlIdentifier(value: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`检测到不安全的 SQL 标识符: ${value}`);
  }
  return value;
}

function quoteSqlIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function resetTableSequence(
  tx: PrismaTransaction,
  target: SequenceTarget,
): Promise<void> {
  const tableName = assertSafeSqlIdentifier(target.table);
  const columnName = assertSafeSqlIdentifier(target.column);
  const quotedTable = quoteSqlIdentifier(tableName);
  const quotedColumn = quoteSqlIdentifier(columnName);

  const sequenceRows = await tx.$queryRawUnsafe<Array<{ seq: string | null }>>(
    `SELECT pg_get_serial_sequence('${escapeSqlLiteral(quotedTable)}', '${escapeSqlLiteral(columnName)}') AS seq`,
  );
  const sequenceName = sequenceRows[0]?.seq;
  if (!sequenceName) {
    return;
  }

  await tx.$executeRawUnsafe(
    `SELECT setval(
      '${escapeSqlLiteral(sequenceName)}',
      COALESCE((SELECT MAX(${quotedColumn}) FROM ${quotedTable}), 1),
      EXISTS (SELECT 1 FROM ${quotedTable})
    )`,
  );
}

async function resetAutoIncrementSequences(
  tx: PrismaTransaction,
  scope: BackupScope,
): Promise<void> {
  for (const target of AUTOINCREMENT_SEQUENCE_TARGETS[scope]) {
    await resetTableSequence(tx, target);
  }
}

async function setPostTagLinks(
  tx: PrismaTransaction,
  links: BackupRow[],
): Promise<number> {
  const grouped = new Map<number, Set<string>>();
  for (const link of links) {
    const postId = readNumber(link, "postId");
    const tagSlug = readString(link, "tagSlug");
    if (postId === null || !tagSlug) continue;

    const target = grouped.get(postId) ?? new Set<string>();
    target.add(tagSlug);
    grouped.set(postId, target);
  }

  let total = 0;
  for (const [postId, slugs] of grouped) {
    await tx.post.update({
      where: { id: postId },
      data: {
        tags: {
          set: Array.from(slugs).map((slug) => ({ slug })),
        },
      },
    });
    total += slugs.size;
  }

  return total;
}

async function setPostCategoryLinks(
  tx: PrismaTransaction,
  links: BackupRow[],
): Promise<number> {
  const grouped = new Map<number, Set<number>>();
  for (const link of links) {
    const postId = readNumber(link, "postId");
    const categoryId = readNumber(link, "categoryId");
    if (postId === null || categoryId === null) continue;

    const target = grouped.get(postId) ?? new Set<number>();
    target.add(categoryId);
    grouped.set(postId, target);
  }

  let total = 0;
  for (const [postId, ids] of grouped) {
    await tx.post.update({
      where: { id: postId },
      data: {
        categories: {
          set: Array.from(ids).map((id) => ({ id })),
        },
      },
    });
    total += ids.size;
  }

  return total;
}

async function setProjectTagLinks(
  tx: PrismaTransaction,
  links: BackupRow[],
): Promise<number> {
  const grouped = new Map<number, Set<string>>();
  for (const link of links) {
    const projectId = readNumber(link, "projectId");
    const tagSlug = readString(link, "tagSlug");
    if (projectId === null || !tagSlug) continue;

    const target = grouped.get(projectId) ?? new Set<string>();
    target.add(tagSlug);
    grouped.set(projectId, target);
  }

  let total = 0;
  for (const [projectId, slugs] of grouped) {
    await tx.project.update({
      where: { id: projectId },
      data: {
        tags: {
          set: Array.from(slugs).map((slug) => ({ slug })),
        },
      },
    });
    total += slugs.size;
  }

  return total;
}

async function setProjectCategoryLinks(
  tx: PrismaTransaction,
  links: BackupRow[],
): Promise<number> {
  const grouped = new Map<number, Set<number>>();
  for (const link of links) {
    const projectId = readNumber(link, "projectId");
    const categoryId = readNumber(link, "categoryId");
    if (projectId === null || categoryId === null) continue;

    const target = grouped.get(projectId) ?? new Set<number>();
    target.add(categoryId);
    grouped.set(projectId, target);
  }

  let total = 0;
  for (const [projectId, ids] of grouped) {
    await tx.project.update({
      where: { id: projectId },
      data: {
        categories: {
          set: Array.from(ids).map((id) => ({ id })),
        },
      },
    });
    total += ids.size;
  }

  return total;
}

async function replaceCoreBaseScope(
  tx: PrismaTransaction,
  data: BackupData,
): Promise<BackupApplySummary> {
  const users = getRows(data, "users");
  const accounts = getRows(data, "accounts");
  const refreshTokens = getRows(data, "refreshTokens");
  const passwordResets = getRows(data, "passwordResets");
  const passkeys = getRows(data, "passkeys");
  const configs = getRows(data, "configs");
  const pages = getRows(data, "pages");
  const menus = getRows(data, "menus");
  const customDictionary = getRows(data, "customDictionary");
  const notices = getRows(data, "notices");
  const conversations = getRows(data, "conversations");
  const conversationParticipants = getRows(data, "conversationParticipants");
  const messages = [...getRows(data, "messages")].sort((left, right) => {
    const leftCreated = readString(left, "createdAt") || "";
    const rightCreated = readString(right, "createdAt") || "";
    return leftCreated.localeCompare(rightCreated);
  });
  const mailSubscriptions = getRows(data, "mailSubscriptions");
  const pushSubscriptions = getRows(data, "pushSubscriptions");

  const existingPlans = await createTablePlans("CORE_BASE", data);

  await tx.message.deleteMany();
  await tx.conversationParticipant.deleteMany();
  await tx.conversation.deleteMany();
  await tx.notice.deleteMany();
  await tx.pushSubscription.deleteMany();
  await tx.refreshToken.deleteMany();
  await tx.passwordReset.deleteMany();
  await tx.passkey.deleteMany();
  await tx.account.deleteMany();
  await tx.mailSubscription.deleteMany();
  await tx.menu.deleteMany();
  await tx.page.deleteMany();
  await tx.config.deleteMany();
  await tx.customDictionary.deleteMany();
  await tx.user.deleteMany();

  await createManyInBatches(users, async (batch) => {
    const result = await tx.user.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(configs, async (batch) => {
    const result = await tx.config.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(customDictionary, async (batch) => {
    const result = await tx.customDictionary.createMany({
      data: batch as never,
    });
    return result.count;
  });
  await createManyInBatches(pages, async (batch) => {
    const result = await tx.page.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(menus, async (batch) => {
    const result = await tx.menu.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(accounts, async (batch) => {
    const result = await tx.account.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(refreshTokens, async (batch) => {
    const result = await tx.refreshToken.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(passwordResets, async (batch) => {
    const result = await tx.passwordReset.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(passkeys, async (batch) => {
    const result = await tx.passkey.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(notices, async (batch) => {
    const result = await tx.notice.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(mailSubscriptions, async (batch) => {
    const result = await tx.mailSubscription.createMany({
      data: batch as never,
    });
    return result.count;
  });
  await createManyInBatches(pushSubscriptions, async (batch) => {
    const result = await tx.pushSubscription.createMany({
      data: batch as never,
    });
    return result.count;
  });
  await createManyInBatches(conversations, async (batch) => {
    const result = await tx.conversation.createMany({
      data: batch as never,
    });
    return result.count;
  });
  await createManyInBatches(conversationParticipants, async (batch) => {
    const result = await tx.conversationParticipant.createMany({
      data: batch as never,
    });
    return result.count;
  });
  await createManyInBatches(messages, async (batch) => {
    const result = await tx.message.createMany({
      data: batch as never,
    });
    return result.count;
  });

  await resetAutoIncrementSequences(tx, "CORE_BASE");

  const tableStats = existingPlans.map((item) => ({
    ...item,
    toDelete: item.current,
    toInsert: item.incoming,
  }));

  return {
    tableStats,
    deletedRows: sumTableRows(tableStats, "toDelete"),
    insertedRows: sumTableRows(tableStats, "toInsert"),
  };
}

async function replaceAssetsScope(
  tx: PrismaTransaction,
  data: BackupData,
): Promise<BackupApplySummary> {
  const storageProviders = getRows(data, "storageProviders");
  const virtualFolders = [...getRows(data, "virtualFolders")].sort(
    (left, right) => {
      const leftDepth = readNumber(left, "depth") ?? 0;
      const rightDepth = readNumber(right, "depth") ?? 0;
      return leftDepth - rightDepth;
    },
  );
  const media = getRows(data, "media");
  const photos = getRows(data, "photos");
  const mediaReferences = getRows(data, "mediaReferences");

  const existingPlans = await createTablePlans("ASSETS", data);

  await tx.mediaReference.deleteMany();
  await tx.photo.deleteMany();
  await tx.media.deleteMany();
  await tx.virtualFolder.deleteMany();
  await tx.storageProvider.deleteMany();

  await createManyInBatches(storageProviders, async (batch) => {
    const result = await tx.storageProvider.createMany({
      data: batch as never,
    });
    return result.count;
  });
  await createManyInBatches(virtualFolders, async (batch) => {
    const result = await tx.virtualFolder.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(media, async (batch) => {
    const result = await tx.media.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(photos, async (batch) => {
    const result = await tx.photo.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(mediaReferences, async (batch) => {
    const result = await tx.mediaReference.createMany({ data: batch as never });
    return result.count;
  });

  await resetAutoIncrementSequences(tx, "ASSETS");

  const tableStats = existingPlans.map((item) => ({
    ...item,
    toDelete: item.current,
    toInsert: item.incoming,
  }));

  return {
    tableStats,
    deletedRows: sumTableRows(tableStats, "toDelete"),
    insertedRows: sumTableRows(tableStats, "toInsert"),
  };
}

async function replaceContentScope(
  tx: PrismaTransaction,
  data: BackupData,
): Promise<BackupApplySummary> {
  const tags = getRows(data, "tags");
  const categories = [...getRows(data, "categories")].sort((left, right) => {
    const leftDepth = readNumber(left, "depth") ?? 0;
    const rightDepth = readNumber(right, "depth") ?? 0;
    return leftDepth - rightDepth;
  });
  const posts = getRows(data, "posts");
  const postTagLinks = getRows(data, "postTagLinks");
  const postCategoryLinks = getRows(data, "postCategoryLinks");
  const comments = [...getRows(data, "comments")].sort((left, right) => {
    const leftDepth = readNumber(left, "depth") ?? 0;
    const rightDepth = readNumber(right, "depth") ?? 0;
    if (leftDepth !== rightDepth) return leftDepth - rightDepth;

    const leftCreated = readString(left, "createdAt") || "";
    const rightCreated = readString(right, "createdAt") || "";
    return leftCreated.localeCompare(rightCreated);
  });
  const commentLikes = getRows(data, "commentLikes");
  const projects = getRows(data, "projects");
  const projectTagLinks = getRows(data, "projectTagLinks");
  const projectCategoryLinks = getRows(data, "projectCategoryLinks");
  const friendLinks = getRows(data, "friendLinks");

  const existingPlans = await createTablePlans("CONTENT", data);

  await tx.commentLike.deleteMany();
  await tx.comment.deleteMany();
  await tx.friendLink.deleteMany();
  await tx.project.deleteMany();
  await tx.post.deleteMany();
  await tx.category.deleteMany();
  await tx.tag.deleteMany();

  await createManyInBatches(tags, async (batch) => {
    const result = await tx.tag.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(categories, async (batch) => {
    const result = await tx.category.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(posts, async (batch) => {
    const result = await tx.post.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(projects, async (batch) => {
    const result = await tx.project.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(friendLinks, async (batch) => {
    const result = await tx.friendLink.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(comments, async (batch) => {
    const result = await tx.comment.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(commentLikes, async (batch) => {
    const result = await tx.commentLike.createMany({ data: batch as never });
    return result.count;
  });

  await setPostTagLinks(tx, postTagLinks);
  await setPostCategoryLinks(tx, postCategoryLinks);
  await setProjectTagLinks(tx, projectTagLinks);
  await setProjectCategoryLinks(tx, projectCategoryLinks);

  await resetAutoIncrementSequences(tx, "CONTENT");

  const tableStats = existingPlans.map((item) => ({
    ...item,
    toDelete: item.current,
    toInsert: item.incoming,
  }));

  return {
    tableStats,
    deletedRows: sumTableRows(tableStats, "toDelete"),
    insertedRows: sumTableRows(tableStats, "toInsert"),
  };
}

async function replaceAnalyticsScope(
  tx: PrismaTransaction,
  data: BackupData,
): Promise<BackupApplySummary> {
  const viewCountCaches = getRows(data, "viewCountCaches");
  const pageViews = getRows(data, "pageViews");
  const pageViewArchives = getRows(data, "pageViewArchives");
  const searchLogs = getRows(data, "searchLogs");

  const existingPlans = await createTablePlans("ANALYTICS", data);

  await tx.pageView.deleteMany();
  await tx.pageViewArchive.deleteMany();
  await tx.viewCountCache.deleteMany();
  await tx.searchLog.deleteMany();

  await createManyInBatches(viewCountCaches, async (batch) => {
    const result = await tx.viewCountCache.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(pageViewArchives, async (batch) => {
    const result = await tx.pageViewArchive.createMany({
      data: batch as never,
    });
    return result.count;
  });
  await createManyInBatches(pageViews, async (batch) => {
    const result = await tx.pageView.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(searchLogs, async (batch) => {
    const result = await tx.searchLog.createMany({ data: batch as never });
    return result.count;
  });

  await resetAutoIncrementSequences(tx, "ANALYTICS");

  const tableStats = existingPlans.map((item) => ({
    ...item,
    toDelete: item.current,
    toInsert: item.incoming,
  }));

  return {
    tableStats,
    deletedRows: sumTableRows(tableStats, "toDelete"),
    insertedRows: sumTableRows(tableStats, "toInsert"),
  };
}

async function replaceOpsLogsScope(
  tx: PrismaTransaction,
  data: BackupData,
): Promise<BackupApplySummary> {
  const auditLogs = getRows(data, "auditLogs");
  const healthChecks = getRows(data, "healthChecks");
  const cronHistories = getRows(data, "cronHistories");
  const cloudTriggerHistories = getRows(data, "cloudTriggerHistories");

  const existingPlans = await createTablePlans("OPS_LOGS", data);

  await tx.cloudTriggerHistory.deleteMany();
  await tx.cronHistory.deleteMany();
  await tx.healthCheck.deleteMany();
  await tx.auditLog.deleteMany();

  await createManyInBatches(auditLogs, async (batch) => {
    const result = await tx.auditLog.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(healthChecks, async (batch) => {
    const result = await tx.healthCheck.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(cronHistories, async (batch) => {
    const result = await tx.cronHistory.createMany({ data: batch as never });
    return result.count;
  });
  await createManyInBatches(cloudTriggerHistories, async (batch) => {
    const result = await tx.cloudTriggerHistory.createMany({
      data: batch as never,
    });
    return result.count;
  });

  await resetAutoIncrementSequences(tx, "OPS_LOGS");

  const tableStats = existingPlans.map((item) => ({
    ...item,
    toDelete: item.current,
    toInsert: item.incoming,
  }));

  return {
    tableStats,
    deletedRows: sumTableRows(tableStats, "toDelete"),
    insertedRows: sumTableRows(tableStats, "toInsert"),
  };
}

async function applyReplaceImport(
  scope: BackupScope,
  data: BackupData,
): Promise<BackupApplySummary> {
  return prisma.$transaction(async (tx) => {
    if (scope === "CORE_BASE") {
      return replaceCoreBaseScope(tx, data);
    }
    if (scope === "ASSETS") {
      return replaceAssetsScope(tx, data);
    }
    if (scope === "CONTENT") {
      return replaceContentScope(tx, data);
    }
    if (scope === "ANALYTICS") {
      return replaceAnalyticsScope(tx, data);
    }
    return replaceOpsLogsScope(tx, data);
  });
}

function toDryRunResult(params: {
  scope: BackupScope;
  checksum: string;
  sizeBytes: number;
  issues: BackupIssue[];
  tablePlans: BackupTablePlan[];
}): BackupDryRunResult {
  const hasError = params.issues.some((item) => item.level === "error");
  return {
    scope: params.scope,
    mode: "REPLACE",
    checksum: params.checksum,
    sizeBytes: params.sizeBytes,
    ready: !hasError,
    confirmText: BACKUP_IMPORT_CONFIRM_TEXT,
    issues: params.issues,
    tablePlans: params.tablePlans,
    summary: {
      currentRows: sumTableRows(params.tablePlans, "current"),
      incomingRows: sumTableRows(params.tablePlans, "incoming"),
      toDelete: sumTableRows(params.tablePlans, "toDelete"),
      toInsert: sumTableRows(params.tablePlans, "toInsert"),
    },
  };
}

export async function dryRunBackupImport(params: {
  source: BackupSource;
  scope?: BackupScope;
}): Promise<BackupDryRunResult> {
  const loaded = await loadBackupSource(params.source);
  const parsed = parseAndValidateArchive(loaded.content, loaded.sizeBytes);

  ensureArchiveScope(parsed, params.scope);

  if (
    params.source.type === "OSS_URL" &&
    params.source.expectedChecksum &&
    params.source.expectedChecksum.toLowerCase() !==
      parsed.checksum.toLowerCase()
  ) {
    throw new Error("OSS 文件校验和与预期不一致");
  }

  const scope = parsed.archive.meta.scope;
  const issues: BackupIssue[] = [];

  const missingKeyIssues = requireDataKeys(scope, parsed.archive.data);
  issues.push(...missingKeyIssues);

  const dependencyIssues = await buildDependencyIssues(
    scope,
    parsed.archive.data,
  );
  issues.push(...dependencyIssues);

  const tablePlans = await createTablePlans(scope, parsed.archive.data);
  return toDryRunResult({
    scope,
    checksum: parsed.checksum,
    sizeBytes: parsed.sizeBytes,
    issues,
    tablePlans,
  });
}

export async function importBackup(params: {
  source: BackupSource;
  scope?: BackupScope;
  expectedChecksum: string;
  confirmText: string;
}): Promise<BackupImportResult> {
  if (params.confirmText.trim() !== BACKUP_IMPORT_CONFIRM_TEXT) {
    throw new Error("确认文本不匹配，已取消还原");
  }

  const loaded = await loadBackupSource(params.source);
  const parsed = parseAndValidateArchive(loaded.content, loaded.sizeBytes);

  ensureArchiveScope(parsed, params.scope);

  if (parsed.checksum.toLowerCase() !== params.expectedChecksum.toLowerCase()) {
    throw new Error("导入校验失败：请先重新执行 dry-run");
  }

  const scope = parsed.archive.meta.scope;
  const issues = [
    ...requireDataKeys(scope, parsed.archive.data),
    ...(await buildDependencyIssues(scope, parsed.archive.data)),
  ];
  const fatalIssue = issues.find((item) => item.level === "error");
  if (fatalIssue) {
    throw new Error(`无法导入：${fatalIssue.message}`);
  }

  const applied = await applyReplaceImport(scope, parsed.archive.data);

  return {
    scope,
    mode: "REPLACE",
    checksum: parsed.checksum,
    importedAt: new Date().toISOString(),
    tableStats: applied.tableStats,
    summary: {
      deletedRows: applied.deletedRows,
      insertedRows: applied.insertedRows,
    },
  };
}

export function getScopeTableNames(scope: BackupScope): string[] {
  return buildScopeTableNames(scope);
}

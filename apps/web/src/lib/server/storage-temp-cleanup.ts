import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { Octokit } from "@octokit/rest";
import { del as vercelDel, list as vercelList } from "@vercel/blob";

import { deleteObject, uploadObject } from "@/lib/server/oss";
import prisma from "@/lib/server/prisma";
import type { StorageProviderType } from "@/template/storages";

type StorageProviderRow = {
  id: string;
  name: string;
  type: StorageProviderType;
  baseUrl: string;
  pathTemplate: string;
  config: unknown;
};

type CleanupResult = {
  deletedEntries: number;
  skipped: boolean;
};

export type StorageTempCleanupSummary = {
  totalProviders: number;
  successProviders: number;
  failedProviders: number;
  skippedProviders: number;
  deletedEntries: number;
};

const TEMP_DIR_NAME = "temp";

function normalizePosixPath(p: string): string {
  const trimmed = p.trim();
  const normalized = path.posix.normalize(trimmed || "/");
  const withoutDots = normalized.replace(/^(\.\.(\/|\\|$))+/, "");
  return withoutDots.replace(/^\/+/, "");
}

function joinPrefix(prefix: string | undefined, key: string): string {
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

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return undefined;
}

async function countLocalEntries(dirPath: string): Promise<number> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let total = 0;

    for (const entry of entries) {
      total++;
      if (entry.isDirectory()) {
        total += await countLocalEntries(path.join(dirPath, entry.name));
      }
    }

    return total;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return 0;
    throw error;
  }
}

function createHealthcheckPathname(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${TEMP_DIR_NAME}/doctor-storage-healthcheck-${timestamp}-${random}.txt`;
}

async function verifyStorageByRoundTrip(provider: StorageProviderRow) {
  const configObj = asObject(provider.config);
  const healthcheckPath = createHealthcheckPathname();

  const result = await uploadObject({
    type: provider.type,
    baseUrl: provider.baseUrl,
    pathTemplate: provider.pathTemplate || "/{year}/{month}/{filename}",
    customPath: healthcheckPath,
    ensureUniqueName: false,
    config: configObj as never,
    file: {
      buffer: Buffer.from("doctor-storage-healthcheck"),
      filename: "doctor-storage-healthcheck.txt",
      contentType: "text/plain",
    },
  });

  await deleteObject({
    type: provider.type,
    baseUrl: provider.baseUrl,
    pathTemplate: provider.pathTemplate || "/{year}/{month}/{filename}",
    config: configObj as never,
    key: result.key,
  });
}

async function cleanupLocalTempDirectory(
  provider: StorageProviderRow,
): Promise<CleanupResult> {
  const configObj = asObject(provider.config);
  const rootDir = asString(configObj.rootDir);
  if (!rootDir) {
    throw new Error("LOCAL 存储缺少 config.rootDir");
  }

  const absoluteRoot = path.resolve(rootDir);
  const tempDir = path.resolve(absoluteRoot, TEMP_DIR_NAME);
  if (!tempDir.startsWith(absoluteRoot)) {
    throw new Error("LOCAL temp 目录路径非法");
  }

  const deletedEntries = await countLocalEntries(tempDir);
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.mkdir(tempDir, { recursive: true });

  await verifyStorageByRoundTrip(provider);

  return {
    deletedEntries,
    skipped: false,
  };
}

async function cleanupS3TempDirectory(
  provider: StorageProviderRow,
): Promise<CleanupResult> {
  const configObj = asObject(provider.config);
  const accessKeyId = asString(configObj.accessKeyId);
  const secretAccessKey = asString(configObj.secretAccessKey);
  const region = asString(configObj.region);
  const bucket = asString(configObj.bucket);
  const endpoint = asString(configObj.endpoint);
  const basePath = asString(configObj.basePath);
  const forcePathStyle = asBoolean(configObj.forcePathStyle) ?? false;

  if (!accessKeyId || !secretAccessKey || !region || !bucket) {
    throw new Error("AWS_S3 存储配置不完整");
  }

  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle,
    credentials: { accessKeyId, secretAccessKey },
  });

  const prefix = joinPrefix(basePath, `${TEMP_DIR_NAME}/`);
  let deletedEntries = 0;
  let continuationToken: string | undefined;

  do {
    const listed = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    const keys =
      listed.Contents?.map((item) => item.Key).filter(
        (item): item is string => !!item,
      ) || [];

    if (keys.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: keys.map((key) => ({ Key: key })),
          },
        }),
      );
      deletedEntries += keys.length;
    }

    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (continuationToken);

  await verifyStorageByRoundTrip(provider);

  return {
    deletedEntries,
    skipped: false,
  };
}

async function cleanupVercelBlobTempDirectory(
  provider: StorageProviderRow,
): Promise<CleanupResult> {
  const configObj = asObject(provider.config);
  const token = asString(configObj.token);
  const basePath = asString(configObj.basePath);

  if (!token) {
    throw new Error("VERCEL_BLOB 存储缺少 config.token");
  }

  const prefix = joinPrefix(basePath, `${TEMP_DIR_NAME}/`);
  let deletedEntries = 0;
  let cursor: string | undefined;

  do {
    const listed = await vercelList({
      token,
      prefix,
      cursor,
      limit: 1000,
    });

    const pathnames = listed.blobs.map((item) => item.pathname);
    if (pathnames.length > 0) {
      await vercelDel(pathnames, { token });
      deletedEntries += pathnames.length;
    }

    cursor = listed.hasMore ? listed.cursor : undefined;
  } while (cursor);

  await verifyStorageByRoundTrip(provider);

  return {
    deletedEntries,
    skipped: false,
  };
}

async function cleanupGithubTempDirectory(
  provider: StorageProviderRow,
): Promise<CleanupResult> {
  const configObj = asObject(provider.config);
  const owner = asString(configObj.owner);
  const repo = asString(configObj.repo);
  const branch = asString(configObj.branch);
  const token = asString(configObj.token);
  const basePath = asString(configObj.basePath);
  const apiBaseUrl = asString(configObj.apiBaseUrl);
  const committerName = asString(configObj.committerName) || "CMS Bot";
  const committerEmail =
    asString(configObj.committerEmail) || "cms-bot@example.com";

  if (!owner || !repo || !branch || !token) {
    throw new Error("GITHUB_PAGES 存储配置不完整");
  }

  const octokit = new Octokit({
    auth: token,
    ...(apiBaseUrl ? { baseUrl: apiBaseUrl } : {}),
  });

  const prefix = joinPrefix(basePath, `${TEMP_DIR_NAME}/`);

  const ref = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`,
  });
  const commit = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: ref.data.object.sha,
  });
  const tree = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: commit.data.tree.sha,
    recursive: "true",
  });

  const tempFiles = tree.data.tree
    .map((node) => {
      if (
        node.type === "blob" &&
        typeof node.path === "string" &&
        typeof node.sha === "string" &&
        node.path.startsWith(prefix)
      ) {
        return {
          path: node.path,
          sha: node.sha,
        };
      }
      return null;
    })
    .filter((node): node is { path: string; sha: string } => node !== null);

  for (const file of tempFiles) {
    await octokit.repos.deleteFile({
      owner,
      repo,
      path: file.path,
      message: `chore(cms): doctor cleanup temp ${path.posix.basename(file.path)}`,
      branch,
      sha: file.sha,
      committer: {
        name: committerName,
        email: committerEmail,
      },
    });
  }

  return {
    deletedEntries: tempFiles.length,
    skipped: false,
  };
}

async function cleanupProviderTemp(
  provider: StorageProviderRow,
): Promise<CleanupResult> {
  if (provider.type === "EXTERNAL_URL") {
    return {
      deletedEntries: 0,
      skipped: true,
    };
  }
  if (provider.type === "LOCAL") {
    return cleanupLocalTempDirectory(provider);
  }
  if (provider.type === "AWS_S3") {
    return cleanupS3TempDirectory(provider);
  }
  if (provider.type === "VERCEL_BLOB") {
    return cleanupVercelBlobTempDirectory(provider);
  }
  if (provider.type === "GITHUB_PAGES") {
    return cleanupGithubTempDirectory(provider);
  }

  return {
    deletedEntries: 0,
    skipped: true,
  };
}

export async function cleanupStorageTempFolders(): Promise<StorageTempCleanupSummary> {
  const providers = await prisma.storageProvider.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      type: true,
      baseUrl: true,
      pathTemplate: true,
      config: true,
    },
  });

  const summary: StorageTempCleanupSummary = {
    totalProviders: providers.length,
    successProviders: 0,
    failedProviders: 0,
    skippedProviders: 0,
    deletedEntries: 0,
  };

  for (const provider of providers) {
    try {
      const result = await cleanupProviderTemp(provider);
      if (result.skipped) {
        summary.skippedProviders++;
      } else {
        summary.successProviders++;
        summary.deletedEntries += result.deletedEntries;
      }
    } catch (error) {
      summary.failedProviders++;
      console.error(
        `Storage temp cleanup failed for provider ${provider.name} (${provider.id}):`,
        error,
      );
    }
  }

  return summary;
}

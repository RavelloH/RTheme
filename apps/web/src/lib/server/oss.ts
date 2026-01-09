import "server-only";

import path from "node:path";
import fs from "node:fs/promises";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ObjectCannedACL,
} from "@aws-sdk/client-s3";
import { put as vercelPut, del as vercelDel } from "@vercel/blob";
import { Octokit } from "@octokit/rest";
import type { StorageProviderType } from "@/template/storages";

type UploadFile = {
  buffer: Buffer | Uint8Array;
  filename: string;
  contentType?: string;
};

type BaseProvider = {
  type: StorageProviderType;
  baseUrl: string;
  pathTemplate?: string;
  /**
   * 自定义路径（会覆盖路径模板，仍然支持占位符）
   */
  customPath?: string;
  /**
   * 建议传入 shorthash 作为 filename，或开启 ensureUniqueName 避免同名覆盖
   */
  ensureUniqueName?: boolean;
};

type LocalConfig = {
  rootDir: string;
  createDirIfNotExists?: boolean;
  fileMode?: string | number;
  dirMode?: string | number;
};

type S3Config = {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint?: string;
  basePath?: string;
  forcePathStyle?: boolean | string;
  acl?: string;
};

type VercelBlobConfig = {
  token: string;
  basePath?: string;
  access?: "public" | "private";
  cacheControl?: string;
};

type GithubConfig = {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  basePath?: string;
  committerName?: string;
  committerEmail?: string;
  apiBaseUrl?: string;
  commitMessageTemplate?: string;
};

type ExternalUrlConfig = object;

type UploadOptions =
  | (BaseProvider & { type: "LOCAL"; config: LocalConfig; file: UploadFile })
  | (BaseProvider & { type: "AWS_S3"; config: S3Config; file: UploadFile })
  | (BaseProvider & {
      type: "VERCEL_BLOB";
      config: VercelBlobConfig;
      file: UploadFile;
    })
  | (BaseProvider & {
      type: "GITHUB_PAGES";
      config: GithubConfig;
      file: UploadFile;
    })
  | (BaseProvider & {
      type: "EXTERNAL_URL";
      config: ExternalUrlConfig;
      file: UploadFile;
    });

type DeleteOptions =
  | (BaseProvider & { type: "LOCAL"; config: LocalConfig; key: string })
  | (BaseProvider & { type: "AWS_S3"; config: S3Config; key: string })
  | (BaseProvider & {
      type: "VERCEL_BLOB";
      config: VercelBlobConfig;
      key: string;
    })
  | (BaseProvider & {
      type: "GITHUB_PAGES";
      config: GithubConfig;
      key: string;
    })
  | (BaseProvider & {
      type: "EXTERNAL_URL";
      config: ExternalUrlConfig;
      key: string;
    });

export type UploadResult = {
  /**
   * 存储的相对路径（含 basePath/prefix）
   */
  key: string;
  /**
   * 可访问的完整 URL（使用 baseUrl 拼接或远端返回）
   */
  url: string;
};

// ---------------------------------------------------------------------------
// 主入口
// ---------------------------------------------------------------------------

export async function uploadObject(
  options: UploadOptions,
): Promise<UploadResult> {
  const relativeKey = buildObjectKey({
    filename: options.file.filename,
    pathTemplate: options.customPath || options.pathTemplate,
    ensureUniqueName: options.ensureUniqueName,
  });

  switch (options.type) {
    case "LOCAL":
      return uploadToLocal({ ...options, key: relativeKey });
    case "AWS_S3":
      return uploadToS3({ ...options, key: relativeKey });
    case "VERCEL_BLOB":
      return uploadToVercelBlob({ ...options, key: relativeKey });
    case "GITHUB_PAGES":
      return uploadToGithub({ ...options, key: relativeKey });
    case "EXTERNAL_URL":
      return uploadToExternalUrl({ ...options, key: relativeKey });
  }
}

export async function deleteObject(options: DeleteOptions): Promise<void> {
  switch (options.type) {
    case "LOCAL":
      return deleteFromLocal(options);
    case "AWS_S3":
      return deleteFromS3(options);
    case "VERCEL_BLOB":
      return deleteFromVercelBlob(options);
    case "GITHUB_PAGES":
      return deleteFromGithub(options);
    case "EXTERNAL_URL":
      return deleteFromExternalUrl(options);
  }
}

// ---------------------------------------------------------------------------
// 路径处理
// ---------------------------------------------------------------------------

type PathBuilderOptions = {
  filename: string;
  pathTemplate?: string;
  ensureUniqueName?: boolean;
  date?: Date;
};

export function buildObjectKey({
  filename,
  pathTemplate = "/{year}/{month}/{filename}",
  ensureUniqueName = false,
  date = new Date(),
}: PathBuilderOptions): string {
  const { baseName, extWithDot, extNoDot } = splitFilename(filename);
  const uniqueSuffix = ensureUniqueName
    ? `-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
    : "";

  const finalBase = sanitizeSegment(`${baseName}${uniqueSuffix}`);
  const finalFilename = extWithDot ? `${finalBase}${extWithDot}` : finalBase;

  const year = `${date.getFullYear()}`;
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  const rendered = pathTemplate
    .replace(/{year}/g, year)
    .replace(/{month}/g, month)
    .replace(/{day}/g, day)
    .replace(/{filename}/g, finalFilename)
    .replace(/{basename}/g, finalBase)
    .replace(/{ext}/g, extNoDot ?? "");

  return normalizePosixPath(rendered);
}

function splitFilename(filename: string): {
  baseName: string;
  extWithDot: string;
  extNoDot: string | null;
} {
  // 仅取最后一段，防止传入子路径
  const onlyName = path.posix.basename(filename);
  const ext = path.posix.extname(onlyName);
  const base = onlyName.slice(0, onlyName.length - ext.length);
  return {
    baseName: base || "file",
    extWithDot: ext,
    extNoDot: ext ? ext.replace(/^\./, "") : null,
  };
}

function sanitizeSegment(input: string): string {
  const replaced = input.replace(/[^\w.-]+/g, "_");
  // 避免纯点或空
  return replaced.replace(/^\.+$/, "file") || "file";
}

function normalizePosixPath(p: string): string {
  const trimmed = p.trim();
  const normalized = path.posix.normalize(trimmed || "/{filename}");
  // 去除开头的 ../，避免目录穿越
  const withoutDots = normalized.replace(/^(\.\.(\/|\\|$))+/, "");
  return withoutDots.replace(/^\/+/, "");
}

function joinPrefix(prefix: string | undefined, key: string): string {
  if (!prefix) return normalizePosixPath(key);
  return normalizePosixPath(path.posix.join(prefix, key));
}

function toPublicUrl(baseUrl: string, key: string): string {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const trimmedKey = key.replace(/^\/+/, "");
  return `${trimmedBase}/${trimmedKey}`;
}

function toBuffer(input: Buffer | Uint8Array): Buffer {
  return Buffer.isBuffer(input) ? input : Buffer.from(input);
}

// ---------------------------------------------------------------------------
// LOCAL
// ---------------------------------------------------------------------------

async function uploadToLocal(
  options: UploadOptions & { type: "LOCAL"; key: string },
): Promise<UploadResult> {
  const { config, baseUrl, file } = options;
  const { rootDir, createDirIfNotExists = true, fileMode, dirMode } = config;
  if (!rootDir) throw new Error("LOCAL config.rootDir is required");

  const absoluteRoot = path.resolve(rootDir);
  const relativeKey = normalizePosixPath(options.key);
  const diskPath = path.resolve(absoluteRoot, relativeKey);
  if (!diskPath.startsWith(absoluteRoot)) {
    throw new Error("Invalid file path");
  }

  const dir = path.dirname(diskPath);
  if (createDirIfNotExists) {
    await fs.mkdir(dir, {
      recursive: true,
      mode: dirMode !== undefined ? parseInt(String(dirMode), 8) : undefined,
    });
  }

  await fs.writeFile(diskPath, toBuffer(file.buffer), {
    mode: fileMode !== undefined ? parseInt(String(fileMode), 8) : undefined,
  });

  const key = relativeKey;
  const url = toPublicUrl(baseUrl, key);
  return { key, url };
}

async function deleteFromLocal(
  options: DeleteOptions & { type: "LOCAL" },
): Promise<void> {
  const { config, key } = options;
  const absoluteRoot = path.resolve(config.rootDir);
  const relativeKey = normalizePosixPath(key);
  const diskPath = path.resolve(absoluteRoot, relativeKey);
  if (!diskPath.startsWith(absoluteRoot)) {
    throw new Error("Invalid file path");
  }

  await fs.rm(diskPath, { force: true });
}

// ---------------------------------------------------------------------------
// AWS S3 及兼容对象存储
// ---------------------------------------------------------------------------

async function uploadToS3(
  options: UploadOptions & { type: "AWS_S3"; key: string },
): Promise<UploadResult> {
  const { config, baseUrl, file } = options;
  const {
    accessKeyId,
    secretAccessKey,
    region,
    bucket,
    endpoint,
    basePath,
    forcePathStyle,
    acl,
  } = config;

  if (!accessKeyId || !secretAccessKey || !region || !bucket) {
    throw new Error("AWS_S3 config missing required fields");
  }

  const key = joinPrefix(basePath, options.key);
  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle: forcePathStyle === true || forcePathStyle === "true",
    credentials: { accessKeyId, secretAccessKey },
  });

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: toBuffer(file.buffer),
      ContentType: file.contentType,
      ACL: acl as ObjectCannedACL | undefined,
    }),
  );

  const url = toPublicUrl(baseUrl, key);
  return { key, url };
}

async function deleteFromS3(
  options: DeleteOptions & { type: "AWS_S3" },
): Promise<void> {
  const { config, key } = options;
  const {
    bucket,
    region,
    accessKeyId,
    secretAccessKey,
    endpoint,
    forcePathStyle,
    basePath,
  } = config;
  if (!accessKeyId || !secretAccessKey || !region || !bucket) {
    throw new Error("AWS_S3 config missing required fields");
  }

  const objectKey = joinPrefix(basePath, key);
  const client = new S3Client({
    region,
    endpoint,
    forcePathStyle: forcePathStyle === true || forcePathStyle === "true",
    credentials: { accessKeyId, secretAccessKey },
  });

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    }),
  );
}

// ---------------------------------------------------------------------------
// Vercel Blob
// ---------------------------------------------------------------------------

async function uploadToVercelBlob(
  options: UploadOptions & { type: "VERCEL_BLOB"; key: string },
): Promise<UploadResult> {
  const { config, file, baseUrl } = options;
  const { token, basePath, access, cacheControl } = config;
  if (!token) throw new Error("VERCEL_BLOB config.token is required");

  const key = joinPrefix(basePath, options.key);
  // 定义 Vercel Blob Put options 类型
  interface VercelBlobPutOptions {
    access: "public";
    token: string;
    contentType?: string;
    cacheControl?: string;
  }

  const putOptions: VercelBlobPutOptions = {
    access: (access || "public") as "public",
    token,
    ...(file.contentType && { contentType: file.contentType }),
    ...(cacheControl && { cacheControl }),
  };

  const result = await vercelPut(key, toBuffer(file.buffer), putOptions);

  // result.url 是 blob 的完整访问地址，优先使用；否则用 baseUrl 拼接
  return {
    key,
    url: result.url ?? toPublicUrl(baseUrl, key),
  };
}

async function deleteFromVercelBlob(
  options: DeleteOptions & { type: "VERCEL_BLOB" },
): Promise<void> {
  const { config, baseUrl, key } = options;
  const { token, basePath } = config;
  if (!token) throw new Error("VERCEL_BLOB config.token is required");

  const objectKey = joinPrefix(basePath, key);
  const blobUrl = toPublicUrl(baseUrl, objectKey);
  await vercelDel(blobUrl, { token });
}

// ---------------------------------------------------------------------------
// GitHub Pages / Repo
// ---------------------------------------------------------------------------

async function uploadToGithub(
  options: UploadOptions & { type: "GITHUB_PAGES"; key: string },
): Promise<UploadResult> {
  const { config, file, baseUrl } = options;
  const {
    owner,
    repo,
    branch,
    token,
    basePath,
    committerName = "CMS Bot",
    committerEmail = "cms-bot@example.com",
    apiBaseUrl,
    commitMessageTemplate = "chore(cms): upload {{filename}}",
  } = config;

  if (!owner || !repo || !branch || !token) {
    throw new Error("GITHUB_PAGES config missing required fields");
  }

  const key = joinPrefix(basePath, options.key);
  const octokit = new Octokit({
    auth: token,
    ...(apiBaseUrl ? { baseUrl: apiBaseUrl } : {}),
  });

  const pathInRepo = key;
  const content = toBuffer(file.buffer).toString("base64");
  const commitMessage = commitMessageTemplate
    .replace("{{filename}}", path.posix.basename(key))
    .replace("{{datetime}}", new Date().toISOString());

  // 获取 sha（若文件已存在则更新，不存在则新建）
  let existingSha: string | undefined;
  try {
    const existing = await octokit.repos.getContent({
      owner,
      repo,
      path: pathInRepo,
      ref: branch,
    });
    if (!Array.isArray(existing.data) && "sha" in existing.data) {
      existingSha = existing.data.sha;
    }
  } catch {
    // 404 表示不存在，忽略
  }

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: pathInRepo,
    message: commitMessage,
    content,
    branch,
    committer: {
      name: committerName,
      email: committerEmail,
    },
    sha: existingSha,
  });

  const url = toPublicUrl(baseUrl, key);
  return { key, url };
}

async function deleteFromGithub(
  options: DeleteOptions & { type: "GITHUB_PAGES" },
): Promise<void> {
  const { config, key } = options;
  const {
    owner,
    repo,
    branch,
    token,
    basePath,
    committerName = "CMS Bot",
    committerEmail = "cms-bot@example.com",
    apiBaseUrl,
    commitMessageTemplate = "chore(cms): delete {{filename}}",
  } = config;

  if (!owner || !repo || !branch || !token) {
    throw new Error("GITHUB_PAGES config missing required fields");
  }

  const octokit = new Octokit({
    auth: token,
    ...(apiBaseUrl ? { baseUrl: apiBaseUrl } : {}),
  });

  const pathInRepo = joinPrefix(basePath, key);

  // 获取 sha，删除必须要 sha
  const existing = await octokit.repos.getContent({
    owner,
    repo,
    path: pathInRepo,
    ref: branch,
  });

  if (Array.isArray(existing.data) || !("sha" in existing.data)) {
    throw new Error(`Target path is a directory or invalid: ${pathInRepo}`);
  }

  const commitMessage = commitMessageTemplate
    .replace("{{filename}}", path.posix.basename(pathInRepo))
    .replace("{{datetime}}", new Date().toISOString());

  await octokit.repos.deleteFile({
    owner,
    repo,
    path: pathInRepo,
    message: commitMessage,
    branch,
    sha: existing.data.sha,
    committer: {
      name: committerName,
      email: committerEmail,
    },
  });
}

// ---------------------------------------------------------------------------
// External URL
// ---------------------------------------------------------------------------

async function uploadToExternalUrl(
  options: UploadOptions & { type: "EXTERNAL_URL"; key: string },
): Promise<UploadResult> {
  const { baseUrl, key } = options;
  // 外部URL存储只返回基础URL和相对路径，实际上传由外部系统处理
  const url = toPublicUrl(baseUrl, key);
  return { key, url };
}

async function deleteFromExternalUrl(
  _options: DeleteOptions & { type: "EXTERNAL_URL" },
): Promise<void> {
  // 外部URL存储的删除操作由外部系统处理
  // 这里无需执行任何操作
}

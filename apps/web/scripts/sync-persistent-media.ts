import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import RLog from "rlog-js";
import { pathToFileURL } from "url";

const rlog = new RLog();
const PUBLIC_DIR = path.join(process.cwd(), "public");
const SYNC_CONCURRENCY = 16;

const PROTECTED_FILES = new Set([
  "sw.js",
  "feed.xsl",
  "icon.png",
  "avatar.jpg",
  "avatar.old.jpg",
  "icon.old.png",
]);

interface PersistentMediaRecord {
  id: number;
  storageUrl: string;
  persistentPath: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pool: any;

function normalizeEtag(etag: string | null): string | null {
  if (!etag) return null;
  return etag
    .trim()
    .replace(/^W\//i, "")
    .replace(/^"+|"+$/g, "")
    .toLowerCase();
}

function calculateBufferEtag(buffer: Buffer): string {
  return createHash("md5").update(buffer).digest("hex");
}

function calculateFileEtag(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return calculateBufferEtag(content);
}

function normalizePersistentPath(rawPath: string): string | null {
  const replaced = rawPath.replace(/\\/g, "/").trim();
  if (!replaced) return null;
  if (replaced.startsWith("/")) return null;
  if (/^[A-Za-z]:/.test(replaced)) return null;

  const normalized = path.posix.normalize(replaced);
  if (!normalized || normalized === "." || normalized.startsWith("../")) {
    return null;
  }

  const segments = normalized.split("/");
  if (
    segments.some(
      (segment) => segment.length === 0 || segment === "." || segment === "..",
    )
  ) {
    return null;
  }

  return normalized;
}

function toPublicAbsolutePath(relativePath: string): string {
  const safePath = normalizePersistentPath(relativePath);
  if (!safePath) {
    throw new Error(`非法路径: ${relativePath}`);
  }

  const absolutePath = path.resolve(PUBLIC_DIR, ...safePath.split("/"));
  const relative = path.relative(PUBLIC_DIR, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`路径越界: ${relativePath}`);
  }
  return absolutePath;
}

function collectPublicFilesRecursively(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }

  const files: string[] = [];
  const walk = (currentDir: string) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      const relativePath = path
        .relative(rootDir, fullPath)
        .split(path.sep)
        .join("/");
      files.push(relativePath);
    }
  };

  walk(rootDir);
  return files;
}

function removeEmptyParentDirectories(startDir: string): void {
  let currentDir = startDir;
  while (currentDir.startsWith(PUBLIC_DIR) && currentDir !== PUBLIC_DIR) {
    if (!fs.existsSync(currentDir)) {
      currentDir = path.dirname(currentDir);
      continue;
    }

    const files = fs.readdirSync(currentDir);
    if (files.length > 0) break;
    fs.rmdirSync(currentDir);
    currentDir = path.dirname(currentDir);
  }
}

function cleanupStalePublicFiles(targetPaths: Set<string>): number {
  const currentFiles = collectPublicFilesRecursively(PUBLIC_DIR);
  let removedCount = 0;

  for (const file of currentFiles) {
    if (PROTECTED_FILES.has(file)) continue;
    if (targetPaths.has(file)) continue;

    const absolutePath = path.resolve(PUBLIC_DIR, ...file.split("/"));
    const relative = path.relative(PUBLIC_DIR, absolutePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) continue;

    fs.rmSync(absolutePath, { force: true });
    removeEmptyParentDirectories(path.dirname(absolutePath));
    removedCount += 1;
  }

  return removedCount;
}

function handleAvatarAndIconBackup(targetPaths: Set<string>): void {
  const needAvatarUpdate = targetPaths.has("avatar.jpg");
  const needIconUpdate = targetPaths.has("icon.png");
  if (!needAvatarUpdate && !needIconUpdate) return;

  const avatarPath = toPublicAbsolutePath("avatar.jpg");
  const iconPath = toPublicAbsolutePath("icon.png");
  const avatarOldPath = toPublicAbsolutePath("avatar.old.jpg");
  const iconOldPath = toPublicAbsolutePath("icon.old.png");

  const avatarOldExists = fs.existsSync(avatarOldPath);
  const iconOldExists = fs.existsSync(iconOldPath);

  if (avatarOldExists && iconOldExists) {
    if (needAvatarUpdate && fs.existsSync(avatarPath)) {
      fs.rmSync(avatarPath, { force: true });
    }
    if (needIconUpdate && fs.existsSync(iconPath)) {
      fs.rmSync(iconPath, { force: true });
    }
    return;
  }

  if (!avatarOldExists && fs.existsSync(avatarPath)) {
    fs.copyFileSync(avatarPath, avatarOldPath);
  }

  if (!iconOldExists && fs.existsSync(iconPath)) {
    fs.copyFileSync(iconPath, iconOldPath);
  }

  if (needAvatarUpdate && fs.existsSync(avatarPath)) {
    fs.rmSync(avatarPath, { force: true });
  }
  if (needIconUpdate && fs.existsSync(iconPath)) {
    fs.rmSync(iconPath, { force: true });
  }
}

async function getRemoteEtag(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    if (!response.ok) {
      return null;
    }
    return normalizeEtag(response.headers.get("etag"));
  } catch {
    return null;
  }
}

async function downloadRemoteFile(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载失败（${response.status} ${response.statusText}）`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createPrismaClient(): Promise<any> {
  const clientPath = path.join(
    process.cwd(),
    "node_modules",
    ".prisma",
    "client",
  );
  const clientUrl = pathToFileURL(clientPath).href;
  const { PrismaClient } = await import(clientUrl);
  const { Pool } = await import("pg");
  const { PrismaPg } = await import("@prisma/adapter-pg");

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);

  const prisma = new PrismaClient({
    adapter,
    log: [],
  });

  await prisma.$connect();
  return prisma;
}

async function fetchPersistentMedia(
  prisma: unknown,
): Promise<PersistentMediaRecord[]> {
  const typedPrisma = prisma as {
    media: {
      findMany: (args: unknown) => Promise<
        Array<{
          id: number;
          storageUrl: string;
          persistentPath: string | null;
        }>
      >;
    };
  };

  const rows = await typedPrisma.media.findMany({
    where: {
      persistentPath: {
        not: null,
      },
    },
    select: {
      id: true,
      storageUrl: true,
      persistentPath: true,
    },
    orderBy: {
      id: "desc",
    },
  });

  const uniquePathMap = new Map<string, PersistentMediaRecord>();

  for (const row of rows) {
    if (!row.persistentPath) continue;

    const normalizedPath = normalizePersistentPath(row.persistentPath);
    if (!normalizedPath) {
      rlog.warning(
        `  Skip invalid persistentPath on media #${row.id}: ${row.persistentPath}`,
      );
      continue;
    }

    if (uniquePathMap.has(normalizedPath)) {
      const winner = uniquePathMap.get(normalizedPath);
      rlog.warning(
        `  Duplicate persistentPath "${normalizedPath}" found on media #${row.id}, keep media #${winner?.id}`,
      );
      continue;
    }

    uniquePathMap.set(normalizedPath, {
      id: row.id,
      storageUrl: row.storageUrl,
      persistentPath: normalizedPath,
    });
  }

  return Array.from(uniquePathMap.values());
}

export async function syncPersistentMedia(): Promise<void> {
  rlog.log("> Synchronizing persistent media files into public directory...");

  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any;
  try {
    prisma = await createPrismaClient();
    const mediaList = await fetchPersistentMedia(prisma);
    const targetPaths = new Set(mediaList.map((item) => item.persistentPath));

    rlog.log("> Cleaning stale files...");
    const removedCount = cleanupStalePublicFiles(targetPaths);
    handleAvatarAndIconBackup(targetPaths);
    rlog.log();

    let downloadedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const totalMedia = mediaList.length;
    let processedMedia = 0;

    rlog.log("> Syncing persistent files...");
    let nextIndex = 0;

    const runWorker = async () => {
      while (true) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        if (currentIndex >= totalMedia) {
          return;
        }

        const media = mediaList[currentIndex];
        if (!media) {
          processedMedia += 1;
          if (totalMedia > 0) {
            rlog.progress(processedMedia, totalMedia);
          }
          continue;
        }

        try {
          const outputPath = toPublicAbsolutePath(media.persistentPath);
          const outputDir = path.dirname(outputPath);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          const localExists = fs.existsSync(outputPath);
          const localEtag = localExists ? calculateFileEtag(outputPath) : null;
          const remoteEtag = await getRemoteEtag(media.storageUrl);

          if (localEtag && remoteEtag && localEtag === remoteEtag) {
            skippedCount += 1;
            continue;
          }

          const downloadedBuffer = await downloadRemoteFile(media.storageUrl);
          const downloadedEtag = calculateBufferEtag(downloadedBuffer);

          if (localEtag && localEtag === downloadedEtag) {
            skippedCount += 1;
            continue;
          }

          fs.writeFileSync(outputPath, downloadedBuffer);
          downloadedCount += 1;
        } catch (error) {
          failedCount += 1;
          rlog.warning(
            `  Sync failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        } finally {
          processedMedia += 1;
          if (totalMedia > 0) {
            rlog.progress(processedMedia, totalMedia);
          }
        }
      }
    };

    const workerCount = Math.min(SYNC_CONCURRENCY, Math.max(totalMedia, 1));
    await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

    rlog.log();

    if (failedCount > 0) {
      throw new Error(`${failedCount} files failed to sync.`);
    }

    rlog.success(
      `✓ Persistent media sync completed (downloaded: ${downloadedCount}, skipped: ${skippedCount}, cleaned: ${removedCount})`,
    );
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (pool) {
      await pool.end();
    }
  }
}

async function main() {
  try {
    await syncPersistentMedia();
    process.exit(0);
  } catch (error) {
    rlog.error(
      `Persistent media sync failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  (process.argv[1].endsWith("sync-persistent-media.ts") ||
    process.argv[1].endsWith("sync-persistent-media.js"))
) {
  void main();
}

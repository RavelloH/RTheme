import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import RLog from "rlog-js";
import { pathToFileURL } from "url";

const rlog = new RLog();
const SYNC_CONCURRENCY = 16;

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

function resolvePublicDir(): string {
  const candidates = [
    path.join(process.cwd(), "apps", "web", "public"),
    path.join(process.cwd(), "public"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0] ?? path.join(process.cwd(), "public");
}

function toPublicAbsolutePath(publicDir: string, relativePath: string): string {
  const safePath = normalizePersistentPath(relativePath);
  if (!safePath) {
    throw new Error(`非法路径: ${relativePath}`);
  }

  const absolutePath = path.resolve(publicDir, ...safePath.split("/"));
  const relative = path.relative(publicDir, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`路径越界: ${relativePath}`);
  }
  return absolutePath;
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

export async function syncPersistentMedia(options?: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma?: any;
}): Promise<void> {
  const publicDir = resolvePublicDir();
  rlog.log("> Synchronizing persistent media files into public directory...");

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const externalPrisma = options?.prisma;
  const shouldManagePrismaLifecycle = !externalPrisma;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any = externalPrisma;
  try {
    if (!prisma) {
      prisma = await createPrismaClient();
    }
    const mediaList = await fetchPersistentMedia(prisma);

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
          const outputPath = toPublicAbsolutePath(
            publicDir,
            media.persistentPath,
          );
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
      `✓ Persistent media sync completed (downloaded: ${downloadedCount}, skipped: ${skippedCount})`,
    );
  } finally {
    if (prisma && shouldManagePrismaLifecycle) {
      await prisma.$disconnect();
    }
    if (pool && shouldManagePrismaLifecycle) {
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

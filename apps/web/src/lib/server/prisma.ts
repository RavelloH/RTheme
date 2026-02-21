import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import type { Prisma } from ".prisma/client";
import { PrismaClient } from ".prisma/client";

const isPortableBuildProfile = process.env.BUILD_PROFILE === "portable";

function createPortableModelProxy(): Record<string, unknown> {
  return new Proxy(
    {},
    {
      get(_target, propKey) {
        if (propKey === "then") {
          return undefined;
        }

        const method = String(propKey);
        return async (..._args: unknown[]) => {
          if (method === "findMany" || method === "groupBy") return [];
          if (method === "count") return 0;
          if (method === "findUnique" || method === "findFirst") return null;
          if (
            method === "createMany" ||
            method === "updateMany" ||
            method === "deleteMany"
          ) {
            return { count: 0 };
          }
          if (method === "aggregate") return {};
          return null;
        };
      },
    },
  );
}

function createPortablePrismaClientMock(): PrismaClient {
  const modelProxy = createPortableModelProxy();

  const portableClient = new Proxy(
    {},
    {
      get(_target, propKey) {
        if (propKey === "then") {
          return undefined;
        }

        const key = String(propKey);
        if (key === "$connect" || key === "$disconnect") {
          return async () => undefined;
        }
        if (key === "$queryRaw" || key === "$queryRawUnsafe") {
          return async () => [];
        }
        if (key === "$executeRaw" || key === "$executeRawUnsafe") {
          return async () => 0;
        }
        if (key === "$transaction") {
          return async (
            input:
              | unknown[]
              | ((tx: PrismaClient) => Promise<unknown> | unknown),
          ) => {
            if (Array.isArray(input)) {
              return Promise.all(input);
            }
            if (typeof input === "function") {
              return input(portableClient as PrismaClient);
            }
            return input;
          };
        }
        if (key === "$extends") {
          return () => portableClient;
        }
        if (key === "$on" || key === "$use") {
          return () => undefined;
        }

        return modelProxy;
      },
    },
  );

  return portableClient as PrismaClient;
}

// 创建全局 Prisma 实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
  prismaCleanupRegistered: boolean | undefined;
};

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

const poolMax = parsePositiveInt(process.env.PG_POOL_MAX, 2);
const connectionTimeoutMillis = parsePositiveInt(
  process.env.PG_CONNECTION_TIMEOUT_MS,
  10_000,
);
const idleTimeoutMillis = parsePositiveInt(
  process.env.PG_IDLE_TIMEOUT_MS,
  30_000,
);
const maxLifetimeSeconds = parsePositiveInt(process.env.PG_MAX_LIFETIME, 60);

// 创建 PostgreSQL 连接池（单例）
const pool = isPortableBuildProfile
  ? undefined
  : (globalForPrisma.pool ??
    new Pool({
      connectionString: process.env.DATABASE_URL,
      max: poolMax,
      connectionTimeoutMillis,
      idleTimeoutMillis,
      maxLifetimeSeconds,
    }));

if (!isPortableBuildProfile && pool) {
  globalForPrisma.pool = pool;
}

const prisma = isPortableBuildProfile
  ? createPortablePrismaClientMock()
  : (globalForPrisma.prisma ??
    new PrismaClient({
      adapter: new PrismaPg(pool as Pool),
      log:
        process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    }));

if (!isPortableBuildProfile) {
  globalForPrisma.prisma = prisma;
}

// 防止并发超限
if (
  !isPortableBuildProfile &&
  !globalForPrisma.prismaCleanupRegistered &&
  pool
) {
  process.once("beforeExit", () => {
    void (async () => {
      await prisma.$disconnect();
      await pool.end();
    })();
  });
  globalForPrisma.prismaCleanupRegistered = true;
}

export type PrismaTransaction = Prisma.TransactionClient;
export type PrismaClientType = typeof prisma;

export type PrismaModelName = keyof PrismaClientType;
export type PrismaModel = PrismaClientType[PrismaModelName];

export default prisma;

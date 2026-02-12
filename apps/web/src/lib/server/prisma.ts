import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import type { Prisma } from ".prisma/client";
import { PrismaClient } from ".prisma/client";

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
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: poolMax,
    connectionTimeoutMillis,
    idleTimeoutMillis,
    maxLifetimeSeconds,
  });

globalForPrisma.pool = pool;

// 创建 Prisma 适配器
const adapter = new PrismaPg(pool);

// Prisma 7 使用适配器连接数据库
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;

// 防止并发超限
if (!globalForPrisma.prismaCleanupRegistered) {
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

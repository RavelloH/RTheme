import "server-only";

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import type { Prisma } from ".prisma/client";
import { PrismaClient } from ".prisma/client";

// 创建全局 Prisma 实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// 创建 PostgreSQL 连接池（单例）
const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool;

// 创建 Prisma 适配器
const adapter = new PrismaPg(pool);

// Prisma 7 使用适配器连接数据库
const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// 防止并发超限
process.on("beforeExit", async () => {
  await prisma.$disconnect();
  await pool.end();
});

export type PrismaTransaction = Prisma.TransactionClient;
export type PrismaClientType = typeof prisma;

export type PrismaModelName = keyof PrismaClientType;
export type PrismaModel = PrismaClientType[PrismaModelName];

export default prisma;

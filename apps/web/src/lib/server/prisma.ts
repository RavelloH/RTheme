import "server-only";

import { Prisma, PrismaClient } from ".prisma/client";
// 创建全局 Prisma 实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// 防止并发超限
process.on("beforeExit", async () => {
  await prisma.$disconnect();
});

export type PrismaTransaction = Prisma.TransactionClient;
export type PrismaClientType = typeof prisma;

export type PrismaModelName = keyof PrismaClientType;
export type PrismaModel = PrismaClientType[PrismaModelName];

export default prisma;

import { Prisma, PrismaClient } from '../../generated/prisma';

// 创建全局 Prisma 实例，配置连接池和超时
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// 在开发环境中避免重复创建客户端实例
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// 在进程退出时优雅关闭连接
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export type PrismaTransaction = Prisma.TransactionClient;
export type PrismaClientType = typeof prisma;

export type PrismaModelName = keyof PrismaClientType;
export type PrismaModel = PrismaClientType[PrismaModelName];

export default prisma;
/**
 * 生成访问量缓存到 Redis
 * 从 ViewCountCache 表加载所有访问量数据到 Redis Hash
 * 用于应用启动时初始化 Redis 缓存
 */

import { Redis } from "ioredis";
import RLog from "rlog-js";

import { loadPrismaClientConstructor } from "@/../scripts/load-prisma-client";

import { parseRedisConnectionOptions } from "../src/lib/shared/redis-url";

const rlog = new RLog();
const REDIS_VIEW_COUNT_KEY = "np:view_count:all";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pool: any;

export default async function generateViewCountCache(options?: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma?: any;
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let prisma: any = options?.prisma;
  let redis: Redis | null = null;
  const shouldManagePrismaLifecycle = !options?.prisma;

  try {
    rlog.log("> Generating view count cache...");

    if (!prisma) {
      // 1. 动态导入 Prisma 客户端
      try {
        const PrismaClient = await loadPrismaClientConstructor();
        const { Pool } = await import("pg");
        const { PrismaPg } = await import("@prisma/adapter-pg");

        // 使用与生产环境相同的 adapter 模式
        pool = new Pool({
          connectionString: process.env.DATABASE_URL,
        });
        const adapter = new PrismaPg(pool);

        prisma = new PrismaClient({
          adapter,
          log: [],
        });

        await prisma.$connect();
      } catch (error) {
        rlog.warning(
          "Prisma client not initialized, skipping cache generation",
        );
        rlog.warning("Error details:", error);
        return;
      }
    }

    // 2. 初始化 Redis 连接
    if (!process.env.REDIS_URL) {
      rlog.warning("REDIS_URL not configured, skipping cache generation");
      return;
    }

    redis = new Redis({
      ...parseRedisConnectionOptions(process.env.REDIS_URL),
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 3) {
          return null; // 停止重试
        }
        return Math.min(times * 100, 2000); // 重试间隔
      },
    });

    // 测试 Redis 连接
    await redis.ping();

    // 3. 从数据库读取所有访问量数据
    const allCounts = await prisma.viewCountCache.findMany({
      select: {
        path: true,
        cachedCount: true,
      },
    });

    if (allCounts.length === 0) {
      rlog.warning("  No view count data in database, skipping");
      return;
    }

    // 4. 删除旧的 Redis 缓存
    const exists = await redis.exists(REDIS_VIEW_COUNT_KEY);
    if (exists) {
      await redis.del(REDIS_VIEW_COUNT_KEY);
      rlog.log("  Deleted old Redis cache");
    }

    // 5. 批量写入 Redis Hash
    const pipeline = redis.pipeline();
    for (const { path, cachedCount } of allCounts) {
      pipeline.hset(REDIS_VIEW_COUNT_KEY, path, cachedCount);
    }
    await pipeline.exec();

    rlog.log(`  Loaded ${allCounts.length} view count records to Redis`);
    rlog.log(`  Redis Key: ${REDIS_VIEW_COUNT_KEY}`);
    rlog.log(`  Data structure: Hash`);

    // 6. 验证数据
    const redisCount = await redis.hlen(REDIS_VIEW_COUNT_KEY);
    rlog.success(`✓ View count cache generated: ${redisCount} records`);

    if (redisCount !== allCounts.length) {
      throw new Error(
        `Data verification failed: Redis count (${redisCount}) != Database count (${allCounts.length})`,
      );
    }
  } catch (error) {
    rlog.error("View count cache generation failed:", error);
    throw error;
  } finally {
    // 清理资源
    if (prisma && shouldManagePrismaLifecycle) {
      await prisma.$disconnect();
    }
    if (redis) {
      await redis.quit();
    }
    if (pool && shouldManagePrismaLifecycle) {
      try {
        await pool.end();
        rlog.info("  Connection pool closed");
      } catch (error) {
        rlog.warning(
          `  Error closing connection pool: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}

async function main() {
  rlog.log("Starting view count cache generation...");

  try {
    await generateViewCountCache();
    rlog.log("View count cache generation completed");
    process.exit(0);
  } catch (error) {
    console.error("View count cache generation failed:", error);
    process.exit(1);
  }
}

// 只有在直接运行此脚本时才执行
if (
  process.argv[1] &&
  (process.argv[1].endsWith("generate-view-count-cache.ts") ||
    process.argv[1].endsWith("generate-view-count-cache.js"))
) {
  main();
}

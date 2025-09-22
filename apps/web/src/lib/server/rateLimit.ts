import Redis from "ioredis";
import prisma from "@/lib/server/prisma";

const limit = 30; // 每分钟允许的请求数

// 根据环境变量决定是否使用Redis
const useRedis = !!process.env.REDIS_URL;
const redis = useRedis
  ? new Redis(process.env.REDIS_URL as string, {
      maxRetriesPerRequest: 0,
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 5000,
      commandTimeout: 5000,
    })
  : null;

// 连接状态标记
let isReconnecting = false;

// 添加错误处理，防止无限重连
if (redis) {
  redis.on("error", () => {
    isReconnecting = false;
    redis.disconnect();
  });

  redis.on("close", () => {
    console.log("Redis connection closed");
    isReconnecting = false;
  });

  redis.on("connect", () => {
    console.log("Redis connected successfully");
    isReconnecting = false;
  });
}

// 简化后只支持有 get 方法的 Headers 格式
type HeadersObject = { get: (key: string) => string | null };

// 提取IP地址的函数
function extractIpAddress(headers: HeadersObject): string {
  return (
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for") ||
    headers.get("x-vercel-proxied-for") ||
    ""
  );
}

// Redis实现的速率限制
async function rateLimitRedis(headers: HeadersObject): Promise<boolean> {
  if (!redis) {
    throw new Error("Redis not configured");
  }

  try {
    // 检查Redis连接状态，如果断开则尝试重连
    if (
      (redis.status === "close" ||
        redis.status === "end" ||
        redis.status === "wait") &&
      !isReconnecting
    ) {
      console.log(`Redis status: ${redis.status}, attempting to reconnect...`);
      isReconnecting = true;
      await redis.connect();
    }

    const ip = extractIpAddress(headers);
    const key = `rate_limit:${ip}`;
    const currentTime = Date.now();
    const oneMinuteAgo = currentTime - 60000;

    // 使用 Redis 事务来确保原子性
    const multi = redis.multi();

    // 移除一分钟前的记录
    multi.zremrangebyscore(key, "-inf", oneMinuteAgo);

    // 获取当前计数
    multi.zcard(key);

    const results = await multi.exec();

    if (!results) {
      throw new Error("Redis transaction failed");
    }

    // 获取清理后的计数
    const countResult = results[1];
    const currentCount = (countResult?.[1] as number) || 0;

    const allowed = currentCount < limit;

    if (allowed) {
      // 如果允许，添加当前请求记录
      await redis.zadd(key, currentTime, `${currentTime}`);
      await redis.expire(key, 300);
    }

    return allowed;
  } catch (error) {
    console.error("Redis operation failed:", error);
    throw new Error(`Redis rate limit failed: ${error}`);
  }
}

// Prisma实现的速率限制（尽可能原子操作）
async function rateLimitPrisma(headers: HeadersObject): Promise<boolean> {
  const ip = extractIpAddress(headers);
  const currentTime = Date.now();
  const oneMinuteAgo = currentTime - 60000;

  try {
    // 使用事务来确保数据一致性
    const result = await prisma.$transaction(async (tx) => {
      // 清理过期记录
      await tx.rateLimitRecord.deleteMany({
        where: {
          ipAddress: ip,
          timestamp: { lt: oneMinuteAgo },
        },
      });

      // 获取当前计数
      const currentCount = await tx.rateLimitRecord.count({
        where: {
          ipAddress: ip,
          timestamp: { gte: oneMinuteAgo },
        },
      });

      const allowed = currentCount < limit;

      if (allowed) {
        // 如果允许，添加当前请求记录
        await tx.rateLimitRecord.create({
          data: {
            ipAddress: ip,
            timestamp: currentTime,
          },
        });
      }

      return allowed;
    });

    return result;
  } catch (error) {
    console.error("Prisma rate limit error:", error);
    // 出错时默认允许请求，避免阻塞正常用户
    return true;
  }
}

// 统一的速率限制函数
async function limitControl(headers: HeadersObject): Promise<boolean> {
  if (useRedis) {
    try {
      return await rateLimitRedis(headers);
    } catch (error) {
      console.error("Redis rate limit failed, falling back to Prisma:", error);
      // Redis失败时回退到Prisma
      return await rateLimitPrisma(headers);
    }
  } else {
    return await rateLimitPrisma(headers);
  }
}

export default limitControl;

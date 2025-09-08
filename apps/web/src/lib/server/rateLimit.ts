import Redis from "ioredis";
import prisma from "@/lib/server/prisma";

const limit = 30; // 每分钟允许的请求数

// 根据环境变量决定是否使用Redis
const useRedis = !!process.env.REDIS_URL;
const redis = useRedis ? new Redis(process.env.REDIS_URL as string) : null;

interface RequestObject {
  headers: {
    get: (key: string) => string | null;
  };
  ip?: string;
  connection?: {
    remoteAddress?: string;
  };
}

// 提取IP地址的通用函数
function extractIpAddress(request: RequestObject): string {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-vercel-proxied-for") ||
    request.ip ||
    (request.connection && request.connection.remoteAddress) ||
    ""
  );
}

// Redis实现的速率限制
async function rateLimitRedis(request: RequestObject): Promise<boolean> {
  if (!redis) {
    return true;
  }

  const ip = extractIpAddress(request);
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
    return true;
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
}

// Prisma实现的速率限制（尽可能原子操作）
async function rateLimitPrisma(request: RequestObject): Promise<boolean> {
  const ip = extractIpAddress(request);
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
    // 出错时默认允许请求
    return true;
  }
}

// 统一的速率限制函数
async function limitControl(request: RequestObject): Promise<boolean> {
  if (useRedis) {
    return await rateLimitRedis(request);
  } else {
    return await rateLimitPrisma(request);
  }
}

export default limitControl;

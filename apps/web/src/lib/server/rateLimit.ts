import Redis from "ioredis";
import prisma from "@/lib/server/prisma";

const limit = 30; // 每分钟允许的请求数

// 根据环境变量决定是否使用Redis
const useRedis = !!process.env.REDIS_URL;
const redis = useRedis ? new Redis(process.env.REDIS_URL as string) : null;

// 支持两种 header 格式
type HeadersObject = 
  | { get: (key: string) => string | null } // Next.js Request headers 格式
  | Headers // Web API Headers 格式
  | Record<string, string | string[] | undefined>; // 普通对象格式

// 提取IP地址的通用函数
function extractIpAddress(headers: HeadersObject): string {
  let getHeader: (key: string) => string | null;

  if (headers && typeof headers === 'object') {
    if ('get' in headers && typeof headers.get === 'function') {
      // Next.js Request headers 或 Web API Headers
      const headersWithGet = headers as { get: (key: string) => string | null };
      getHeader = (key: string) => headersWithGet.get(key);
    } else {
      // 普通对象格式
      getHeader = (key: string) => {
        const value = (headers as Record<string, string | string[] | undefined>)[key];
        if (Array.isArray(value)) {
          return value[0] || null;
        }
        return typeof value === 'string' ? value : null;
      };
    }
  } else {
    getHeader = () => null;
  }

  return (
    getHeader("x-real-ip") ||
    getHeader("x-forwarded-for") ||
    getHeader("x-vercel-proxied-for") ||
    ""
  );
}

// Redis实现的速率限制
async function rateLimitRedis(headers: HeadersObject): Promise<boolean> {
  if (!redis) {
    return true;
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
    // 出错时默认允许请求
    return true;
  }
}

// 统一的速率限制函数
async function limitControl(headers: HeadersObject): Promise<boolean> {
  if (useRedis) {
    return await rateLimitRedis(headers);
  } else {
    return await rateLimitPrisma(headers);
  }
}

export default limitControl;

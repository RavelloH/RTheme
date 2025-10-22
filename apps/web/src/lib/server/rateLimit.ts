import "server-only";

import redis, { ensureRedisConnection } from "@/lib/server/redis";

const limit = 60; // 每分钟允许的请求数

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
async function limitControl(headers: HeadersObject): Promise<boolean> {
  try {
    await ensureRedisConnection();

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
    console.error("Redis rate limit failed:", error);
    throw new Error(`Redis rate limit failed: ${error}`);
  }
}

export default limitControl;

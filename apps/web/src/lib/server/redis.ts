import "server-only";

import Redis from "ioredis";

// 验证 Redis URL 环境变量
if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL environment variable is required");
}

// Redis 配置选项
const redisOptions = {
  maxRetriesPerRequest: 0,
  lazyConnect: true,
  enableOfflineQueue: false,
  connectTimeout: 5000,
  commandTimeout: 5000,
};

// 全局 Redis 实例类型声明
declare global {
  var redis: Redis | undefined;
  var isReconnecting: boolean | undefined;
}

// 连接状态标记
let isReconnecting = globalThis.isReconnecting ?? false;

// 创建或复用 Redis 实例
const redis =
  globalThis.redis ?? new Redis(process.env.REDIS_URL, redisOptions);

// 在开发环境中保存到 global，避免热重载时创建多个连接
if (process.env.NODE_ENV !== "production") {
  globalThis.redis = redis;
  globalThis.isReconnecting = isReconnecting;
}

// 添加错误处理，防止无限重连
redis.on("error", (error) => {
  console.error("Redis error:", error);
  isReconnecting = false;
  globalThis.isReconnecting = false;
  redis.disconnect();
});

redis.on("close", () => {
  console.log("Redis connection closed");
  isReconnecting = false;
  globalThis.isReconnecting = false;
});

redis.on("connect", () => {
  console.log("Redis connected successfully");
  isReconnecting = false;
  globalThis.isReconnecting = false;
});

redis.on("ready", () => {
  console.log("Redis is ready");
  isReconnecting = false;
  globalThis.isReconnecting = false;
});

/**
 * 检查并重连 Redis
 * 自动处理断开的连接，确保 Redis 可用
 */
export async function ensureRedisConnection(): Promise<void> {
  // 检查Redis连接状态，如果断开则尝试重连
  if (
    (redis.status === "close" ||
      redis.status === "end" ||
      redis.status === "wait") &&
    !isReconnecting
  ) {
    console.log(`Redis status: ${redis.status}, attempting to reconnect...`);
    isReconnecting = true;
    globalThis.isReconnecting = true;
    await redis.connect();
  }
}

/**
 * 全局 Redis 客户端实例
 * 使用前建议调用 ensureRedisConnection() 确保连接
 */
export default redis;

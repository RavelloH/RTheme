import "server-only";

import { readFileSync } from "fs";
import { join } from "path";
import redis, { ensureRedisConnection } from "@/lib/server/redis";

// 配置常量
const RATE_LIMIT = 60; // 每分钟最大请求数
const WINDOW_MS = 60000; // 限流窗口：1分钟
const EXPIRE_MS = 86400000; // 数据保留：24小时
const HOUR_STATS_TTL = 2592000; // 小时统计 TTL：30天

// 简化后只支持有 get 方法的 Headers 格式
type HeadersObject = { get: (key: string) => string | null };

// 提取IP地址的函数
function extractIpAddress(headers: HeadersObject): string {
  return (
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-vercel-proxied-for") ||
    "unknown"
  );
}

// Lua 脚本：原子化限流 + 统计
// 从独立文件加载
const RATE_LIMIT_SCRIPT = readFileSync(
  join(process.cwd(), "src/lib/server/lua-scripts/rate-limit.lua"),
  "utf-8",
);

// 限流结果类型
export type RateLimitResult = 1 | 0 | -1;

// Redis 实现的速率限制（使用 Lua 脚本保证原子性）
async function limitControl(
  headers: HeadersObject,
  apiName: string = "unknown",
): Promise<boolean> {
  try {
    await ensureRedisConnection();

    const ip = extractIpAddress(headers);
    const now = Date.now();
    const currentHour = Math.floor(now / 3600000);

    // 准备 Lua 脚本的 keys 和 args
    const keys = [
      `np:rate:ip:${ip}`, // 1: rateKey
      "np:stat:success", // 2: statSuccess
      "np:stat:error", // 3: statError
      `np:stat:hour:${currentHour}:success`, // 4: statHourSuccess
      `np:stat:hour:${currentHour}:error`, // 5: statHourError
      `np:rate:ban:${ip}`, // 6: banKey
      "np:stat:endpoint", // 7: endpointKey
    ];

    const args = [
      now.toString(), // 1: now
      RATE_LIMIT.toString(), // 2: limit
      apiName, // 3: apiName
      EXPIRE_MS.toString(), // 4: expireMs
      WINDOW_MS.toString(), // 5: windowMs
      HOUR_STATS_TTL.toString(), // 6: hourStatsTtl
    ];

    // 执行 Lua 脚本
    const result = (await redis.eval(
      RATE_LIMIT_SCRIPT,
      keys.length,
      ...keys,
      ...args,
    )) as RateLimitResult;

    // 1 = 允许, 0 = 限流, -1 = 封禁
    return result === 1;
  } catch (error) {
    console.error("Rate limit check failed:", error);
    // 出错时默认允许请求，避免影响正常服务
    return true;
  }
}

// 检查 IP 是否被封禁（供外部查询使用）
async function isIPBanned(ip: string): Promise<boolean> {
  try {
    await ensureRedisConnection();
    const banKey = `np:rate:ban:${ip}`;
    const exists = await redis.exists(banKey);
    return exists === 1;
  } catch (error) {
    console.error("Check IP ban status failed:", error);
    return false;
  }
}

// 导出辅助函数供安全模块使用
export { extractIpAddress, isIPBanned, RATE_LIMIT };
export default limitControl;

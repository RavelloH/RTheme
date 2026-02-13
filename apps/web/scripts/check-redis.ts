// scripts/check-redis.ts
// 检查 Redis 连接是否正常

import { config } from "dotenv";
import Redis from "ioredis";
import Rlog from "rlog-js";

// 加载 .env 文件
config({
  quiet: true,
});

const rlog = new Rlog();

export async function checkRedisConnection(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    rlog.error("✗ REDIS_URL environment variable is missing");
    throw new Error("REDIS_URL is not set");
  }

  // 使用较短的超时时间进行检查
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 10,
    connectTimeout: 5000,
    lazyConnect: true,
  });

  try {
    rlog.info(`> Attempting to connect to Redis...`);

    // 手动连接
    await redis.connect();

    // 执行 PING 操作
    const result = await redis.ping();

    if (result === "PONG") {
      rlog.success("✓ Redis connection successful (received PONG)");
    } else {
      throw new Error(`Unexpected PING response: ${result}`);
    }
  } catch (error) {
    rlog.error("✗ Redis connection failed");
    if (error instanceof Error) {
      rlog.error(`  Error: ${error.message}`);
    }
    throw error;
  } finally {
    // 确保关闭连接
    await redis.quit().catch(() => redis.disconnect());
  }
}

// 主入口函数
async function main() {
  try {
    await checkRedisConnection();
  } catch (error) {
    rlog.error(
      `Redis check failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

// 检查是否是直接运行
import { pathToFileURL } from "url";
function isMainModule(): boolean {
  try {
    const arg1 = process.argv[1];
    return (
      import.meta.url === pathToFileURL(arg1 || "").href ||
      (arg1?.endsWith("check-redis.ts") ?? false) ||
      (arg1?.endsWith("check-redis.js") ?? false)
    );
  } catch {
    return false;
  }
}

if (isMainModule()) {
  main();
}

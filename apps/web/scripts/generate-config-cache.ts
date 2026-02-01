/**
 * 配置缓存生成脚本
 * 在生产构建前运行,将数据库中的配置缓存到文件系统中
 */

import fs from "fs";
import path from "path";
import RLog from "rlog-js";
import { pathToFileURL } from "url";

const rlog = new RLog();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pool: any;

// 配置对象类型定义
interface ConfigItem {
  key: string;
  value: unknown;
  description?: string | null;
  updatedAt: Date;
}

async function generateConfigCache() {
  const CACHE_FILE_PATH = path.join(
    process.cwd(),
    ".cache",
    ".config-cache.json",
  );

  try {
    rlog.log("> Generating configuration cache file...");

    // 确保 .next 目录存在
    const cacheDir = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // 动态导入 Prisma 客户端以避免初始化问题
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let prisma: any;
    try {
      // 使用 pathToFileURL 确保跨平台兼容性
      const clientPath = path.join(
        process.cwd(),
        "node_modules",
        ".prisma",
        "client",
      );
      const clientUrl = pathToFileURL(clientPath).href;
      const { PrismaClient } = await import(clientUrl);
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

      // 测试连接
      await prisma.$connect();
    } catch (error) {
      rlog.warning("Prisma client not initialized, creating empty cache file");
      rlog.warning("Error details:", error);
      const result: Record<string, ConfigItem> = {};
      fs.writeFileSync(
        CACHE_FILE_PATH,
        JSON.stringify(result, null, 2),
        "utf-8",
      );
      rlog.log(`  Configuration cache generated: ${CACHE_FILE_PATH}`);
      rlog.success(`✓ Cached 0 configuration items (Prisma not ready)`);
      return;
    }

    // 从数据库获取所有配置
    const configs = await prisma.config.findMany({
      orderBy: { key: "asc" },
    });

    const result: Record<string, ConfigItem> = {};

    configs.forEach(
      (config: {
        key: string;
        value: unknown;
        description: string | null;
        updatedAt: Date;
      }) => {
        result[config.key] = {
          key: config.key,
          value: config.value,
          description: config.description,
          updatedAt: config.updatedAt,
        };
      },
    );

    // 写入缓存文件
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(result, null, 2), "utf-8");

    rlog.log(`  Configuration cache generated: ${CACHE_FILE_PATH}`);
    rlog.success(`✓ Cached ${Object.keys(result).length} configuration items`);

    await prisma.$disconnect();

    // 关闭连接池
    if (pool) {
      try {
        await pool.end();
        rlog.info("  Connection pool closed");
      } catch (error) {
        rlog.warning(
          `  Error closing connection pool: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  } catch (error) {
    console.error("Configuration cache generation failed:", error);
    throw error;
  }
}

async function main() {
  rlog.log("Starting configuration cache generation...");

  try {
    await generateConfigCache();
    rlog.log("Configuration cache generation completed");
    process.exit(0);
  } catch (error) {
    console.error("Configuration cache generation failed:", error);
    process.exit(1);
  }
}

// 导出函数供其他脚本使用
export { generateConfigCache };

// 只有在直接运行此脚本时才执行
if (
  process.argv[1] &&
  (process.argv[1].endsWith("generate-config-cache.ts") ||
    process.argv[1].endsWith("generate-config-cache.js"))
) {
  main();
}

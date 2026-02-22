/**
 * 页面缓存生成脚本
 * 在生产构建前运行,将数据库中的页面缓存到文件系统中
 */

import fs from "fs";
import path from "path";
import RLog from "rlog-js";

import { loadPrismaClientConstructor } from "@/../scripts/load-prisma-client";

const rlog = new RLog();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pool: any;

// 页面项类型定义
interface PageItem {
  id: string;
  title: string;
  slug: string;
  content: string;
  contentType: "MARKDOWN" | "HTML" | "MDX";
  config: unknown;
  status: "ACTIVE" | "SUSPENDED";
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isSystemPage: boolean;
  metaDescription: string | null;
  metaKeywords: string | null;
  robotsIndex: boolean;
  userUid: number | null;
}

async function generatePageCache() {
  const CACHE_FILE_PATH = path.join(
    process.cwd(),
    ".cache",
    ".page-cache.json",
  );

  try {
    rlog.log("> Generating page cache file...");

    // 确保 .cache 目录存在
    const cacheDir = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // 动态导入 Prisma 客户端以避免初始化问题
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let prisma: any;
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

      // 测试连接
      await prisma.$connect();
    } catch (error) {
      rlog.warning("Prisma client not initialized, creating empty cache file");
      rlog.warning("Error details:", error);
      const result: Record<string, PageItem> = {};
      fs.writeFileSync(
        CACHE_FILE_PATH,
        JSON.stringify(result, null, 2),
        "utf-8",
      );
      rlog.log(`  Page cache generated: ${CACHE_FILE_PATH}`);
      rlog.success(`  Cached 0 pages (Prisma not ready)`);
      return;
    }

    // 从数据库获取所有未删除的页面
    const pages = await prisma.page.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: { title: "asc" },
    });

    // 构建以 slug 为键的缓存对象
    const result: Record<string, PageItem> = {};

    pages.forEach(
      (page: {
        id: string;
        title: string;
        slug: string;
        content: string;
        contentType: string;
        config: unknown;
        status: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        isSystemPage: boolean;
        metaDescription: string | null;
        metaKeywords: string | null;
        robotsIndex: boolean;
        userUid: number | null;
      }) => {
        result[page.slug] = {
          id: page.id,
          title: page.title,
          slug: page.slug,
          content: page.content,
          contentType: page.contentType as "MARKDOWN" | "HTML" | "MDX",
          config: page.config,
          status: page.status as "ACTIVE" | "SUSPENDED",
          deletedAt: page.deletedAt,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
          isSystemPage: page.isSystemPage,
          metaDescription: page.metaDescription,
          metaKeywords: page.metaKeywords,
          robotsIndex: page.robotsIndex,
          userUid: page.userUid,
        };
      },
    );

    // 写入缓存文件
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(result, null, 2), "utf-8");

    rlog.log(`  Page cache generated: ${CACHE_FILE_PATH}`);
    rlog.success(`✓ Cached ${Object.keys(result).length} pages`);

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
    console.error("Page cache generation failed:", error);
    throw error;
  }
}

async function main() {
  rlog.log("Starting page cache generation...");

  try {
    await generatePageCache();
    rlog.log("Page cache generation completed");
    process.exit(0);
  } catch (error) {
    console.error("Page cache generation failed:", error);
    process.exit(1);
  }
}

// 导出函数供其他脚本使用
export { generatePageCache };

// 只有在直接运行此脚本时才执行
if (
  process.argv[1] &&
  (process.argv[1].endsWith("generate-page-cache.ts") ||
    process.argv[1].endsWith("generate-page-cache.js"))
) {
  main();
}

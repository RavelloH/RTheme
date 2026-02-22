/**
 * 菜单缓存生成脚本
 * 在生产构建前运行,将数据库中的菜单缓存到文件系统中
 */

import fs from "fs";
import path from "path";
import RLog from "rlog-js";

import { loadPrismaClientConstructor } from "@/../scripts/load-prisma-client";

const rlog = new RLog();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pool: any;

// 菜单项类型定义
interface MenuItem {
  id: string;
  name: string;
  icon?: string | null;
  link?: string | null;
  slug?: string | null;
  status: "ACTIVE" | "SUSPENDED";
  order: number;
  category: "MAIN" | "COMMON" | "OUTSITE";
  createdAt: Date;
  updatedAt: Date;
  page?: PageItem | null;
}

// 页面项类型定义
interface PageItem {
  id: string;
  title: string;
  slug: string;
  content: unknown;
  config?: unknown | null;
  excerpt?: string | null;
  status: "DRAFT" | "ACTIVE" | "SUSPENDED";
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  userUid?: number | null;
}

async function generateMenuCache() {
  const CACHE_FILE_PATH = path.join(
    process.cwd(),
    ".cache",
    ".menu-cache.json",
  );

  try {
    rlog.log("> Generating menu cache file...");

    // 确保 .next 目录存在
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
      const result: MenuItem[] = [];
      fs.writeFileSync(
        CACHE_FILE_PATH,
        JSON.stringify(result, null, 2),
        "utf-8",
      );
      rlog.log(`  Menu cache generated: ${CACHE_FILE_PATH}`);
      rlog.success(`  Cached 0 menu items (Prisma not ready)`);
      return;
    }

    // 从数据库获取所有菜单
    const menus = await prisma.menu.findMany({
      orderBy: [{ category: "asc" }, { order: "asc" }, { createdAt: "asc" }],
      include: {
        page: true,
      },
    });

    const result: MenuItem[] = menus.map(
      (menu: {
        id: string;
        name: string;
        icon?: string | null;
        link?: string | null;
        slug?: string | null;
        status: "ACTIVE" | "SUSPENDED";
        order: number;
        category: "MAIN" | "COMMON" | "OUTSITE";
        createdAt: Date;
        updatedAt: Date;
        page?: {
          id: string;
          title: string;
          slug: string;
          content: unknown;
          config?: unknown | null;
          excerpt?: string | null;
          status: "DRAFT" | "ACTIVE" | "SUSPENDED";
          createdAt: Date;
          updatedAt: Date;
          isDefault: boolean;
          metaDescription?: string | null;
          metaKeywords?: string | null;
          userUid?: number | null;
        } | null;
      }) => ({
        id: menu.id,
        name: menu.name,
        icon: menu.icon,
        link: menu.link,
        slug: menu.slug,
        status: menu.status,
        order: menu.order,
        category: menu.category,
        createdAt: menu.createdAt,
        updatedAt: menu.updatedAt,
        page: menu.page
          ? {
              id: menu.page.id,
              title: menu.page.title,
              slug: menu.page.slug,
              content: menu.page.content,
              config: menu.page.config,
              excerpt: menu.page.excerpt,
              status: menu.page.status,
              createdAt: menu.page.createdAt,
              updatedAt: menu.page.updatedAt,
              isDefault: menu.page.isDefault,
              metaDescription: menu.page.metaDescription,
              metaKeywords: menu.page.metaKeywords,
              userUid: menu.page.userUid,
            }
          : null,
      }),
    );

    // 写入缓存文件
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(result, null, 2), "utf-8");

    rlog.log(`  Menu cache generated: ${CACHE_FILE_PATH}`);
    rlog.success(`✓ Cached ${result.length} menu items`);

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
    console.error("Menu cache generation failed:", error);
    throw error;
  }
}

async function main() {
  rlog.log("Starting menu cache generation...");

  try {
    await generateMenuCache();
    rlog.log("Menu cache generation completed");
    process.exit(0);
  } catch (error) {
    console.error("Menu cache generation failed:", error);
    process.exit(1);
  }
}

// 导出函数供其他脚本使用
export { generateMenuCache };

// 只有在直接运行此脚本时才执行
if (
  process.argv[1] &&
  (process.argv[1].endsWith("generate-menu-cache.ts") ||
    process.argv[1].endsWith("generate-menu-cache.js"))
) {
  main();
}

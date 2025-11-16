// scripts/seed-defaults.ts
// 数据库默认值种子脚本

import path from "path";
import { pathToFileURL } from "url";
import RLog from "rlog-js";
import { type PrismaClient } from "@prisma/client";

const rlog = new RLog();

// 从数据文件导入默认配置
import { defaultConfigs } from "../src/data/default-configs.js";
import { defaultPages } from "../src/data/default-pages.js";
import { defaultMenus } from "../src/data/default-menus.js";

async function seedDefaults() {
  try {
    rlog.log("> Checking and adding database default values...");

    // 动态导入 Prisma 客户端以避免初始化问题
    let prisma: PrismaClient;
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

      prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      });

      // 测试连接
      await prisma.$connect();
    } catch (error) {
      rlog.warning(
        "Prisma client not initialized, skipping default value seeding",
      );
      rlog.warning("Error details:", error);
      return;
    }

    // 种子化默认配置
    await seedDefaultConfigs(prisma);

    // 种子化默认页面和菜单
    await seedDefaultPagesAndMenus(prisma);

    rlog.success("  Database default values check completed");
    await prisma.$disconnect();
  } catch (error) {
    rlog.error("Database default value seeding failed:", error);
    throw error;
  }
}

// 种子化默认配置
async function seedDefaultConfigs(prisma: PrismaClient) {
  rlog.log("  Checking default configurations...");

  let addedCount = 0;
  let skippedCount = 0;

  // 一次性获取所有现有配置，避免 N+1 查询问题
  const existingConfigs = await prisma.config.findMany({
    select: { key: true },
  });

  // 创建现有配置 key 的 Set，便于快速查找
  const existingKeys = new Set(
    existingConfigs.map((config: { key: string }) => config.key),
  );

  // 准备要添加的配置数据
  const configsToAdd = [];

  for (const config of defaultConfigs) {
    if (!existingKeys.has(config.key)) {
      configsToAdd.push({
        key: config.key,
        value: config.value,
        description: config.description,
      });
      addedCount++;
    } else {
      skippedCount++;
    }
  }

  // 批量创建新配置
  if (configsToAdd.length > 0) {
    try {
      await prisma.config.createMany({
        data: configsToAdd,
      });

      // 记录添加的配置
      for (const config of configsToAdd) {
        rlog.info(`  | Added config: ${config.key}`);
      }
    } catch (error) {
      rlog.error(`  | Batch config creation failed:`, error);

      // 如果批量添加失败，尝试逐个添加（降级处理）
      for (const config of configsToAdd) {
        try {
          await prisma.config.create({
            data: config,
          });
          rlog.info(`  | Added config: ${config.key}`);
        } catch (individualError) {
          rlog.error(
            `  | Failed to add config ${config.key}:`,
            individualError,
          );
          addedCount--;
        }
      }
    }
  }

  rlog.success(
    `  Configuration check completed: added ${addedCount} items, skipped ${skippedCount} items`,
  );
}

// 种子化默认页面和菜单
async function seedDefaultPagesAndMenus(prisma: PrismaClient) {
  rlog.log("  Checking default pages and menus...");

  let pagesAddedCount = 0;
  let pagesSkippedCount = 0;
  let menusAddedCount = 0;
  let menusSkippedCount = 0;

  // 检查现有的页面
  const existingPages = await prisma.page.findMany({
    select: { id: true, slug: true },
  });
  const existingPageIds = new Set(
    existingPages.map((page: { id: string }) => page.id),
  );
  const existingPageSlugs = new Set(
    existingPages.map((page: { slug: string }) => page.slug),
  );

  // 先创建页面
  const pagesToAdd = [];
  for (const page of defaultPages) {
    if (!existingPageIds.has(page.id) && !existingPageSlugs.has(page.slug)) {
      pagesToAdd.push({
        id: page.id,
        title: page.title,
        slug: page.slug,
        content: page.content || "",
        contentType: page.contentType || "MARKDOWN",
        config: page.config || null,
        status: page.status,
        metaDescription: page.metaDescription,
        metaKeywords: page.metaKeywords,
        isSystemPage: page.isSystemPage || false,
        robotsIndex: page.robotsIndex ?? true,
      });
      pagesAddedCount++;
    } else {
      pagesSkippedCount++;
    }
  }

  if (pagesToAdd.length > 0) {
    try {
      await prisma.page.createMany({
        data: pagesToAdd,
      });

      for (const page of pagesToAdd) {
        rlog.log(`  | Added page: ${page.title} (${page.slug})`);
      }
    } catch (error) {
      rlog.error(`  | Batch page creation failed:`, error);

      // 降级处理：逐个创建
      for (const pageData of pagesToAdd) {
        try {
          await prisma.page.create({
            data: pageData,
          });
          rlog.log(`  | Added page: ${pageData.title} (${pageData.slug})`);
        } catch (individualError) {
          rlog.error(
            `  | Failed to add page ${pageData.title}:`,
            individualError,
          );
          pagesAddedCount--;
        }
      }
    }
  }

  // 检查现有的菜单
  const existingMenus = await prisma.menu.findMany({
    select: { id: true, slug: true },
  });
  const existingMenuIds = new Set(
    existingMenus.map((menu: { id: string }) => menu.id),
  );
  const existingMenuSlugs = new Set(
    existingMenus.map((menu: { slug?: string }) => menu.slug),
  );

  // 创建菜单
  const menusToAdd = [];
  for (const menu of defaultMenus) {
    if (!existingMenuIds.has(menu.id) && !existingMenuSlugs.has(menu.slug)) {
      menusToAdd.push({
        id: menu.id,
        name: menu.name,
        icon: menu.icon,
        link: menu.link,
        slug: menu.slug,
        status: menu.status,
        order: menu.order,
        category: menu.category,
        pageId: menu.pageId,
      });
      menusAddedCount++;
    } else {
      menusSkippedCount++;
    }
  }

  if (menusToAdd.length > 0) {
    try {
      await prisma.menu.createMany({
        data: menusToAdd,
      });

      for (const menu of menusToAdd) {
        rlog.info(
          `  | Added menu: ${menu.name} (${menu.slug || menu.link || menu.pageId})`,
        );
      }
    } catch (error) {
      rlog.error(`  | Batch menu creation failed:`, error);

      // 降级处理：逐个创建
      for (const menuData of menusToAdd) {
        try {
          await prisma.menu.create({
            data: menuData,
          });
          rlog.info(`  | Added menu: ${menuData.name} (${menuData.slug})`);
        } catch (individualError) {
          rlog.error(
            `  | Failed to add menu ${menuData.name}:`,
            individualError,
          );
          menusAddedCount--;
        }
      }
    }
  }

  rlog.success(
    `  Pages and menus check completed: added ${pagesAddedCount} pages, ${menusAddedCount} menus, skipped ${pagesSkippedCount} pages, ${menusSkippedCount} menus`,
  );
}

// 导出主函数供其他脚本使用
export { seedDefaults };

// 主函数 - 用于直接运行脚本
async function main() {
  try {
    await seedDefaults();
    rlog.success("  Database default value seeding completed");
  } catch (error) {
    rlog.error("  Database default value seeding failed:", error);
    process.exit(1);
  }
}

// 只有在直接运行此脚本时才执行
if (
  process.argv[1] &&
  (process.argv[1].endsWith("seed-defaults.ts") ||
    process.argv[1].endsWith("seed-defaults.js"))
) {
  rlog.log("Starting database default value seeding...");
  main();
}

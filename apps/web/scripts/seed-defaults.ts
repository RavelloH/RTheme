// scripts/seed-defaults.ts
// 数据库默认值种子脚本

import path from "path";
import RLog from "rlog-js";
import { pathToFileURL } from "url";

const rlog = new RLog();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pool: any;

// 从数据文件导入默认配置
import { defaultConfigs } from "../src/data/default-configs";
import { defaultMenus } from "../src/data/default-menus";
import { defaultPages } from "../src/data/default-pages";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedDefaults(options?: { prisma?: any }) {
  const externalPrisma = options?.prisma;
  const shouldManagePrismaLifecycle = !externalPrisma;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let prisma: any = externalPrisma;
    if (!prisma) {
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
        rlog.warning(
          "Prisma client not initialized, skipping default value seeding",
        );
        rlog.warning("Error details:", error);
        return;
      }
    }

    // 种子化默认配置
    await seedDefaultConfigs(prisma);

    // 种子化系统文件夹
    await seedSystemFolders(prisma);

    // 生成 VAPID 密钥（如果需要）
    await generateVapidKeysIfNeeded(prisma);

    // 种子化默认页面和菜单
    await seedDefaultPagesAndMenus(prisma);

    rlog.success("✓ Database default values check completed");
    if (shouldManagePrismaLifecycle) {
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
    }
  } catch (error) {
    rlog.error("Database default value seeding failed:", error);
    throw error;
  }
}

// 生成 VAPID 密钥（如果需要）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateVapidKeysIfNeeded(prisma: any) {
  rlog.log("> Checking VAPID keys for Web Push...");

  try {
    // 检查配置是否存在
    const vapidConfig = await prisma.config.findUnique({
      where: { key: "notice.webPush.vapidKeys" },
    });

    if (!vapidConfig) {
      rlog.warning("  VAPID config not found, skipping");
      return;
    }

    // 检查是否需要生成密钥
    const configValue = vapidConfig.value as {
      default?: { publicKey?: string; privateKey?: string };
    };

    if (
      !configValue?.default ||
      configValue.default.publicKey === "[AUTO_GENERATED]" ||
      !configValue.default.publicKey ||
      !configValue.default.privateKey
    ) {
      rlog.log("  Generating new VAPID keys...");

      try {
        // 动态导入 web-push（可能尚未安装）
        const webpush = await import("web-push");
        const vapidKeys = webpush.default.generateVAPIDKeys();

        // 更新配置
        await prisma.config.update({
          where: { key: "notice.webPush.vapidKeys" },
          data: {
            value: {
              default: {
                publicKey: vapidKeys.publicKey,
                privateKey: vapidKeys.privateKey,
              },
            },
          },
        });

        rlog.success(
          `✓ Generated VAPID keys for Web Push (Public Key: ${vapidKeys.publicKey.substring(0, 20)}...)`,
        );
      } catch {
        rlog.warning(
          "  web-push package not installed, skipping VAPID key generation",
        );
        rlog.warning(
          "  Please run 'pnpm add web-push' and re-run the build script",
        );
      }
    } else {
      rlog.info("  VAPID keys already configured, skipping");
    }
  } catch (error) {
    rlog.error("  Failed to generate VAPID keys:", error);
  }
}

// 种子化默认配置
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedDefaultConfigs(prisma: any) {
  rlog.log("> Checking default configurations...");

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
    `✓ Configuration check completed: added ${addedCount} items, skipped ${skippedCount} items`,
  );
}

// 种子化默认页面和菜单
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedDefaultPagesAndMenus(prisma: any) {
  rlog.log("> Checking default pages and menus...");

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
    `✓ Pages and menus check completed: added ${pagesAddedCount} pages, ${menusAddedCount} menus, skipped ${pagesSkippedCount} pages, ${menusSkippedCount} menus`,
  );
}

// 种子化系统文件夹
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function seedSystemFolders(prisma: any) {
  rlog.log("> Checking system folders...");

  let addedCount = 0;
  let skippedCount = 0;

  // 获取现有系统文件夹
  const existingFolders = await prisma.virtualFolder.findMany({
    where: {
      systemType: {
        in: ["ROOT_PUBLIC", "ROOT_USERS"],
      },
    },
    select: { id: true, systemType: true },
  });

  const existingSystemTypes = new Set(
    existingFolders.map((f: { systemType: string }) => f.systemType),
  );

  // 创建 Public 根文件夹
  if (!existingSystemTypes.has("ROOT_PUBLIC")) {
    try {
      await prisma.virtualFolder.create({
        data: {
          id: 1,
          name: "Public",
          systemType: "ROOT_PUBLIC",
          parentId: null,
          userUid: null,
          path: "1", // 根节点的 path 为自己的 ID（格式：包含自己的ID，如 Comment）
          depth: 0,
          order: 0,
        },
      });
      rlog.info("  | Added system folder: Public (ROOT_PUBLIC)");
      addedCount++;
    } catch (error) {
      rlog.error("  | Failed to add Public folder:", error);
    }
  } else {
    skippedCount++;
    rlog.info("  | System folder already exists: Public (ROOT_PUBLIC)");
  }

  // 创建 Users 根文件夹
  if (!existingSystemTypes.has("ROOT_USERS")) {
    try {
      await prisma.virtualFolder.create({
        data: {
          id: 2,
          name: "Users",
          systemType: "ROOT_USERS",
          parentId: null,
          userUid: null,
          path: "2", // 根节点的 path 为自己的 ID（格式：包含自己的ID，如 Comment）
          depth: 0,
          order: 1,
        },
      });
      rlog.info("  | Added system folder: Users (ROOT_USERS)");
      addedCount++;
    } catch (error) {
      rlog.error("  | Failed to add Users folder:", error);
    }
  } else {
    skippedCount++;
    rlog.info("  | System folder already exists: Users (ROOT_USERS)");
  }

  rlog.success(
    `✓ System folders check completed: added ${addedCount} items, skipped ${skippedCount} items`,
  );
}

// 主函数 - 用于直接运行脚本
async function main() {
  try {
    await seedDefaults();
    rlog.success("✓ Database default value seeding completed");
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

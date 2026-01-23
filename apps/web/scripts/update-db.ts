// script/update-db.ts
// 数据库更新和迁移脚本

import { config } from "dotenv";
import Rlog from "rlog-js";
import path from "path";
import { pathToFileURL } from "url";
import { execSync } from "child_process";
import fs from "fs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pool: any;

// 加载 .env 文件
config({
  quiet: true,
});

const rlog = new Rlog();

// 项目的迁移记录（用于验证数据库是否属于当前项目）
const PROJECT_MIGRATIONS = [
  "20250907093828_init",
  "20250910053758_password_reset",
  "20250910054138_fix_nonuid_issue",
];

// 主入口函数
async function main() {
  rlog.info("> Starting database update process...");

  try {
    await initializePrismaClient();
    await updateDatabaseInternal();
    rlog.success("  Database update completed successfully!");
  } catch (error) {
    rlog.error(
      `  Database update failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  } finally {
    await cleanup();
  }
}

// 初始化 Prisma 客户端
async function initializePrismaClient() {
  try {
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

    await prisma.$connect();
    rlog.success("✓ Prisma client initialized and connected");
  } catch (error) {
    throw new Error(`Failed to initialize Prisma client: ${error}`);
  }
}

// 检查数据库是否为空
async function isDatabaseEmpty(): Promise<boolean> {
  try {
    const tables = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `;

    return !Array.isArray(tables) || tables.length === 0;
  } catch (error) {
    rlog.warning(`  Could not check if database is empty: ${error}`);
    return false;
  }
}

// 检查是否存在迁移表
async function hasMigrationsTable(): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = '_prisma_migrations'
      )
    `;

    return (
      Array.isArray(result) &&
      result[0] &&
      (result[0] as { exists: boolean }).exists
    );
  } catch (error) {
    rlog.warning(`  Could not check migrations table: ${error}`);
    return false;
  }
}

// 检查数据库是否属于当前项目
async function isProjectDatabase(): Promise<boolean> {
  try {
    if (!(await hasMigrationsTable())) {
      return false;
    }

    const migrations = await prisma.$queryRaw`
      SELECT migration_name 
      FROM _prisma_migrations 
      ORDER BY finished_at
    `;

    if (!Array.isArray(migrations)) {
      return false;
    }

    const existingMigrations = migrations.map(
      (m: { migration_name: string }) => m.migration_name,
    );

    // 检查是否包含项目的核心迁移
    const hasInitMigration = existingMigrations.some((name) =>
      name.includes("init"),
    );

    // 如果有任何项目迁移记录，则认为是项目数据库
    const hasProjectMigrations = PROJECT_MIGRATIONS.some((projectMigration) =>
      existingMigrations.some((existing) => existing === projectMigration),
    );

    if (!hasInitMigration && !hasProjectMigrations) {
      rlog.warning(
        "  Database contains migrations but none match this project",
      );
      rlog.warning("  Existing migrations:");
      existingMigrations.forEach((name) => {
        rlog.warning(`  | ${name}`);
      });
      rlog.warning("  Expected project migrations:");
      PROJECT_MIGRATIONS.forEach((name) => {
        rlog.warning(`  | ${name}`);
      });
      return false;
    }

    rlog.success(
      `✓ Database contains ${existingMigrations.length} migrations from this project`,
    );
    return true;
  } catch (error) {
    rlog.warning(`  Could not verify project database: ${error}`);
    return false;
  }
}

// 运行 Prisma migrate deploy
async function runMigrateDeploy(): Promise<void> {
  try {
    rlog.info("> Running prisma migrate deploy...");

    // 确保 .prisma/client 存在
    const clientPath = path.join(
      process.cwd(),
      "node_modules",
      ".prisma",
      "client",
    );
    if (!fs.existsSync(clientPath)) {
      rlog.info("  Generating Prisma client first...");
      execSync("npx prisma generate", {
        stdio: "pipe",
        cwd: process.cwd(),
      });
    }

    const output = execSync("npx prisma migrate deploy", {
      stdio: "pipe",
      cwd: process.cwd(),
      encoding: "utf-8",
    });

    // 如果输出包含有用信息，显示它
    if (output && output.trim()) {
      const lines = output.trim().split("\n");
      lines.forEach((line) => {
        if (
          line.includes("Applied") ||
          line.includes("migration") ||
          line.includes("Database")
        ) {
          rlog.info(`  | ${line.trim()}`);
        }
      });
    }

    rlog.success("✓ Prisma migrate deploy completed successfully");
  } catch (error) {
    if (error instanceof Error && "stdout" in error) {
      const execError = error as Error & {
        stdout?: Buffer | string;
        stderr?: Buffer | string;
      };
      const stdout = execError.stdout?.toString();
      const stderr = execError.stderr?.toString();

      if (stdout) {
        rlog.info("  Migrate output:");
        stdout.split("\n").forEach((line: string) => {
          if (line.trim()) rlog.info(`  | ${line.trim()}`);
        });
      }

      if (stderr) {
        rlog.error("  Migrate errors:");
        stderr.split("\n").forEach((line: string) => {
          if (line.trim()) rlog.error(`  | ${line.trim()}`);
        });
      }
    }
    throw new Error(`Prisma migrate deploy failed: ${error}`);
  }
}

// 导出的更新函数（避免重复执行main函数）
export async function updateDatabase(): Promise<void> {
  try {
    rlog.info("> Starting database update...");
    await initializePrismaClient();
    await updateDatabaseInternal();
  } finally {
    await cleanup();
  }
}

// 内部更新逻辑（重命名避免冲突）
async function updateDatabaseInternal(): Promise<void> {
  const isEmpty = await isDatabaseEmpty();

  if (isEmpty) {
    rlog.info("  Database is empty, initializing with migrations...");
    await runMigrateDeploy();
    rlog.success("✓ Database initialized successfully");
    return;
  }

  rlog.info(
    "> Database is not empty, checking if it belongs to this project...",
  );

  const isProjectDb = await isProjectDatabase();

  if (!isProjectDb) {
    throw new Error(
      "Database contains data but does not appear to belong to this project. " +
        "Please use a different database or manually verify the database contents.",
    );
  }

  rlog.info(
    "  Database belongs to this project, applying any pending migrations...",
  );
  await runMigrateDeploy();
  rlog.success("  Database updated successfully");
}

// 清理资源
async function cleanup() {
  if (prisma) {
    try {
      await prisma.$disconnect();
      rlog.info("  Database connection closed");
    } catch (error) {
      rlog.warning(
        `  Error closing database connection: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
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

// 检查是否是直接运行
function isMainModule(): boolean {
  try {
    // 检查当前文件是否是主模块
    const arg1 = process.argv[1];
    return (
      import.meta.url === pathToFileURL(arg1 || "").href ||
      (arg1?.endsWith("update-db.ts") ?? false) ||
      (arg1?.endsWith("update-db.js") ?? false)
    );
  } catch {
    return false;
  }
}

// 如果直接运行此脚本
if (isMainModule()) {
  main();
}

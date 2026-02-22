// script/check-db.ts
// 检查数据库连接，验证数据库健康状态

import { execSync } from "child_process";
import path from "path";
import Rlog from "rlog-js";
import { pathToFileURL } from "url";

import { loadWebEnv } from "@/../scripts/load-env";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let prisma: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pool: any;

// 加载 apps/web 与仓库根目录下的 .env* 文件
loadWebEnv();

const rlog = new Rlog();

// 导出的数据库健康检查函数
export async function checkDatabaseHealth(options?: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma?: any;
}): Promise<void> {
  rlog.info("> Starting database health check...");
  const externalPrisma = options?.prisma;
  const shouldManagePrismaLifecycle = !externalPrisma;

  try {
    await checkEnvironment();
    if (externalPrisma) {
      prisma = externalPrisma;
    } else {
      await initializePrismaClient();
    }
    await testConnection();
    await checkDatabaseSchema();
    await checkMigrationStatus();
    await performHealthChecks();

    rlog.success("✓ Database health check completed");
  } catch (error) {
    rlog.error(
      `  Database health check failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error; // 重新抛出错误，让调用者处理
  } finally {
    if (shouldManagePrismaLifecycle) {
      await cleanup();
    }
  }
}

// 主入口函数
async function main() {
  try {
    await checkDatabaseHealth();
  } catch {
    process.exit(1);
  }
}

// 检查环境变量
async function checkEnvironment() {
  const dbConnectionString = process.env.DATABASE_URL;
  if (!dbConnectionString) {
    rlog.error("  DATABASE_URL environment variable is not set");
    rlog.error("  Please set DATABASE_URL in your .env file");
    rlog.error(
      "  Example: DATABASE_URL=postgresql://user:password@localhost:5432/database",
    );
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // 验证连接字符串格式
  if (
    !dbConnectionString.startsWith("postgresql://") &&
    !dbConnectionString.startsWith("postgres://")
  ) {
    rlog.error(
      "  DATABASE_URL doesn't appear to be a PostgreSQL connection string",
    );
    rlog.error(`  Current value: ${dbConnectionString}`);
    rlog.error(
      "  Expected format: postgresql://user:password@host:port/database",
    );
    throw new Error("Invalid DATABASE_URL format");
  }

  rlog.success("✓ Environment variables validated");
}

// 初始化 Prisma 客户端
async function initializePrismaClient() {
  // 运行生成
  rlog.info("> Generating Prisma client...");
  const output = execSync("npx prisma generate", {
    stdio: "pipe",
    cwd: process.cwd(),
    encoding: "utf-8",
  });

  // 如果输出包含有用信息，显示它
  if (output && output.trim()) {
    const lines = output.trim().split("\n");
    lines.forEach((line) => {
      rlog.info(`  | ${line.trim()}`);
    });
  }

  rlog.info("  Prisma migrate deploy completed successfully");

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

    rlog.success("✓ Prisma client initialized");
  } catch (error) {
    rlog.error(error);
    rlog.exit(`Failed to initialize Prisma client`);
  }
}

// 测试数据库连接
async function testConnection() {
  rlog.info("> Testing database connection...");

  try {
    await prisma.$connect();
    rlog.info("  Database connection established");

    // 测试基本查询
    await prisma.$queryRaw`SELECT 1 as test`;
    rlog.success("✓ Basic query execution successful");
  } catch (error) {
    throw new Error(`Database connection failed: ${error}`);
  }
}

// 检查数据库架构
async function checkDatabaseSchema() {
  rlog.info("> Checking database schema...");

  try {
    // 先检查数据库中有哪些表
    const existingTables = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `;

    if (Array.isArray(existingTables)) {
      rlog.info(`  Found ${existingTables.length} tables in database:`);
      existingTables.forEach((table: { tablename: string }) => {
        rlog.info(`  | ${table.tablename}`);
      });
    }

    // 检查主要表是否存在并计数
    const expectedTables = [
      { name: "User", model: () => prisma.user },
      { name: "Post", model: () => prisma.post },
      { name: "Comment", model: () => prisma.comment },
      { name: "Media", model: () => prisma.media },
      { name: "Config", model: () => prisma.config },
    ];

    for (const table of expectedTables) {
      const tableName = table.name; // 保持原始大小写
      const tableExists =
        Array.isArray(existingTables) &&
        existingTables.some(
          (t: { tablename: string }) =>
            t.tablename.toLowerCase() === tableName.toLowerCase(),
        );

      if (tableExists) {
        try {
          const count = await table.model().count();
          rlog.info(`  ✓ Table '${table.name}': ${count} records`);
        } catch (error) {
          rlog.warning(
            `  ! Table '${table.name}' exists but counting failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      } else {
        rlog.warning(`  ✗ Table '${table.name}' does not exist`);
      }
    }

    rlog.success("✓ Database schema check completed");
  } catch (error) {
    rlog.error(
      `  Schema check encountered issues: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// 检查迁移状态
async function checkMigrationStatus() {
  rlog.info("> Checking migration status...");

  try {
    // 先检查 _prisma_migrations 表是否存在
    const migrationTableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = '_prisma_migrations'
      )
    `;

    const exists =
      Array.isArray(migrationTableExists) &&
      migrationTableExists[0] &&
      (migrationTableExists[0] as { exists: boolean }).exists;

    if (!exists) {
      rlog.warning("  _prisma_migrations table does not exist");
      rlog.info(
        "  This suggests the database hasn't been initialized with Prisma",
      );
      rlog.info(
        "  Run 'npx prisma migrate deploy' or 'npx prisma db push' to set up the database",
      );
      return;
    }

    // 检查迁移记录
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at, applied_steps_count 
      FROM _prisma_migrations 
      ORDER BY finished_at DESC 
      LIMIT 5
    `;

    if (Array.isArray(migrations) && migrations.length > 0) {
      rlog.info(`  Found ${migrations.length} recent migrations:`);
      migrations.forEach(
        (
          migration: {
            migration_name: string;
            finished_at: string;
            applied_steps_count: number;
          },
          index,
        ) => {
          rlog.info(
            `  | ${index + 1}. ${migration.migration_name} (${migration.applied_steps_count} steps)`,
          );
        },
      );
    } else {
      rlog.warning("  No migrations found in _prisma_migrations table");
    }

    rlog.success("✓ Migration status check completed");
  } catch (error) {
    rlog.error(
      `  Migration status check failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// 执行健康检查
async function performHealthChecks() {
  rlog.info("> Performing health checks...");

  try {
    // 检查数据库版本
    const version = await prisma.$queryRaw`SELECT version()`;
    if (Array.isArray(version) && version.length > 0) {
      const versionStr = (version[0] as { version: string }).version;
      rlog.info(
        `  | PostgreSQL version: ${versionStr.split(" ").slice(0, 2).join(" ")}`,
      );
    }

    // 检查连接池状态
    const connections = await prisma.$queryRaw`
      SELECT count(*) as active_connections 
      FROM pg_stat_activity 
      WHERE state = 'active'
    `;

    if (Array.isArray(connections) && connections.length > 0) {
      const activeConnections = (
        connections[0] as { active_connections: number }
      ).active_connections;
      rlog.info(`  | Active connections: ${activeConnections}`);
    }

    // 检查数据库大小
    const dbSize = await prisma.$queryRaw`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;

    if (Array.isArray(dbSize) && dbSize.length > 0) {
      const size = (dbSize[0] as { size: string }).size;
      rlog.info(`  | Database size: ${size}`);
    }

    rlog.success("  Health checks completed");
  } catch (error) {
    rlog.exit(
      `  Health checks encountered issues: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
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
      (arg1?.endsWith("check-db.ts") ?? false) ||
      (arg1?.endsWith("check-db.js") ?? false)
    );
  } catch {
    return false;
  }
}

// 如果直接运行此脚本
if (isMainModule()) {
  main();
}

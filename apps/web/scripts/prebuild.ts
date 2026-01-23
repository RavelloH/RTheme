// script/prebuild.ts
// run before building the project

import fs from "fs";
import path from "path";
import Rlog from "rlog-js";
import { config } from "dotenv";
// 加载 .env 文件
config({
  quiet: true,
});
const rlog = new Rlog();

rlog.config.setConfigGlobal({
  silent: true,
});

rlog.config.setConfig({
  customColorRules: [{ reg: "NeutralPress", color: "green" }],
  silent: false,
});

rlog.file.init();

const startTime = Date.now();
rlog.log();
rlog.log("NeutralPress Initializating...");
rlog.log();

rlog.log("Starting environment variables check...");
const { checkEnvironmentVariables } = await import("./check-env.js");
await checkEnvironmentVariables();
rlog.log();

rlog.log("Starting JWT key pair validation...");
const { checkJWTKeyPair } = await import("./check-jwt-token.js");
await checkJWTKeyPair();
rlog.log();

rlog.log("Starting Redis connection check...");
const { checkRedisConnection } = await import("./check-redis.js");
await checkRedisConnection();
rlog.log();

rlog.log("Starting database check...");
try {
  const { checkDatabaseHealth } = await import("./check-db.js");
  await checkDatabaseHealth();
  rlog.log();

  rlog.log("Starting database update...");
  const { updateDatabase } = await import("./update-db.js");
  await updateDatabase();
  rlog.log();

  rlog.info("Starting database seeding with default values...");
  const { seedDefaults } = await import("./seed-defaults.js");
  await seedDefaults();
  rlog.log();

  rlog.log("Starting configuration cache generation...");
  const { generateConfigCache } = await import("./generate-config-cache.js");
  await generateConfigCache();
  rlog.log();

  rlog.log("Starting menu cache generation...");
  const { generateMenuCache } = await import("./generate-menu-cache.js");
  await generateMenuCache();
  rlog.log();

  rlog.log("Starting page cache generation...");
  const { generatePageCache } = await import("./generate-page-cache.js");
  await generatePageCache();
  rlog.log();

  rlog.log("Starting view count cache generation...");
  const { default: generateViewCountCache } = await import(
    "./generate-view-count-cache.js"
  );
  await generateViewCountCache();
  rlog.log();

  // 完成 PreBuild
  const endTime = Date.now();

  // 写入构建元数据供 postbuild 使用
  const cacheDir = path.join(process.cwd(), ".cache");
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(cacheDir, "build-meta.json"),
    JSON.stringify({
      prebuildStartTime: startTime,
      prebuildEndTime: endTime,
    }),
  );

  rlog.success("✓ NeutralPress initialization completed successfully!");
  rlog.log("Time spend: " + ((endTime - startTime) / 1000).toFixed(2) + "s");
} catch (error) {
  rlog.log();
  rlog.error("Database initialization failed:");
  rlog.error(`  ${error instanceof Error ? error.message : String(error)}`);
  rlog.log();
  rlog.error("Please check your database configuration and try again.");
  process.exit(1);
}

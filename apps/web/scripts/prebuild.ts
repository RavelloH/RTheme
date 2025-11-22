// script/init.ts
// run before building the project

import Rlog from "rlog-js";
import { config } from "dotenv";
// 加载 .env 文件
config({
  quiet: true,
});
const rlog = new Rlog();

rlog.config.setConfigGlobal({
  logFilePath: "./logs/init.log",
  silent: true,
});

rlog.config.setConfig({
  customColorRules: [{ reg: "NeutralPress", color: "green" }],
  silent: false,
});

const startTime = Date.now();
rlog.log();
rlog.log("NeutralPress Initializating...");
rlog.log();

rlog.log("Starting environment variables check...");
const { checkEnvironmentVariables } = await import("./check-env.js");
await checkEnvironmentVariables();
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

  // 完成 PreBuild
  const endTime = Date.now();
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

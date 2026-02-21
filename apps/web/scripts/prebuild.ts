// script/prebuild.ts
// run before building the project

import fs from "fs";
import path from "path";
import Rlog from "rlog-js";

import { loadWebEnv } from "@/../scripts/load-env";

// 加载 apps/web 与仓库根目录下的 .env* 文件
loadWebEnv();

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
const isPortableBuild = process.env.BUILD_PROFILE === "portable";

rlog.log();
rlog.log("NeutralPress Initializing...");
rlog.log();

const nextCacheDir = path.join(process.cwd(), ".next", "cache");
if (fs.existsSync(nextCacheDir)) {
  rlog.info("Clearing Next.js cache...");
  fs.rmSync(nextCacheDir, { recursive: true, force: true });
  rlog.log();
}

const cacheDir = path.join(process.cwd(), ".cache");
if (fs.existsSync(cacheDir)) {
  rlog.info("Clearing build cache...");
  fs.rmSync(cacheDir, { recursive: true, force: true });
  rlog.log();
}

try {
  if (isPortableBuild) {
    rlog.warning(
      "Portable build profile detected: skip DB/Redis initialization during build.",
    );
    rlog.log();
  } else {
    rlog.log("Starting environment variables check...");
    const { checkEnvironmentVariables } = await import("./check-env.js");
    await checkEnvironmentVariables();
    rlog.log();

    rlog.log("Starting JWT key pair validation and Redis connection check...");
    const [{ checkJWTKeyPair }, { checkRedisConnection }] = await Promise.all([
      import("./check-jwt-token.js"),
      import("./check-redis.js"),
    ]);
    await Promise.all([checkJWTKeyPair(), checkRedisConnection()]);
    rlog.log();

    rlog.log("Starting database check...");
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

    rlog.log("Starting persistent media synchronization...");
    const { syncPersistentMedia } = await import("./sync-persistent-media.js");
    await syncPersistentMedia();
    rlog.log();

    rlog.log("Starting cloud instance synchronization...");
    const { syncCloudInstance } = await import("./sync-cloud-instance.js");
    await syncCloudInstance();
    rlog.log();

    rlog.log("Starting configuration, menu, and page cache generation...");
    const [
      { generateConfigCache },
      { generateMenuCache },
      { generatePageCache },
    ] = await Promise.all([
      import("./generate-config-cache.js"),
      import("./generate-menu-cache.js"),
      import("./generate-page-cache.js"),
    ]);
    await Promise.all([
      generateConfigCache(),
      generateMenuCache(),
      generatePageCache(),
    ]);
    rlog.log();

    rlog.log("Starting view count cache generation...");
    const { default: generateViewCountCache } = await import(
      "./generate-view-count-cache.js"
    );
    await generateViewCountCache();
    rlog.log();
  }

  rlog.log("Starting block business catalog generation...");
  const { generateBlockBusinessCatalog } = await import(
    "./generate-block-business-catalog.js"
  );
  generateBlockBusinessCatalog();
  rlog.log();

  rlog.log("Starting block definition catalog generation...");
  const { generateBlockDefinitionCatalog } = await import(
    "./generate-block-definition-catalog.js"
  );
  generateBlockDefinitionCatalog();

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
  rlog.error("Prebuild failed:");
  rlog.error(`  ${error instanceof Error ? error.message : String(error)}`);
  rlog.log();
  if (isPortableBuild) {
    rlog.error(
      "Please check your build configuration and generated code artifacts.",
    );
  } else {
    rlog.error("Please check your database configuration and try again.");
  }
  process.exit(1);
}

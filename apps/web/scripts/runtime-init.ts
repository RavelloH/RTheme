// scripts/runtime-init.ts
// 运行期初始化：连接外部依赖并执行迁移、种子和缓存预热

import Rlog from "rlog-js";
import { pathToFileURL } from "url";

import { loadWebEnv } from "@/../scripts/load-env";

loadWebEnv();

const rlog = new Rlog();

rlog.config.setConfig({
  customColorRules: [{ reg: "NeutralPress", color: "green" }],
  silent: false,
});

export async function runRuntimeInitialization(): Promise<void> {
  await runRuntimeInitializationWithOptions();
}

export async function runRuntimeInitializationWithOptions(options?: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma?: any;
  runMigrateDeploy?: () => Promise<void>;
}): Promise<void> {
  rlog.log();
  rlog.log("NeutralPress Runtime Initialization...");
  rlog.log();

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
  await checkDatabaseHealth({
    prisma: options?.prisma,
  });
  rlog.log();

  rlog.log("Starting database update...");
  const { updateDatabase } = await import("./update-db.js");
  await updateDatabase({
    prisma: options?.prisma,
    runMigrateDeploy: options?.runMigrateDeploy,
  });
  rlog.log();

  rlog.info("Starting database seeding with default values...");
  const { seedDefaults } = await import("./seed-defaults.js");
  await seedDefaults({
    prisma: options?.prisma,
  });
  rlog.log();

  rlog.log("Starting persistent media synchronization...");
  const { syncPersistentMedia } = await import("./sync-persistent-media.js");
  await syncPersistentMedia({
    prisma: options?.prisma,
  });
  rlog.log();

  rlog.log("Starting cloud instance synchronization...");
  const { syncCloudInstance } = await import("./sync-cloud-instance.js");
  await syncCloudInstance({
    prisma: options?.prisma,
  });
  rlog.log();

  rlog.log("Starting view count cache generation...");
  const { default: generateViewCountCache } = await import(
    "./generate-view-count-cache.js"
  );
  await generateViewCountCache({
    prisma: options?.prisma,
  });
  rlog.log();

  rlog.success("✓ Runtime initialization completed successfully!");
  rlog.log();
}

async function main() {
  try {
    await runRuntimeInitializationWithOptions();
  } catch (error) {
    rlog.log();
    rlog.error(
      `Runtime initialization failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

function isMainModule(): boolean {
  try {
    const arg1 = process.argv[1];
    return (
      import.meta.url === pathToFileURL(arg1 || "").href ||
      (arg1?.endsWith("runtime-init.ts") ?? false) ||
      (arg1?.endsWith("runtime-init.js") ?? false)
    );
  } catch {
    return false;
  }
}

if (isMainModule()) {
  main();
}

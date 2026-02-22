import "server-only";

import RLog from "rlog-js";

import { checkDatabaseHealth } from "@/../scripts/check-db";
import { checkEnvironmentVariables } from "@/../scripts/check-env";
import { checkJWTKeyPair } from "@/../scripts/check-jwt-token";
import { checkRedisConnection } from "@/../scripts/check-redis";
import generateViewCountCache from "@/../scripts/generate-view-count-cache";
import { seedDefaults } from "@/../scripts/seed-defaults";
import { syncCloudInstance } from "@/../scripts/sync-cloud-instance";
import { syncPersistentMedia } from "@/../scripts/sync-persistent-media";
import { updateDatabase } from "@/../scripts/update-db";
import prisma from "@/lib/server/prisma";
import { runPrismaMigrateDeploy } from "@/lib/server/prisma-migrate";

type RuntimeInitState = {
  completedAt: string;
};

const rlog = new RLog();

const globalRuntimeInitState = globalThis as unknown as {
  runtimeInitPromise?: Promise<RuntimeInitState>;
  runtimeInitCompletedAt?: string;
};

async function runMigrateDeployForStandalone(): Promise<void> {
  rlog.info("> Running prisma migrate deploy...");
  await runPrismaMigrateDeploy({
    logger: (line) => {
      rlog.info(`  | ${line}`);
    },
  });
  rlog.success("✓ Prisma migrate deploy completed successfully");
}

async function runRuntimeInitializationWithInjectedPrisma(): Promise<void> {
  await checkEnvironmentVariables();
  await Promise.all([checkJWTKeyPair(), checkRedisConnection()]);
  await checkDatabaseHealth({ prisma });
  await updateDatabase({
    prisma,
    runMigrateDeploy: runMigrateDeployForStandalone,
  });
  await seedDefaults({ prisma });
  await syncPersistentMedia({ prisma });
  await syncCloudInstance({ prisma });
  await generateViewCountCache({ prisma });
}

export async function runInternalRuntimeInitialization(): Promise<{
  completedAt: string;
  reused: boolean;
}> {
  if (globalRuntimeInitState.runtimeInitCompletedAt) {
    return {
      completedAt: globalRuntimeInitState.runtimeInitCompletedAt,
      reused: true,
    };
  }

  const hasInFlightInitialization = Boolean(
    globalRuntimeInitState.runtimeInitPromise,
  );

  if (!globalRuntimeInitState.runtimeInitPromise) {
    globalRuntimeInitState.runtimeInitPromise = (async () => {
      await runRuntimeInitializationWithInjectedPrisma();
      const completedAt = new Date().toISOString();
      globalRuntimeInitState.runtimeInitCompletedAt = completedAt;
      return { completedAt };
    })().finally(() => {
      globalRuntimeInitState.runtimeInitPromise = undefined;
    });
  }

  const result = await globalRuntimeInitState.runtimeInitPromise;
  return {
    completedAt: result.completedAt,
    reused: hasInFlightInitialization,
  };
}

// scripts/bootstrap-cache.ts
// Docker 启动后触发 cacheTag 刷新，清理构建期 portable 数据缓存

import Rlog from "rlog-js";

import { loadWebEnv } from "@/../scripts/load-env";
import { deriveCacheBootstrapToken } from "@/lib/shared/cache-bootstrap-auth";

loadWebEnv();

const rlog = new Rlog();

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveBootstrapConfig() {
  const endpoint =
    process.env.CACHE_BOOTSTRAP_URL?.trim() ||
    "http://web:3000/api/internal/cache/bootstrap";
  const maxAttempts = parsePositiveInt(process.env.CACHE_BOOTSTRAP_RETRIES, 60);
  const intervalMs = parsePositiveInt(
    process.env.CACHE_BOOTSTRAP_INTERVAL_MS,
    2000,
  );

  return {
    endpoint,
    maxAttempts,
    intervalMs,
  };
}

function resolveAuthorizationToken(): string {
  const masterSecret = process.env.MASTER_SECRET;
  if (!masterSecret) {
    throw new Error("MASTER_SECRET 未设置，无法触发 cache bootstrap");
  }

  const token = deriveCacheBootstrapToken(masterSecret);
  return `Bearer ${token}`;
}

async function requestBootstrapCache(
  endpoint: string,
  authorization: string,
): Promise<{ ok: boolean; status: number; responseText: string }> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      trigger: "docker-compose",
    }),
  });

  const responseText = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    responseText,
  };
}

async function run(): Promise<void> {
  const { endpoint, maxAttempts, intervalMs } = resolveBootstrapConfig();
  const authorization = resolveAuthorizationToken();

  rlog.info(`> Cache bootstrap endpoint: ${endpoint}`);
  rlog.info(
    `> Retry policy: ${maxAttempts} attempts, interval ${intervalMs}ms`,
  );

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await requestBootstrapCache(endpoint, authorization);

      if (result.ok) {
        rlog.success("✓ Cache bootstrap completed");
        if (result.responseText.trim().length > 0) {
          rlog.info(`  Response: ${result.responseText}`);
        }
        return;
      }

      rlog.warning(
        `  Attempt ${attempt}/${maxAttempts} failed: HTTP ${result.status}`,
      );
      if (result.responseText.trim().length > 0) {
        rlog.warning(`  Body: ${result.responseText}`);
      }
    } catch (error) {
      rlog.warning(
        `  Attempt ${attempt}/${maxAttempts} failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    if (attempt < maxAttempts) {
      await sleep(intervalMs);
    }
  }

  throw new Error("Cache bootstrap failed after max retries");
}

run().catch((error) => {
  rlog.error(
    `Cache bootstrap script failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
});

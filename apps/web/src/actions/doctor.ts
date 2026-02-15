"use server";

import type {
  ApiResponse,
  ApiResponseData,
} from "@repo/shared-types/api/common";
import type {
  Doctor,
  DoctorCheckDetail,
  DoctorHistoryItem,
  DoctorSuccessResponse,
  DoctorTrendItem,
  GetDoctorHistory,
  GetDoctorTrends,
} from "@repo/shared-types/api/doctor";
import {
  DoctorSchema,
  GetDoctorHistorySchema,
  GetDoctorTrendsSchema,
} from "@repo/shared-types/api/doctor";
import { headers } from "next/headers";
import type { NextResponse } from "next/server";

import {
  buildDoctorBriefFromIssues,
  formatDoctorCheckDetails,
  getDoctorCheckMessage,
  getDoctorCheckOrder,
} from "@/data/check-config";
import { flushEventsToDatabase } from "@/lib/server/analytics-flush";
import { authVerify } from "@/lib/server/auth-verify";
import { getConfig } from "@/lib/server/config-cache";
import { runDoctorMaintenance } from "@/lib/server/doctor-maintenance";
import prisma from "@/lib/server/prisma";
import limitControl from "@/lib/server/rate-limit";
import redis, { ensureRedisConnection } from "@/lib/server/redis";
import ResponseBuilder from "@/lib/server/response";
import { validateData } from "@/lib/server/validator";

type SnapshotStatus = "O" | "W" | "E";
type SnapshotValue = number | string | boolean | null;
type SnapshotCheck = {
  v: SnapshotValue;
  d: number;
  s: SnapshotStatus;
};
type HealthCheckSnapshot = {
  checks: Record<string, SnapshotCheck>;
};

type HealthCheckIssue = DoctorSuccessResponse["data"]["issues"][number];

type ActionEnvironment = "serverless" | "serveraction";
type ActionConfig = { environment?: ActionEnvironment };
type ActionResult<T extends ApiResponseData> =
  | NextResponse<ApiResponse<T>>
  | ApiResponse<T>;

const DOCTOR_CACHE_WINDOW_MS = 23 * 60 * 60 * 1000;

function snapshotStatusToSeverity(
  status: SnapshotStatus,
): HealthCheckIssue["severity"] {
  if (status === "E") return "error";
  if (status === "W") return "warning";
  return "info";
}

function classifyByThreshold(
  value: number,
  warningThreshold: number,
  errorThreshold: number,
): SnapshotStatus {
  if (value < warningThreshold) return "O";
  if (value < errorThreshold) return "W";
  return "E";
}

function normalizeSnapshotValue(value: unknown): SnapshotValue {
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return null;
}

function parseSnapshot(snapshot: unknown): HealthCheckSnapshot {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return { checks: {} };
  }

  const snapshotObj = snapshot as { checks?: unknown };
  if (
    !snapshotObj.checks ||
    typeof snapshotObj.checks !== "object" ||
    Array.isArray(snapshotObj.checks)
  ) {
    return { checks: {} };
  }

  const normalizedChecks: Record<string, SnapshotCheck> = {};
  const rawChecks = snapshotObj.checks as Record<string, unknown>;
  for (const [code, rawCheck] of Object.entries(rawChecks)) {
    if (!rawCheck || typeof rawCheck !== "object" || Array.isArray(rawCheck)) {
      continue;
    }
    const checkObj = rawCheck as {
      v?: unknown;
      d?: unknown;
      s?: unknown;
    };
    const durationMs =
      typeof checkObj.d === "number" &&
      Number.isFinite(checkObj.d) &&
      checkObj.d >= 0
        ? Math.round(checkObj.d)
        : 0;
    const status =
      checkObj.s === "O" || checkObj.s === "W" || checkObj.s === "E"
        ? checkObj.s
        : "O";

    normalizedChecks[code] = {
      v: normalizeSnapshotValue(checkObj.v),
      d: durationMs,
      s: status,
    };
  }

  return { checks: normalizedChecks };
}

function buildCheckDetails(
  snapshotChecks: Record<string, SnapshotCheck>,
): DoctorCheckDetail[] {
  const checks: DoctorCheckDetail[] = Object.entries(snapshotChecks).map(
    ([code, check]) => {
      const severity = snapshotStatusToSeverity(check.s);
      return {
        code,
        message: getDoctorCheckMessage(code),
        severity,
        details: formatDoctorCheckDetails(code, check.v),
        value: check.v,
        durationMs: check.d,
        status: check.s,
      };
    },
  );

  checks.sort((a, b) => {
    const orderDiff = getDoctorCheckOrder(a.code) - getDoctorCheckOrder(b.code);
    if (orderDiff !== 0) return orderDiff;
    return a.code.localeCompare(b.code);
  });

  return checks;
}

function buildIssues(checks: DoctorCheckDetail[]): HealthCheckIssue[] {
  return checks.map((check) => ({
    code: check.code,
    message: check.message,
    severity: check.severity,
    details: check.details,
  }));
}

function buildCounts(snapshotChecks: Record<string, SnapshotCheck>): {
  okCount: number;
  warningCount: number;
  errorCount: number;
} {
  let okCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  for (const check of Object.values(snapshotChecks)) {
    if (check.s === "E") {
      errorCount++;
    } else if (check.s === "W") {
      warningCount++;
    } else {
      okCount++;
    }
  }

  return { okCount, warningCount, errorCount };
}

function getOverallStatus(
  counts: ReturnType<typeof buildCounts>,
): "OK" | "WARNING" | "ERROR" {
  if (counts.errorCount > 0) return "ERROR";
  if (counts.warningCount > 0) return "WARNING";
  return "OK";
}

async function measure<T>(
  fn: () => Promise<T>,
): Promise<{ value: T; durationMs: number }> {
  const start = Date.now();
  const value = await fn();
  return {
    value,
    durationMs: Date.now() - start,
  };
}

export async function doctor(
  params: Doctor,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<DoctorSuccessResponse["data"]>>>;
export async function doctor(
  params: Doctor,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<DoctorSuccessResponse["data"]>>;
export async function doctor(
  { access_token, force = false }: Doctor,
  serverConfig?: ActionConfig,
): Promise<ActionResult<DoctorSuccessResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );
  if (!(await limitControl(await headers(), "doctor"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      force,
    },
    DoctorSchema,
  );
  if (validationError) return response.badRequest(validationError);

  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: access_token,
  });
  if (!user) {
    return response.unauthorized();
  }

  try {
    const persistTriggerType: "MANUAL" | "AUTO" = force ? "MANUAL" : "AUTO";
    if (force) {
      const { after } = await import("next/server");
      after(() => {
        runDoctorMaintenance().catch((error) => {
          console.error("Doctor maintenance background task failed:", error);
        });
      });
    }

    if (!force) {
      const cachedRecord = await prisma.healthCheck.findFirst({
        where: {
          createdAt: {
            gte: new Date(Date.now() - DOCTOR_CACHE_WINDOW_MS),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          startedAt: true,
          createdAt: true,
          durationMs: true,
          triggerType: true,
          overallStatus: true,
          okCount: true,
          warningCount: true,
          errorCount: true,
          snapshot: true,
        },
      });

      if (cachedRecord) {
        const cachedSnapshot = parseSnapshot(cachedRecord.snapshot);
        const cachedChecks = buildCheckDetails(cachedSnapshot.checks);
        const cachedIssues = buildIssues(cachedChecks);

        return response.ok({
          data: {
            createdAt: cachedRecord.createdAt.toISOString(),
            startedAt: cachedRecord.startedAt.toISOString(),
            durationMs: cachedRecord.durationMs,
            triggerType: cachedRecord.triggerType,
            status: cachedRecord.overallStatus,
            okCount: cachedRecord.okCount,
            warningCount: cachedRecord.warningCount,
            errorCount: cachedRecord.errorCount,
            issues: cachedIssues,
          },
        });
      }
    }

    const startedAt = new Date();
    const startedAtMs = Date.now();

    const getDBSize = async (): Promise<number> => {
      const result = await prisma.$queryRaw<
        Array<{ size: bigint }>
      >`SELECT pg_database_size(current_database()) AS size;`;
      return Number(result[0]?.size || 0);
    };

    const getDBLatency = async (): Promise<number> => {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1;`;
      return Date.now() - start;
    };

    const getDBConnectionCount = async (): Promise<number> => {
      const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) FROM pg_stat_activity WHERE datname = current_database();
      `;
      return Number(result[0]?.count || 0);
    };

    const getRedisLatency = async (): Promise<number> => {
      try {
        await ensureRedisConnection();
        const start = Date.now();
        await redis.ping();
        return Date.now() - start;
      } catch (error) {
        console.error("Redis latency check failed:", error);
        return -1;
      }
    };

    const getRedisMemory = async (): Promise<{
      used: number;
      peak: number;
      fragmentation: number;
    }> => {
      try {
        await ensureRedisConnection();
        const info = await redis.info("memory");
        const lines = info.split("\r\n");

        const getValue = (key: string): number => {
          const line = lines.find((item) => item.startsWith(key));
          if (!line) return 0;
          const value = line.split(":")[1];
          return value ? parseInt(value, 10) || 0 : 0;
        };

        const getFloatValue = (key: string): number => {
          const line = lines.find((item) => item.startsWith(key));
          if (!line) return 0;
          const value = line.split(":")[1];
          return value ? parseFloat(value) || 0 : 0;
        };

        return {
          used: getValue("used_memory"),
          peak: getValue("used_memory_peak"),
          fragmentation: getFloatValue("mem_fragmentation_ratio"),
        };
      } catch (error) {
        console.error("Redis memory check failed:", error);
        return { used: -1, peak: -1, fragmentation: -1 };
      }
    };

    const getRedisKeyCount = async (): Promise<{
      cache: number;
      rate: number;
      analytics: number;
      viewCount: number;
      total: number;
    }> => {
      try {
        await ensureRedisConnection();

        const scanPattern = async (pattern: string): Promise<string[]> => {
          const keys: string[] = [];
          let cursor = "0";
          do {
            const [nextCursor, batch] = await redis.scan(
              cursor,
              "MATCH",
              pattern,
              "COUNT",
              200,
            );
            cursor = nextCursor;
            keys.push(...batch);
          } while (cursor !== "0");
          return keys;
        };

        const [cacheKeys, rateKeys, analyticsKeys, viewCountKeys] =
          await Promise.all([
            scanPattern("np:cache:*"),
            scanPattern("np:rate:*"),
            scanPattern("np:analytics:*"),
            scanPattern("np:view_count:*"),
          ]);

        return {
          cache: cacheKeys.length,
          rate: rateKeys.length,
          analytics: analyticsKeys.length,
          viewCount: viewCountKeys.length,
          total: await redis.dbsize(),
        };
      } catch (error) {
        console.error("Redis key count check failed:", error);
        return { cache: -1, rate: -1, analytics: -1, viewCount: -1, total: -1 };
      }
    };

    const getSiteSelfLatency = async (): Promise<{
      ok: boolean;
      latencyMs: number | null;
      message?: string;
    }> => {
      try {
        const siteUrlConfig = await getConfig("site.url");
        const siteUrl =
          typeof siteUrlConfig === "string" ? siteUrlConfig.trim() : "";

        if (!siteUrl) {
          return {
            ok: false,
            latencyMs: null,
            message: "site.url 未配置",
          };
        }

        let target: URL;
        try {
          target = new URL(siteUrl);
        } catch {
          return {
            ok: false,
            latencyMs: null,
            message: "site.url 格式无效",
          };
        }

        target.pathname = "/";
        target.search = "";
        target.hash = "";

        const start = Date.now();
        const response = await fetch(target.toString(), {
          method: "GET",
          cache: "no-store",
          headers: {
            "user-agent": "NeutralPress-Doctor/1.0",
          },
        });
        const latencyMs = Date.now() - start;

        if (!response.ok) {
          return {
            ok: false,
            latencyMs,
            message: `HTTP ${response.status}`,
          };
        }

        return {
          ok: true,
          latencyMs,
        };
      } catch (error) {
        console.error("Site self latency check failed:", error);
        return {
          ok: false,
          latencyMs: null,
          message: "访问失败",
        };
      }
    };

    const [
      flushResult,
      siteSelfLatencyResult,
      dbSizeResult,
      dbLatencyResult,
      dbConnectionResult,
      redisLatencyResult,
      redisMemoryResult,
      redisKeyCountResult,
    ] = await Promise.all([
      measure(flushEventsToDatabase),
      measure(getSiteSelfLatency),
      measure(getDBSize),
      measure(getDBLatency),
      measure(getDBConnectionCount),
      measure(getRedisLatency),
      measure(getRedisMemory),
      measure(getRedisKeyCount),
    ]);

    const snapshot: HealthCheckSnapshot = {
      checks: {},
    };

    snapshot.checks.ANALYTICS_FLUSH_SUCCESS_COUNT = {
      v: flushResult.value.success ? flushResult.value.flushedCount : null,
      d: flushResult.durationMs,
      s: flushResult.value.success ? "O" : "E",
    };

    if (
      siteSelfLatencyResult.value.ok &&
      siteSelfLatencyResult.value.latencyMs !== null
    ) {
      snapshot.checks.SITE_SELF_LATENCY = {
        v: siteSelfLatencyResult.value.latencyMs,
        d: siteSelfLatencyResult.durationMs,
        s: classifyByThreshold(
          siteSelfLatencyResult.value.latencyMs,
          500,
          1500,
        ),
      };
    } else {
      snapshot.checks.SITE_SELF_LATENCY = {
        v: siteSelfLatencyResult.value.message || "检查失败",
        d: siteSelfLatencyResult.durationMs,
        s: "E",
      };
    }

    snapshot.checks.DB_LATENCY = {
      v: dbLatencyResult.value,
      d: dbLatencyResult.durationMs,
      s: classifyByThreshold(dbLatencyResult.value, 100, 300),
    };

    snapshot.checks.DB_CONNECTIONS = {
      v: dbConnectionResult.value,
      d: dbConnectionResult.durationMs,
      s: classifyByThreshold(dbConnectionResult.value, 50, 150),
    };

    snapshot.checks.DB_SIZE = {
      v: dbSizeResult.value,
      d: dbSizeResult.durationMs,
      s: "O",
    };

    if (redisLatencyResult.value === -1) {
      snapshot.checks.REDIS_CONNECTION = {
        v: false,
        d: redisLatencyResult.durationMs,
        s: "E",
      };
    } else {
      snapshot.checks.REDIS_LATENCY = {
        v: redisLatencyResult.value,
        d: redisLatencyResult.durationMs,
        s: classifyByThreshold(redisLatencyResult.value, 10, 50),
      };

      if (redisMemoryResult.value.used !== -1) {
        snapshot.checks.REDIS_MEMORY = {
          v: redisMemoryResult.value.used,
          d: redisMemoryResult.durationMs,
          s: classifyByThreshold(
            redisMemoryResult.value.used,
            100 * 1024 * 1024,
            500 * 1024 * 1024,
          ),
        };

        if (redisMemoryResult.value.fragmentation > 0) {
          snapshot.checks.REDIS_FRAGMENTATION = {
            v: redisMemoryResult.value.fragmentation,
            d: redisMemoryResult.durationMs,
            s: classifyByThreshold(
              redisMemoryResult.value.fragmentation,
              1.5,
              2.0,
            ),
          };
        }
      }

      if (redisKeyCountResult.value.total !== -1) {
        snapshot.checks.REDIS_KEYS = {
          v: redisKeyCountResult.value.total,
          d: redisKeyCountResult.durationMs,
          s: "O",
        };
      }
    }

    const counts = buildCounts(snapshot.checks);
    const status = getOverallStatus(counts);
    const durationMs = Date.now() - startedAtMs;
    const checks = buildCheckDetails(snapshot.checks);
    const issues = buildIssues(checks);

    const healthCheck = await prisma.healthCheck.create({
      data: {
        startedAt,
        durationMs,
        triggerType: persistTriggerType,
        overallStatus: status,
        okCount: counts.okCount,
        warningCount: counts.warningCount,
        errorCount: counts.errorCount,
        snapshot,
      },
      select: {
        startedAt: true,
        createdAt: true,
        durationMs: true,
        triggerType: true,
        overallStatus: true,
        okCount: true,
        warningCount: true,
        errorCount: true,
      },
    });

    return response.ok({
      data: {
        createdAt: healthCheck.createdAt.toISOString(),
        startedAt: healthCheck.startedAt.toISOString(),
        durationMs: healthCheck.durationMs,
        triggerType: healthCheck.triggerType,
        status: healthCheck.overallStatus,
        okCount: healthCheck.okCount,
        warningCount: healthCheck.warningCount,
        errorCount: healthCheck.errorCount,
        issues,
      },
    });
  } catch (error) {
    console.error("Doctor error:", error);
    return response.serverError();
  }
}

export async function getDoctorHistory(
  params: GetDoctorHistory,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<DoctorHistoryItem[] | null>>>;
export async function getDoctorHistory(
  params: GetDoctorHistory,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<DoctorHistoryItem[] | null>>;
export async function getDoctorHistory(
  {
    access_token,
    page = 1,
    pageSize = 10,
    sortBy,
    sortOrder,
    id,
    status,
    triggerType,
    okCount,
    errorCount,
    warningCount,
    createdAtStart,
    createdAtEnd,
  }: GetDoctorHistory,
  serverConfig?: ActionConfig,
): Promise<ActionResult<DoctorHistoryItem[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getDoctorHistory"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      page,
      pageSize,
      sortBy,
      sortOrder,
      id,
      status,
      triggerType,
      okCount,
      errorCount,
      warningCount,
      createdAtStart,
      createdAtEnd,
    },
    GetDoctorHistorySchema,
  );
  if (validationError) return response.badRequest(validationError);

  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: access_token,
  });
  if (!user) {
    return response.unauthorized();
  }

  try {
    const skip = (page - 1) * pageSize;

    const where: {
      id?: number;
      overallStatus?: "OK" | "WARNING" | "ERROR";
      triggerType?: "MANUAL" | "AUTO" | "CRON";
      okCount?: number;
      errorCount?: number;
      warningCount?: number;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};

    if (id !== undefined) where.id = id;
    if (status) where.overallStatus = status;
    if (triggerType) where.triggerType = triggerType;
    if (okCount !== undefined) where.okCount = okCount;
    if (errorCount !== undefined) where.errorCount = errorCount;
    if (warningCount !== undefined) where.warningCount = warningCount;

    if (createdAtStart || createdAtEnd) {
      where.createdAt = {};
      if (createdAtStart) where.createdAt.gte = new Date(createdAtStart);
      if (createdAtEnd) where.createdAt.lte = new Date(createdAtEnd);
    }

    let orderBy:
      | { id: "asc" | "desc" }
      | { createdAt: "asc" | "desc" }
      | { overallStatus: "asc" | "desc" }
      | { okCount: "asc" | "desc" }
      | { warningCount: "asc" | "desc" }
      | { errorCount: "asc" | "desc" }
      | { triggerType: "asc" | "desc" }
      | { durationMs: "asc" | "desc" } = {
      createdAt: "desc",
    };

    if (sortBy && sortOrder) {
      switch (sortBy) {
        case "id":
          orderBy = { id: sortOrder };
          break;
        case "createdAt":
          orderBy = { createdAt: sortOrder };
          break;
        case "status":
          orderBy = { overallStatus: sortOrder };
          break;
        case "okCount":
          orderBy = { okCount: sortOrder };
          break;
        case "warningCount":
          orderBy = { warningCount: sortOrder };
          break;
        case "errorCount":
          orderBy = { errorCount: sortOrder };
          break;
        case "triggerType":
          orderBy = { triggerType: sortOrder };
          break;
        case "durationMs":
          orderBy = { durationMs: sortOrder };
          break;
      }
    }

    const [total, records] = await Promise.all([
      prisma.healthCheck.count({ where }),
      prisma.healthCheck.findMany({
        skip,
        take: pageSize,
        where,
        orderBy,
        select: {
          id: true,
          startedAt: true,
          createdAt: true,
          durationMs: true,
          triggerType: true,
          overallStatus: true,
          okCount: true,
          warningCount: true,
          errorCount: true,
          snapshot: true,
        },
      }),
    ]);

    const data: DoctorHistoryItem[] = records.map((record) => {
      const snapshot = parseSnapshot(record.snapshot);
      const checks = buildCheckDetails(snapshot.checks);
      const issues = buildIssues(checks);
      return {
        id: record.id,
        brief: buildDoctorBriefFromIssues(issues),
        status: record.overallStatus,
        triggerType: record.triggerType,
        durationMs: record.durationMs,
        startedAt: record.startedAt.toISOString(),
        createdAt: record.createdAt.toISOString(),
        okCount: record.okCount,
        warningCount: record.warningCount,
        errorCount: record.errorCount,
        checks,
      };
    });

    const totalPages = Math.ceil(total / pageSize);
    const meta = {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: totalPages > 0 && page < totalPages,
      hasPrev: totalPages > 0 && page > 1,
    };

    return response.ok({ data, meta });
  } catch (error) {
    console.error("Get doctor history error:", error);
    return response.serverError();
  }
}

export async function getDoctorTrends(
  params: GetDoctorTrends,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<DoctorTrendItem[] | null>>>;
export async function getDoctorTrends(
  params: GetDoctorTrends,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<DoctorTrendItem[] | null>>;
export async function getDoctorTrends(
  { access_token, days = 30, count = 30 }: GetDoctorTrends,
  serverConfig?: ActionConfig,
): Promise<ActionResult<DoctorTrendItem[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getDoctorTrends"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      days,
      count,
    },
    GetDoctorTrendsSchema,
  );
  if (validationError) return response.badRequest(validationError);

  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: access_token,
  });
  if (!user) {
    return response.unauthorized();
  }

  try {
    const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [recentByTime, recentByCount] = await Promise.all([
      prisma.healthCheck.findMany({
        where: {
          createdAt: {
            gte: daysAgo,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          createdAt: true,
          okCount: true,
          warningCount: true,
          errorCount: true,
        },
      }),
      prisma.healthCheck.findMany({
        take: count,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          createdAt: true,
          okCount: true,
          warningCount: true,
          errorCount: true,
        },
      }),
    ]);

    const mergedMap = new Map<number, (typeof recentByTime)[0]>();
    recentByTime.forEach((record) => {
      mergedMap.set(record.id, record);
    });
    recentByCount.forEach((record) => {
      mergedMap.set(record.id, record);
    });

    const merged = Array.from(mergedMap.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    const data: DoctorTrendItem[] = merged.map((record) => ({
      time: record.createdAt.toISOString(),
      data: {
        info: record.okCount,
        warning: record.warningCount,
        error: record.errorCount,
      },
    }));

    return response.ok({ data });
  } catch (error) {
    console.error("Get doctor trends error:", error);
    return response.serverError();
  }
}

"use server";

import type {
  ApiResponse,
  ApiResponseData,
} from "@repo/shared-types/api/common";
import type {
  CronConfig,
  CronHistoryItem,
  CronRunStatus,
  CronSnapshot,
  CronTrendItem,
  GetCronConfig,
  GetCronHistory,
  GetCronTrends,
  TriggerCron,
  UpdateCronConfig,
} from "@repo/shared-types/api/cron";
import {
  GetCronConfigSchema,
  GetCronHistorySchema,
  GetCronTrendsSchema,
  TriggerCronSchema,
  UpdateCronConfigSchema,
} from "@repo/shared-types/api/cron";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import type { NextResponse } from "next/server";

import { doctor } from "@/actions/doctor";
import { checkFriendLinks } from "@/actions/friendlink";
import { syncProjectsGithub } from "@/actions/project";
import { authVerify } from "@/lib/server/auth-verify";
import { getConfigs } from "@/lib/server/config-cache";
import prisma from "@/lib/server/prisma";
import limitControl from "@/lib/server/rate-limit";
import ResponseBuilder from "@/lib/server/response";
import { validateData } from "@/lib/server/validator";

import type { Prisma } from ".prisma/client";

type ActionEnvironment = "serverless" | "serveraction";
type ActionConfig = { environment?: ActionEnvironment };
type ActionResult<T extends ApiResponseData> =
  | NextResponse<ApiResponse<T>>
  | ApiResponse<T>;

type CronTaskKey = "doctor" | "projects" | "friends";
type CronTaskStatus = "O" | "E" | "S";
type CronTaskSnapshot = CronSnapshot["tasks"][CronTaskKey];

type CronHistoryRecord = {
  id: number;
  startedAt: Date;
  createdAt: Date;
  durationMs: number;
  triggerType: "MANUAL" | "CLOUD" | "AUTO";
  status: CronRunStatus;
  totalCount: number;
  enabledCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  snapshot: unknown;
};

const CRON_CONFIG_KEYS = [
  "cron.enable",
  "cron.task.doctor.enable",
  "cron.task.projects.enable",
  "cron.task.friends.enable",
] as const;

const CRON_TASK_KEYS: CronTaskKey[] = ["doctor", "projects", "friends"];

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return fallback;
}

function getCronStatus(
  enabledCount: number,
  successCount: number,
  failedCount: number,
): CronRunStatus {
  if (enabledCount === 0) return "OK";
  if (failedCount === 0) return "OK";
  if (successCount === 0) return "ERROR";
  return "PARTIAL";
}

function createSkippedTaskSnapshot(reason: string): CronTaskSnapshot {
  return {
    e: false,
    x: false,
    s: "S",
    d: 0,
    v: null,
    m: reason,
  };
}

function normalizeTaskStatus(value: unknown): CronTaskStatus {
  if (value === "O" || value === "E" || value === "S") {
    return value;
  }
  return "S";
}

function normalizeTaskSnapshot(
  task: unknown,
  fallback: CronTaskSnapshot,
): CronTaskSnapshot {
  if (!task || typeof task !== "object" || Array.isArray(task)) {
    return fallback;
  }

  const taskObj = task as Record<string, unknown>;
  const durationMsRaw = taskObj.d;
  const durationMs =
    typeof durationMsRaw === "number" &&
    Number.isFinite(durationMsRaw) &&
    durationMsRaw >= 0
      ? Math.round(durationMsRaw)
      : 0;

  return {
    e: typeof taskObj.e === "boolean" ? taskObj.e : fallback.e,
    x: typeof taskObj.x === "boolean" ? taskObj.x : fallback.x,
    s: normalizeTaskStatus(taskObj.s),
    d: durationMs,
    v: taskObj.v ?? null,
    m:
      typeof taskObj.m === "string"
        ? taskObj.m
        : taskObj.m === null
          ? null
          : fallback.m,
    ...(typeof taskObj.b === "string" ? { b: taskObj.b } : {}),
    ...(typeof taskObj.f === "string" ? { f: taskObj.f } : {}),
  };
}

function normalizeCronSnapshot(snapshot: unknown): CronSnapshot {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return {
      version: 1,
      tasks: {
        doctor: createSkippedTaskSnapshot("invalid snapshot"),
        projects: createSkippedTaskSnapshot("invalid snapshot"),
        friends: createSkippedTaskSnapshot("invalid snapshot"),
      },
    };
  }

  const snapshotObj = snapshot as {
    version?: unknown;
    tasks?: unknown;
  };
  const rawTasks =
    snapshotObj.tasks && typeof snapshotObj.tasks === "object"
      ? (snapshotObj.tasks as Record<string, unknown>)
      : {};

  const doctorFallback = createSkippedTaskSnapshot("doctor task not found");
  const projectsFallback = createSkippedTaskSnapshot("projects task not found");
  const friendsFallback = createSkippedTaskSnapshot("friends task not found");

  return {
    version:
      typeof snapshotObj.version === "number" &&
      Number.isFinite(snapshotObj.version) &&
      snapshotObj.version > 0
        ? Math.round(snapshotObj.version)
        : 1,
    tasks: {
      doctor: normalizeTaskSnapshot(rawTasks.doctor, doctorFallback),
      projects: normalizeTaskSnapshot(rawTasks.projects, projectsFallback),
      friends: normalizeTaskSnapshot(rawTasks.friends, friendsFallback),
    },
  };
}

function toCronHistoryItem(record: CronHistoryRecord): CronHistoryItem {
  return {
    id: record.id,
    startedAt: record.startedAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    durationMs: record.durationMs,
    triggerType: record.triggerType,
    status: record.status,
    totalCount: record.totalCount,
    enabledCount: record.enabledCount,
    successCount: record.successCount,
    failedCount: record.failedCount,
    skippedCount: record.skippedCount,
    snapshot: normalizeCronSnapshot(record.snapshot),
  };
}

async function loadCronConfigState(): Promise<CronConfig> {
  const [cronEnabled, doctorEnabled, projectsEnabled, friendsEnabled] =
    await getConfigs([...CRON_CONFIG_KEYS]);

  const records = await prisma.config.findMany({
    where: {
      key: {
        in: [...CRON_CONFIG_KEYS],
      },
    },
    select: {
      updatedAt: true,
    },
  });

  const updatedAt =
    records.length > 0
      ? records
          .reduce(
            (latest, current) =>
              current.updatedAt.getTime() > latest.getTime()
                ? current.updatedAt
                : latest,
            records[0]!.updatedAt,
          )
          .toISOString()
      : new Date().toISOString();

  return {
    enabled: Boolean(cronEnabled),
    tasks: {
      doctor: Boolean(doctorEnabled),
      projects: Boolean(projectsEnabled),
      friends: Boolean(friendsEnabled),
    },
    updatedAt,
  };
}

async function executeDoctorTask(): Promise<CronTaskSnapshot> {
  const startedAt = new Date();
  const startedAtMs = Date.now();
  try {
    const result = await doctor({ force: true });
    const endedAt = new Date();
    const durationMs = Date.now() - startedAtMs;

    if (!result.success || !result.data) {
      return {
        e: true,
        x: true,
        s: "E",
        d: durationMs,
        v: null,
        m: result.message || "doctor 执行失败",
        b: startedAt.toISOString(),
        f: endedAt.toISOString(),
      };
    }

    return {
      e: true,
      x: true,
      s: "O",
      d: durationMs,
      v: {
        status: result.data.status,
        okCount: result.data.okCount,
        warningCount: result.data.warningCount,
        errorCount: result.data.errorCount,
      },
      m: null,
      b: startedAt.toISOString(),
      f: endedAt.toISOString(),
    };
  } catch (error) {
    return {
      e: true,
      x: true,
      s: "E",
      d: Date.now() - startedAtMs,
      v: null,
      m: toErrorMessage(error, "doctor 执行失败"),
      b: startedAt.toISOString(),
      f: new Date().toISOString(),
    };
  }
}

async function executeProjectsTask(): Promise<CronTaskSnapshot> {
  const startedAt = new Date();
  const startedAtMs = Date.now();
  try {
    const result = await syncProjectsGithub({});
    const endedAt = new Date();
    const durationMs = Date.now() - startedAtMs;

    if (!result.success || !result.data) {
      return {
        e: true,
        x: true,
        s: "E",
        d: durationMs,
        v: null,
        m: result.message || "projects 执行失败",
        b: startedAt.toISOString(),
        f: endedAt.toISOString(),
      };
    }

    return {
      e: true,
      x: true,
      s: "O",
      d: durationMs,
      v: {
        synced: result.data.synced,
        failed: result.data.failed,
      },
      m: null,
      b: startedAt.toISOString(),
      f: endedAt.toISOString(),
    };
  } catch (error) {
    return {
      e: true,
      x: true,
      s: "E",
      d: Date.now() - startedAtMs,
      v: null,
      m: toErrorMessage(error, "projects 执行失败"),
      b: startedAt.toISOString(),
      f: new Date().toISOString(),
    };
  }
}

async function executeFriendsTask(): Promise<CronTaskSnapshot> {
  const startedAt = new Date();
  const startedAtMs = Date.now();
  try {
    const result = await checkFriendLinks({ checkAll: true });
    const endedAt = new Date();
    const durationMs = Date.now() - startedAtMs;

    if (!result.success || !result.data) {
      return {
        e: true,
        x: true,
        s: "E",
        d: durationMs,
        v: null,
        m: result.message || "friends 执行失败",
        b: startedAt.toISOString(),
        f: endedAt.toISOString(),
      };
    }

    return {
      e: true,
      x: true,
      s: "O",
      d: durationMs,
      v: {
        total: result.data.total,
        checked: result.data.checked,
        skipped: result.data.skipped,
        failed: result.data.failed,
        statusChanged: result.data.statusChanged,
      },
      m: null,
      b: startedAt.toISOString(),
      f: endedAt.toISOString(),
    };
  } catch (error) {
    return {
      e: true,
      x: true,
      s: "E",
      d: Date.now() - startedAtMs,
      v: null,
      m: toErrorMessage(error, "friends 执行失败"),
      b: startedAt.toISOString(),
      f: new Date().toISOString(),
    };
  }
}

export async function triggerCron(
  params: TriggerCron,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<CronHistoryItem | null>>>;
export async function triggerCron(
  params: TriggerCron,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<CronHistoryItem | null>>;
export async function triggerCron(
  { access_token, triggerType = "MANUAL" }: TriggerCron,
  serverConfig?: ActionConfig,
): Promise<ActionResult<CronHistoryItem | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "triggerCron"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      triggerType,
    },
    TriggerCronSchema,
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
    const config = await loadCronConfigState();
    const startedAt = new Date();
    const startedAtMs = Date.now();

    const taskSnapshots: Record<CronTaskKey, CronTaskSnapshot> = {
      doctor: createSkippedTaskSnapshot("task disabled"),
      projects: createSkippedTaskSnapshot("task disabled"),
      friends: createSkippedTaskSnapshot("task disabled"),
    };

    const taskEnabled: Record<CronTaskKey, boolean> = {
      doctor: config.enabled && config.tasks.doctor,
      projects: config.enabled && config.tasks.projects,
      friends: config.enabled && config.tasks.friends,
    };

    if (!config.enabled) {
      taskSnapshots.doctor = createSkippedTaskSnapshot("cron disabled");
      taskSnapshots.projects = createSkippedTaskSnapshot("cron disabled");
      taskSnapshots.friends = createSkippedTaskSnapshot("cron disabled");
    } else {
      const runners: Array<Promise<void>> = [];

      for (const key of CRON_TASK_KEYS) {
        if (!taskEnabled[key]) {
          taskSnapshots[key] = createSkippedTaskSnapshot("task disabled");
          continue;
        }

        if (key === "doctor") {
          runners.push(
            (async () => {
              taskSnapshots.doctor = await executeDoctorTask();
            })(),
          );
        } else if (key === "projects") {
          runners.push(
            (async () => {
              taskSnapshots.projects = await executeProjectsTask();
            })(),
          );
        } else {
          runners.push(
            (async () => {
              taskSnapshots.friends = await executeFriendsTask();
            })(),
          );
        }
      }

      await Promise.all(runners);
    }

    const totalCount = CRON_TASK_KEYS.length;
    const enabledCount = CRON_TASK_KEYS.filter(
      (key) => taskEnabled[key],
    ).length;
    const successCount = CRON_TASK_KEYS.filter(
      (key) => taskSnapshots[key].x && taskSnapshots[key].s === "O",
    ).length;
    const failedCount = CRON_TASK_KEYS.filter(
      (key) => taskSnapshots[key].x && taskSnapshots[key].s === "E",
    ).length;
    const skippedCount = CRON_TASK_KEYS.filter(
      (key) => taskSnapshots[key].s === "S",
    ).length;

    const status = getCronStatus(enabledCount, successCount, failedCount);
    const durationMs = Date.now() - startedAtMs;

    const snapshot: CronSnapshot = {
      version: 1,
      tasks: taskSnapshots,
    };

    const record = await prisma.cronHistory.create({
      data: {
        startedAt,
        durationMs,
        triggerType,
        status,
        totalCount,
        enabledCount,
        successCount,
        failedCount,
        skippedCount,
        snapshot: snapshot as unknown as Prisma.InputJsonValue,
      },
      select: {
        id: true,
        startedAt: true,
        createdAt: true,
        durationMs: true,
        triggerType: true,
        status: true,
        totalCount: true,
        enabledCount: true,
        successCount: true,
        failedCount: true,
        skippedCount: true,
        snapshot: true,
      },
    });

    return response.ok({
      data: toCronHistoryItem(record),
    });
  } catch (error) {
    console.error("Trigger cron error:", error);
    return response.serverError();
  }
}

export async function getCronHistory(
  params: GetCronHistory,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<CronHistoryItem[] | null>>>;
export async function getCronHistory(
  params: GetCronHistory,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<CronHistoryItem[] | null>>;
export async function getCronHistory(
  {
    access_token,
    page = 1,
    pageSize = 25,
    sortBy,
    sortOrder,
    id,
    status,
    triggerType,
    createdAtStart,
    createdAtEnd,
  }: GetCronHistory,
  serverConfig?: ActionConfig,
): Promise<ActionResult<CronHistoryItem[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getCronHistory"))) {
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
      createdAtStart,
      createdAtEnd,
    },
    GetCronHistorySchema,
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
      status?: CronRunStatus;
      triggerType?: "MANUAL" | "CLOUD" | "AUTO";
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};

    if (id !== undefined) where.id = id;
    if (status) where.status = status;
    if (triggerType) where.triggerType = triggerType;
    if (createdAtStart || createdAtEnd) {
      where.createdAt = {};
      if (createdAtStart) {
        where.createdAt.gte = new Date(createdAtStart);
      }
      if (createdAtEnd) {
        where.createdAt.lte = new Date(createdAtEnd);
      }
    }

    let orderBy:
      | { id: "asc" | "desc" }
      | { createdAt: "asc" | "desc" }
      | { startedAt: "asc" | "desc" }
      | { status: "asc" | "desc" }
      | { triggerType: "asc" | "desc" }
      | { durationMs: "asc" | "desc" }
      | { enabledCount: "asc" | "desc" }
      | { successCount: "asc" | "desc" }
      | { failedCount: "asc" | "desc" }
      | { skippedCount: "asc" | "desc" } = { createdAt: "desc" };

    if (sortBy && sortOrder) {
      switch (sortBy) {
        case "id":
          orderBy = { id: sortOrder };
          break;
        case "createdAt":
          orderBy = { createdAt: sortOrder };
          break;
        case "startedAt":
          orderBy = { startedAt: sortOrder };
          break;
        case "status":
          orderBy = { status: sortOrder };
          break;
        case "triggerType":
          orderBy = { triggerType: sortOrder };
          break;
        case "durationMs":
          orderBy = { durationMs: sortOrder };
          break;
        case "enabledCount":
          orderBy = { enabledCount: sortOrder };
          break;
        case "successCount":
          orderBy = { successCount: sortOrder };
          break;
        case "failedCount":
          orderBy = { failedCount: sortOrder };
          break;
        case "skippedCount":
          orderBy = { skippedCount: sortOrder };
          break;
      }
    }

    const [total, records] = await Promise.all([
      prisma.cronHistory.count({ where }),
      prisma.cronHistory.findMany({
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
          status: true,
          totalCount: true,
          enabledCount: true,
          successCount: true,
          failedCount: true,
          skippedCount: true,
          snapshot: true,
        },
      }),
    ]);

    const data = records.map((record) => toCronHistoryItem(record));
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
    console.error("Get cron history error:", error);
    return response.serverError();
  }
}

export async function getCronTrends(
  params: GetCronTrends,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<CronTrendItem[] | null>>>;
export async function getCronTrends(
  params: GetCronTrends,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<CronTrendItem[] | null>>;
export async function getCronTrends(
  { access_token, days = 30, count = 30 }: GetCronTrends,
  serverConfig?: ActionConfig,
): Promise<ActionResult<CronTrendItem[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getCronTrends"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      days,
      count,
    },
    GetCronTrendsSchema,
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
      prisma.cronHistory.findMany({
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
          durationMs: true,
          successCount: true,
          failedCount: true,
          skippedCount: true,
          snapshot: true,
        },
      }),
      prisma.cronHistory.findMany({
        take: count,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          createdAt: true,
          durationMs: true,
          successCount: true,
          failedCount: true,
          skippedCount: true,
          snapshot: true,
        },
      }),
    ]);

    const mergedMap = new Map<number, (typeof recentByTime)[0]>();
    for (const record of recentByTime) {
      mergedMap.set(record.id, record);
    }
    for (const record of recentByCount) {
      mergedMap.set(record.id, record);
    }

    const merged = Array.from(mergedMap.values()).sort(
      (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
    );

    const data: CronTrendItem[] = merged.map((record) => {
      const snapshot = normalizeCronSnapshot(record.snapshot);
      return {
        time: record.createdAt.toISOString(),
        data: {
          totalDurationMs: record.durationMs,
          doctorDurationMs: snapshot.tasks.doctor.d,
          projectsDurationMs: snapshot.tasks.projects.d,
          friendsDurationMs: snapshot.tasks.friends.d,
          successCount: record.successCount,
          failedCount: record.failedCount,
          skippedCount: record.skippedCount,
        },
      };
    });

    return response.ok({ data });
  } catch (error) {
    console.error("Get cron trends error:", error);
    return response.serverError();
  }
}

export async function getCronConfig(
  params: GetCronConfig,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<CronConfig | null>>>;
export async function getCronConfig(
  params: GetCronConfig,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<CronConfig | null>>;
export async function getCronConfig(
  { access_token }: GetCronConfig,
  serverConfig?: ActionConfig,
): Promise<ActionResult<CronConfig | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getCronConfig"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
    },
    GetCronConfigSchema,
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
    const data = await loadCronConfigState();
    return response.ok({ data });
  } catch (error) {
    console.error("Get cron config error:", error);
    return response.serverError();
  }
}

export async function updateCronConfig(
  params: UpdateCronConfig,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<CronConfig | null>>>;
export async function updateCronConfig(
  params: UpdateCronConfig,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<CronConfig | null>>;
export async function updateCronConfig(
  { access_token, enabled, doctor, projects, friends }: UpdateCronConfig,
  serverConfig?: ActionConfig,
): Promise<ActionResult<CronConfig | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "updateCronConfig"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      enabled,
      doctor,
      projects,
      friends,
    },
    UpdateCronConfigSchema,
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
    const updates: Array<{
      key: (typeof CRON_CONFIG_KEYS)[number];
      value: boolean;
    }> = [];

    if (enabled !== undefined) {
      updates.push({ key: "cron.enable", value: enabled });
    }
    if (doctor !== undefined) {
      updates.push({ key: "cron.task.doctor.enable", value: doctor });
    }
    if (projects !== undefined) {
      updates.push({ key: "cron.task.projects.enable", value: projects });
    }
    if (friends !== undefined) {
      updates.push({ key: "cron.task.friends.enable", value: friends });
    }

    if (updates.length === 0) {
      return response.badRequest({
        message: "必须提供至少一个配置项",
      });
    }

    await prisma.$transaction(async (tx) => {
      for (const updateItem of updates) {
        await tx.config.upsert({
          where: {
            key: updateItem.key,
          },
          update: {
            value: {
              default: updateItem.value,
            },
          },
          create: {
            key: updateItem.key,
            value: {
              default: updateItem.value,
            },
          },
        });
      }
    });

    updateTag("config");
    updateTag("menus");
    for (const updateItem of updates) {
      updateTag(`config/${updateItem.key}`);
    }

    const data = await loadCronConfigState();
    return response.ok({
      message: "计划任务配置已更新",
      data,
    });
  } catch (error) {
    console.error("Update cron config error:", error);
    return response.serverError();
  }
}

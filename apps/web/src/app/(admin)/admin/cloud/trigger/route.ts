import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { triggerCron } from "@/actions/cron";
import {
  type CloudTelemetry,
  collectCloudTelemetry,
} from "@/lib/server/cloud-telemetry";
import {
  verifyCloudTriggerToken,
  type VerifySource,
} from "@/lib/server/cloud-trigger-verify";
import { getConfigs } from "@/lib/server/config-cache";
import { jwtTokenSign } from "@/lib/server/jwt";
import prisma from "@/lib/server/prisma";

import type { Prisma } from ".prisma/client";

const CloudTriggerRequestSchema = z.object({
  deliveryId: z.string().min(1),
  siteId: z.string().uuid(),
  triggerType: z.literal("CLOUD").optional().default("CLOUD"),
  requestedAt: z.string().optional(),
});

const CLOUD_TRIGGER_TIMEOUT_MS = 25000;

type TelemetryBuildInput = {
  accepted: boolean;
  dedupHit: boolean;
  verifySource: VerifySource;
  dnssecAd: boolean | null;
  verifyMs: number;
  tokenAgeMs: number | null;
};

function toIsoDateOrNull(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function parseBearerToken(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("Bearer ")) return null;
  const token = value.slice(7).trim();
  return token.length > 0 ? token : null;
}

function createInternalCronAccessToken(): string {
  return jwtTokenSign({
    inner: {
      uid: 0,
      username: "cloud_trigger_system",
      nickname: "cloud-trigger",
      role: "ADMIN",
    },
    expired: "60s",
  });
}

function createFallbackTelemetry(input: TelemetryBuildInput): CloudTelemetry {
  const nowIso = new Date().toISOString();
  return {
    schemaVer: "np-cloud-telemetry-v1",
    collectedAt: nowIso,
    accepted: input.accepted,
    dedupHit: input.dedupHit,
    protocolVerification: {
      accepted: input.accepted,
      dedupHit: input.dedupHit,
      verifySource: input.verifySource,
      dnssecAd: input.dnssecAd,
      verifyMs: input.verifyMs,
      tokenAgeMs: input.tokenAgeMs,
    },
    configSnapshot: {
      cronEnabled: false,
      doctorEnabled: false,
      projectsEnabled: false,
      friendsEnabled: false,
    },
    latestCronSummary: {
      latestRunId: null,
      latestCreatedAt: null,
      latestStatus: null,
      latestDurationMs: null,
      enabledCount: null,
      successCount: null,
      failedCount: null,
      skippedCount: null,
    },
    taskDurations: {
      doctorDurationMs: null,
      projectsDurationMs: null,
      friendsDurationMs: null,
    },
    runtimeHealth: {
      healthRecordId: null,
      healthCreatedAt: null,
      healthStatus: null,
      healthOkCount: null,
      healthWarningCount: null,
      healthErrorCount: null,
      dbLatencyMs: null,
      redisLatencyMs: null,
      siteSelfLatencyMs: null,
    },
    versionInfo: {
      appVersion: null,
      runtimeNodeVersion: process.version,
      buildId: null,
      commit: null,
    },
  };
}

async function buildTelemetry(
  input: TelemetryBuildInput,
): Promise<CloudTelemetry> {
  try {
    return await collectCloudTelemetry(input);
  } catch (error) {
    console.error("[cloud-trigger] 采集遥测失败:", error);
    return createFallbackTelemetry(input);
  }
}

function getRemainingTimeoutMs(requestedAt: string | undefined): number {
  const requestedDate = toIsoDateOrNull(requestedAt);
  if (!requestedDate) {
    return CLOUD_TRIGGER_TIMEOUT_MS;
  }

  const elapsedMs = Date.now() - requestedDate.getTime();
  const remainingMs = CLOUD_TRIGGER_TIMEOUT_MS - elapsedMs;
  return Math.max(0, Math.min(CLOUD_TRIGGER_TIMEOUT_MS, remainingMs));
}

function toJsonResponse(
  status: number,
  payload: {
    ok: boolean;
    accepted: boolean;
    dedupHit: boolean;
    message: string;
    data: CloudTelemetry;
  },
): NextResponse {
  return NextResponse.json(payload, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json",
    },
  });
}

async function persistRejectedAttempt(input: {
  deliveryId: string;
  requestedAt: string | undefined;
  verifySource: VerifySource;
  message: string;
}): Promise<void> {
  const requestedAt = toIsoDateOrNull(input.requestedAt);

  try {
    await prisma.cloudTriggerHistory.upsert({
      where: {
        deliveryId: input.deliveryId,
      },
      update: {
        verifyOk: false,
        verifySource: input.verifySource === "NONE" ? null : input.verifySource,
        accepted: false,
        dedupHit: false,
        status: "REJECTED",
        message: input.message,
        requestedAt: requestedAt ?? undefined,
      },
      create: {
        deliveryId: input.deliveryId,
        requestedAt,
        triggerType: "CLOUD",
        verifyOk: false,
        verifySource: input.verifySource === "NONE" ? null : input.verifySource,
        accepted: false,
        dedupHit: false,
        status: "REJECTED",
        message: input.message,
      },
    });
  } catch (error) {
    console.error("[cloud-trigger] 写入拒绝日志失败:", error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const [cloudEnabled, cloudId, dohDomain, jwksUrl, issuer, audience] =
    await getConfigs([
      "cloud.enable",
      "cloud.id",
      "cloud.verify.dohDomain",
      "cloud.verify.jwksUrl",
      "cloud.verify.issuer",
      "cloud.verify.audience",
    ]);

  const authorization = request.headers.get("authorization");
  const token = parseBearerToken(authorization);
  if (!token) {
    const telemetry = await buildTelemetry({
      accepted: false,
      dedupHit: false,
      verifySource: "NONE",
      dnssecAd: null,
      verifyMs: 0,
      tokenAgeMs: null,
    });
    return toJsonResponse(401, {
      ok: false,
      accepted: false,
      dedupHit: false,
      message: "缺少或非法 Authorization",
      data: telemetry,
    });
  }

  if (!cloudEnabled) {
    const telemetry = await buildTelemetry({
      accepted: false,
      dedupHit: false,
      verifySource: "NONE",
      dnssecAd: null,
      verifyMs: 0,
      tokenAgeMs: null,
    });
    return toJsonResponse(503, {
      ok: false,
      accepted: false,
      dedupHit: false,
      message: "cloud.enable=false，云触发入口已关闭",
      data: telemetry,
    });
  }

  let bodyRaw: unknown;
  try {
    bodyRaw = await request.json();
  } catch {
    const telemetry = await buildTelemetry({
      accepted: false,
      dedupHit: false,
      verifySource: "NONE",
      dnssecAd: null,
      verifyMs: 0,
      tokenAgeMs: null,
    });
    return toJsonResponse(400, {
      ok: false,
      accepted: false,
      dedupHit: false,
      message: "请求体 JSON 无效",
      data: telemetry,
    });
  }

  const parsed = CloudTriggerRequestSchema.safeParse(bodyRaw);
  if (!parsed.success) {
    const telemetry = await buildTelemetry({
      accepted: false,
      dedupHit: false,
      verifySource: "NONE",
      dnssecAd: null,
      verifyMs: 0,
      tokenAgeMs: null,
    });
    return toJsonResponse(400, {
      ok: false,
      accepted: false,
      dedupHit: false,
      message: parsed.error.issues[0]?.message ?? "请求体格式错误",
      data: telemetry,
    });
  }

  const deliveryIdFromHeader = request.headers.get("x-np-delivery-id");
  if (
    deliveryIdFromHeader &&
    deliveryIdFromHeader.trim() !== parsed.data.deliveryId
  ) {
    const telemetry = await buildTelemetry({
      accepted: false,
      dedupHit: false,
      verifySource: "NONE",
      dnssecAd: null,
      verifyMs: 0,
      tokenAgeMs: null,
    });
    return toJsonResponse(400, {
      ok: false,
      accepted: false,
      dedupHit: false,
      message: "deliveryId 与请求头不一致",
      data: telemetry,
    });
  }

  if (!cloudId || parsed.data.siteId !== cloudId) {
    const telemetry = await buildTelemetry({
      accepted: false,
      dedupHit: false,
      verifySource: "NONE",
      dnssecAd: null,
      verifyMs: 0,
      tokenAgeMs: null,
    });
    return toJsonResponse(401, {
      ok: false,
      accepted: false,
      dedupHit: false,
      message: "siteId 不匹配",
      data: telemetry,
    });
  }

  const verification = await verifyCloudTriggerToken({
    token,
    expectedSiteId: cloudId,
    expectedDeliveryId: parsed.data.deliveryId,
    issuer,
    audience,
    dohDomain,
    jwksUrl,
  });

  if (!verification.ok) {
    await persistRejectedAttempt({
      deliveryId: parsed.data.deliveryId,
      requestedAt: parsed.data.requestedAt,
      verifySource: verification.source,
      message: verification.message || "签名验证失败",
    });

    const telemetry = await buildTelemetry({
      accepted: false,
      dedupHit: false,
      verifySource: verification.source,
      dnssecAd: verification.dnssecAd,
      verifyMs: verification.verifyMs,
      tokenAgeMs: verification.tokenAgeMs,
    });

    return toJsonResponse(401, {
      ok: false,
      accepted: false,
      dedupHit: false,
      message: verification.message || "签名验证失败",
      data: telemetry,
    });
  }

  const existed = await prisma.cloudTriggerHistory.findUnique({
    where: {
      deliveryId: parsed.data.deliveryId,
    },
    select: {
      id: true,
      status: true,
      dedupHit: true,
    },
  });

  if (existed) {
    await prisma.cloudTriggerHistory
      .update({
        where: {
          id: existed.id,
        },
        data: {
          dedupHit: true,
          verifyOk: true,
          verifySource: verification.source,
          accepted: true,
          message:
            existed.status === "REJECTED"
              ? "重复投递（此前已拒绝）"
              : "重复投递，已命中幂等",
        },
      })
      .catch(() => undefined);

    const telemetry = await buildTelemetry({
      accepted: true,
      dedupHit: true,
      verifySource: verification.source,
      dnssecAd: verification.dnssecAd,
      verifyMs: verification.verifyMs,
      tokenAgeMs: verification.tokenAgeMs,
    });

    return toJsonResponse(200, {
      ok: true,
      accepted: true,
      dedupHit: true,
      message: "deliveryId 已存在，已跳过重复执行",
      data: telemetry,
    });
  }

  const created = await prisma.cloudTriggerHistory.create({
    data: {
      deliveryId: parsed.data.deliveryId,
      requestedAt: toIsoDateOrNull(parsed.data.requestedAt),
      triggerType: "CLOUD",
      verifyOk: true,
      verifySource: verification.source,
      accepted: true,
      dedupHit: false,
      status: "RECEIVED",
      message: null,
    },
    select: {
      id: true,
    },
  });

  const telemetryInput: TelemetryBuildInput = {
    accepted: true,
    dedupHit: false,
    verifySource: verification.source,
    dnssecAd: verification.dnssecAd,
    verifyMs: verification.verifyMs,
    tokenAgeMs: verification.tokenAgeMs,
  };

  let latestTelemetry: CloudTelemetry | null = null;
  const telemetryPromise: Promise<CloudTelemetry> = (async () => {
    const telemetry = await buildTelemetry(telemetryInput);
    latestTelemetry = telemetry;
    await prisma.cloudTriggerHistory
      .update({
        where: { id: created.id },
        data: {
          telemetry: telemetry as unknown as Prisma.InputJsonValue,
        },
      })
      .catch(() => undefined);
    return telemetry;
  })();

  const cronPromise: Promise<{
    cronRecordId: number | null;
    success: boolean;
    message: string;
  }> = (async () => {
    try {
      const accessToken = createInternalCronAccessToken();
      const cronResponse = await triggerCron({
        access_token: accessToken,
        triggerType: "CLOUD",
      });
      const cronRecord = cronResponse.success ? cronResponse.data : null;
      const success = Boolean(cronRecord);
      const message = cronRecord
        ? `cron 执行完成，记录 #${cronRecord.id}`
        : cronResponse.message || "cron 执行失败";

      await prisma.cloudTriggerHistory
        .update({
          where: {
            id: created.id,
          },
          data: {
            status: success ? "DONE" : "ERROR",
            cronHistoryId: cronRecord?.id ?? null,
            message,
          },
        })
        .catch(() => undefined);

      return {
        cronRecordId: cronRecord?.id ?? null,
        success,
        message,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "cron 执行时发生未知错误";
      console.error("[cloud-trigger] 执行 cron 失败:", error);
      await prisma.cloudTriggerHistory
        .update({
          where: {
            id: created.id,
          },
          data: {
            status: "ERROR",
            message,
          },
        })
        .catch(() => undefined);

      return {
        cronRecordId: null,
        success: false,
        message,
      };
    }
  })();

  const completePromise = Promise.all([telemetryPromise, cronPromise]).then(
    ([telemetry, cron]) => ({
      type: "complete" as const,
      telemetry,
      cron,
    }),
  );

  const timeoutMs = getRemainingTimeoutMs(parsed.data.requestedAt);
  const timeoutPromise = new Promise<{ type: "timeout" }>((resolve) => {
    setTimeout(() => resolve({ type: "timeout" }), timeoutMs);
  });

  const raceResult = await Promise.race([completePromise, timeoutPromise]);

  if (raceResult.type === "complete") {
    return toJsonResponse(200, {
      ok: true,
      accepted: true,
      dedupHit: false,
      message: raceResult.cron.message,
      data: raceResult.telemetry,
    });
  }

  const timeoutTelemetry =
    latestTelemetry ?? createFallbackTelemetry(telemetryInput);

  await prisma.cloudTriggerHistory
    .updateMany({
      where: {
        id: created.id,
        status: "RECEIVED",
      },
      data: {
        message: `达到 ${CLOUD_TRIGGER_TIMEOUT_MS / 1000}s 返回窗口，已先返回遥测数据`,
      },
    })
    .catch(() => undefined);

  return toJsonResponse(200, {
    ok: true,
    accepted: true,
    dedupHit: false,
    message: `达到 ${CLOUD_TRIGGER_TIMEOUT_MS / 1000}s 返回窗口，已先返回遥测数据`,
    data: timeoutTelemetry,
  });
}

import { after, type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { triggerCronInternal } from "@/actions/cron";
import {
  type CloudTelemetry,
  collectCloudTelemetry,
} from "@/lib/server/cloud-telemetry";
import {
  verifyCloudTriggerToken,
  type VerifySource,
} from "@/lib/server/cloud-trigger-verify";
import { getConfigs } from "@/lib/server/config-cache";
import prisma from "@/lib/server/prisma";

import type { Prisma } from ".prisma/client";

const CloudTriggerRequestSchema = z.object({
  deliveryId: z.string().min(1),
  siteId: z.string().uuid(),
  triggerType: z.literal("CLOUD").optional().default("CLOUD"),
  requestedAt: z.string().optional(),
});

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

async function buildTelemetry(input: {
  accepted: boolean;
  dedupHit: boolean;
  verifySource: VerifySource;
  dnssecAd: boolean | null;
  verifyMs: number;
  tokenAgeMs: number | null;
}): Promise<CloudTelemetry> {
  try {
    return await collectCloudTelemetry(input);
  } catch (error) {
    console.error("[cloud-trigger] 采集遥测失败:", error);
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

  const telemetry = await buildTelemetry({
    accepted: true,
    dedupHit: false,
    verifySource: verification.source,
    dnssecAd: verification.dnssecAd,
    verifyMs: verification.verifyMs,
    tokenAgeMs: verification.tokenAgeMs,
  });

  await prisma.cloudTriggerHistory
    .update({
      where: { id: created.id },
      data: {
        telemetry: telemetry as unknown as Prisma.InputJsonValue,
      },
    })
    .catch(() => undefined);

  after(() => {
    void (async () => {
      try {
        const cronRecord = await triggerCronInternal("CLOUD");
        await prisma.cloudTriggerHistory.update({
          where: {
            id: created.id,
          },
          data: {
            status: cronRecord ? "DONE" : "ERROR",
            cronHistoryId: cronRecord?.id ?? null,
            message: cronRecord
              ? `已进入后台执行，cron 记录 #${cronRecord.id}`
              : "后台触发 cron 失败",
          },
        });
      } catch (error) {
        console.error("[cloud-trigger] 后台执行失败:", error);
        await prisma.cloudTriggerHistory
          .update({
            where: {
              id: created.id,
            },
            data: {
              status: "ERROR",
              message:
                error instanceof Error
                  ? error.message
                  : "后台触发 cron 时发生未知错误",
            },
          })
          .catch(() => undefined);
      }
    })();
  });

  return toJsonResponse(200, {
    ok: true,
    accepted: true,
    dedupHit: false,
    message: "请求已接收，cron 将在后台执行",
    data: telemetry,
  });
}

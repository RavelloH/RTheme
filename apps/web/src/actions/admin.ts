"use server";
import { NextResponse } from "next/server";
import {
  DoctorSchema,
  DoctorType,
  DoctorSuccessResponse,
} from "@repo/shared-types/api/admin";
import { ApiResponse, ApiResponseData } from "@repo/shared-types/api/common";
import ResponseBuilder from "@/lib/server/response";
import limitControl from "@/lib/server/rateLimit";
import { cookies, headers } from "next/headers";
import { validateData } from "@/lib/server/validator";
import prisma from "@/lib/server/prisma";
import redis, { ensureRedisConnection } from "@/lib/server/redis";
import { AccessTokenPayload, jwtTokenVerify } from "@/lib/server/jwt";

type HealthCheckIssue = {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  details?: string;
};

type ActionEnvironment = "serverless" | "serveraction";
type ActionConfig = { environment?: ActionEnvironment };
type ActionResult<T extends ApiResponseData> =
  | NextResponse<ApiResponse<T>>
  | ApiResponse<T>;

export async function doctor(
  params: DoctorType,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<DoctorSuccessResponse["data"]>>>;
export async function doctor(
  params: DoctorType,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<DoctorSuccessResponse["data"]>>;
export async function doctor(
  { access_token, force }: DoctorType,
  serverConfig?: ActionConfig,
): Promise<ActionResult<DoctorSuccessResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );
  if (!(await limitControl(await headers()))) {
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

  // 身份验证
  const cookieStore = await cookies();
  const token = access_token || cookieStore.get("ACCESS_TOKEN")?.value;
  if (!token) {
    return response.unauthorized();
  }
  const user = await jwtTokenVerify<AccessTokenPayload>(token);
  if (!user) {
    return response.unauthorized();
  }
  if (user.role == "USER") {
    return response.forbidden();
  }

  // 运行自检
  try {
    if (!force) {
      // 检查数据库中24小时内是否有自检记录
      const result = await prisma.healthCheck.findFirst({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
      if (result) {
        return response.ok({
          data: {
            createdAt: result.createdAt.toISOString(),
            issues: result.issues as HealthCheckIssue[],
          },
        });
      }
    }
    // 自检
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

    // Redis 检查
    const getRedisLatency = async (): Promise<number> => {
      try {
        await ensureRedisConnection();
        const start = Date.now();
        await redis.ping();
        return Date.now() - start;
      } catch (error) {
        console.error("Redis latency check failed:", error);
        return -1; // 返回 -1 表示检查失败
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
          const line = lines.find((l) => l.startsWith(key));
          if (!line) return 0;
          const parts = line.split(":");
          const value = parts[1];
          return value ? parseInt(value, 10) || 0 : 0;
        };

        const getFloatValue = (key: string): number => {
          const line = lines.find((l) => l.startsWith(key));
          if (!line) return 0;
          const parts = line.split(":");
          const value = parts[1];
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
      captcha: number;
      rateLimit: number;
      total: number;
    }> => {
      try {
        await ensureRedisConnection();
        const [captchaChallenges, captchaTokens, rateLimitKeys] =
          await Promise.all([
            redis.keys("captcha:challenge:*"),
            redis.keys("captcha:token:*"),
            redis.keys("rate_limit:*"),
          ]);

        return {
          captcha: captchaChallenges.length + captchaTokens.length,
          rateLimit: rateLimitKeys.length,
          total: await redis.dbsize(),
        };
      } catch (error) {
        console.error("Redis key count check failed:", error);
        return { captcha: -1, rateLimit: -1, total: -1 };
      }
    };

    // TODO: 更新检查
    // TODO: 检查需归档数据
    // TODO: 孤立文件
    // TODO: 长期草稿
    // TODO: 待审核内容积压
    const [
      dbSize,
      dbLatency,
      dbConnections,
      redisLatency,
      redisMemory,
      redisKeys,
    ] = await Promise.all([
      getDBSize(),
      getDBLatency(),
      getDBConnectionCount(),
      getRedisLatency(),
      getRedisMemory(),
      getRedisKeyCount(),
    ]);
    const issues: HealthCheckIssue[] = [];

    issues.push({
      code: "DB_LATENCY",
      message: "数据库响应时间",
      severity:
        dbLatency < 100 ? "info" : dbLatency < 300 ? "warning" : "error",
      details: `往返延迟 ${dbLatency}ms`,
    });

    issues.push({
      code: "DB_CONNECTIONS",
      message: "数据库连接数",
      severity:
        dbConnections < 50 ? "info" : dbConnections < 150 ? "warning" : "error",
      details: `连接数 ${dbConnections}`,
    });

    issues.push({
      code: "DB_SIZE",
      message: "数据库大小信息",
      severity: "info",
      details: `数据库大小 ${(dbSize / (1024 * 1024)).toFixed(2)} MB`,
    });

    // Redis 检查结果
    if (redisLatency === -1) {
      issues.push({
        code: "REDIS_CONNECTION",
        message: "Redis 连接失败",
        severity: "error",
        details: "无法连接到 Redis 服务器",
      });
    } else {
      issues.push({
        code: "REDIS_LATENCY",
        message: "Redis 响应时间",
        severity:
          redisLatency < 10 ? "info" : redisLatency < 50 ? "warning" : "error",
        details: `往返延迟 ${redisLatency}ms`,
      });
    }

    if (redisMemory.used !== -1) {
      const usedMB = (redisMemory.used / (1024 * 1024)).toFixed(2);
      const peakMB = (redisMemory.peak / (1024 * 1024)).toFixed(2);

      issues.push({
        code: "REDIS_MEMORY",
        message: "Redis 内存使用",
        severity:
          redisMemory.used < 100 * 1024 * 1024
            ? "info"
            : redisMemory.used < 500 * 1024 * 1024
              ? "warning"
              : "error",
        details: `当前使用 ${usedMB} MB，峰值 ${peakMB} MB`,
      });

      if (redisMemory.fragmentation > 0) {
        issues.push({
          code: "REDIS_FRAGMENTATION",
          message: "Redis 内存碎片率",
          severity:
            redisMemory.fragmentation < 1.5
              ? "info"
              : redisMemory.fragmentation < 2.0
                ? "warning"
                : "error",
          details: `碎片率 ${redisMemory.fragmentation.toFixed(2)}`,
        });
      }
    }

    if (redisKeys.total !== -1) {
      issues.push({
        code: "REDIS_KEYS",
        message: "Redis 键统计",
        severity: "info",
        details: `总键数 ${redisKeys.total}，验证码 ${redisKeys.captcha}，速率限制 ${redisKeys.rateLimit}`,
      });
    }

    // 保存检查结果到数据库
    const healthCheck = await prisma.healthCheck.create({
      data: {
        issues: issues,
      },
    });

    return response.ok({
      data: {
        createdAt: healthCheck.createdAt.toISOString(),
        issues,
      },
    });
  } catch (error) {
    console.error("Doctor error:", error);
    return response.serverError();
  }
}

"use server";
import { NextResponse } from "next/server";
import {
  DoctorSchema,
  Doctor,
  DoctorSuccessResponse,
  GetDoctorHistorySchema,
  GetDoctorHistory,
  DoctorHistoryItem,
  GetDoctorTrendsSchema,
  GetDoctorTrends,
  DoctorTrendItem,
} from "@repo/shared-types/api/doctor";
import { ApiResponse, ApiResponseData } from "@repo/shared-types/api/common";
import ResponseBuilder from "@/lib/server/response";
import limitControl from "@/lib/server/rateLimit";
import { headers } from "next/headers";
import { validateData } from "@/lib/server/validator";
import prisma from "@/lib/server/prisma";
import redis, { ensureRedisConnection } from "@/lib/server/redis";
import { authVerify } from "@/lib/server/auth-verify";

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
  params: Doctor,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<DoctorSuccessResponse["data"]>>>;
export async function doctor(
  params: Doctor,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<DoctorSuccessResponse["data"]>>;
export async function doctor(
  { access_token, force }: Doctor,
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
  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
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
      message: "DB响应时间",
      severity:
        dbLatency < 100 ? "info" : dbLatency < 300 ? "warning" : "error",
      details: `${dbLatency}ms`,
    });

    issues.push({
      code: "DB_CONNECTIONS",
      message: "DB连接数",
      severity:
        dbConnections < 50 ? "info" : dbConnections < 150 ? "warning" : "error",
      details: `${dbConnections}`,
    });

    issues.push({
      code: "DB_SIZE",
      message: "DB大小",
      severity: "info",
      details: `${(dbSize / (1024 * 1024)).toFixed(2)} MB`,
    });

    // Redis 检查结果
    if (redisLatency === -1) {
      issues.push({
        code: "REDIS_CONNECTION",
        message: "Redis连接失败",
        severity: "error",
        details: "连接失败",
      });
    } else {
      issues.push({
        code: "REDIS_LATENCY",
        message: "Redis响应时间",
        severity:
          redisLatency < 10 ? "info" : redisLatency < 50 ? "warning" : "error",
        details: `${redisLatency}ms`,
      });
    }

    if (redisMemory.used !== -1) {
      const usedMB = (redisMemory.used / (1024 * 1024)).toFixed(2);

      issues.push({
        code: "REDIS_MEMORY",
        message: "Redis内存",
        severity:
          redisMemory.used < 100 * 1024 * 1024
            ? "info"
            : redisMemory.used < 500 * 1024 * 1024
              ? "warning"
              : "error",
        details: `${usedMB} MB`,
      });

      if (redisMemory.fragmentation > 0) {
        issues.push({
          code: "REDIS_FRAGMENTATION",
          message: "Redis碎片率",
          severity:
            redisMemory.fragmentation < 1.5
              ? "info"
              : redisMemory.fragmentation < 2.0
                ? "warning"
                : "error",
          details: `${redisMemory.fragmentation.toFixed(2)}`,
        });
      }
    }

    if (redisKeys.total !== -1) {
      issues.push({
        code: "REDIS_KEYS",
        message: "Redis键数",
        severity: "info",
        details: `${redisKeys.total}`,
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
  }: GetDoctorHistory,
  serverConfig?: ActionConfig,
): Promise<ActionResult<DoctorHistoryItem[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      page,
      pageSize,
      sortBy,
      sortOrder,
    },
    GetDoctorHistorySchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 计算偏移量
    const skip = (page - 1) * pageSize;

    // 获取总数
    const total = await prisma.healthCheck.count();

    // 构建排序条件
    let orderBy: { id: "asc" | "desc" } | { createdAt: "asc" | "desc" } = {
      createdAt: "desc",
    }; // 默认排序

    if (sortBy && sortOrder) {
      if (sortBy === "id" || sortBy === "createdAt") {
        // 直接字段排序
        orderBy = { [sortBy]: sortOrder } as typeof orderBy;
      }
      // errorCount 和 warningCount 需要在内存中排序，因为它们是计算字段
    }

    // 获取分页数据
    let records = await prisma.healthCheck.findMany({
      skip: sortBy === "errorCount" || sortBy === "warningCount" ? 0 : skip,
      take:
        sortBy === "errorCount" || sortBy === "warningCount"
          ? undefined
          : pageSize,
      orderBy,
      select: {
        id: true,
        createdAt: true,
        issues: true,
      },
    });

    // 如果按 errorCount 或 warningCount 排序，需要在内存中处理
    if (sortBy === "errorCount" || sortBy === "warningCount") {
      const severityType = sortBy === "errorCount" ? "error" : "warning";

      records.sort((a, b) => {
        const aIssues = a.issues as HealthCheckIssue[];
        const bIssues = b.issues as HealthCheckIssue[];

        const aCount = aIssues.filter(
          (issue) => issue.severity === severityType,
        ).length;
        const bCount = bIssues.filter(
          (issue) => issue.severity === severityType,
        ).length;

        const diff = aCount - bCount;
        return sortOrder === "asc" ? diff : -diff;
      });

      // 应用分页
      records = records.slice(skip, skip + pageSize);
    }

    // 转换数据格式
    const data: DoctorHistoryItem[] = records.map((record) => ({
      id: record.id,
      createdAt: record.createdAt.toISOString(),
      issues: record.issues as HealthCheckIssue[],
    }));

    // 计算分页元数据
    const totalPages = Math.ceil(total / pageSize);
    const meta = {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return response.ok({
      data,
      meta,
    });
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

  if (!(await limitControl(await headers()))) {
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

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 获取最近 N 天的时间范围
    const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 获取最近 N 天和最近 N 次的并集
    const [recentByTime, recentByCount] = await Promise.all([
      // 按时间获取：最近 N 天
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
          issues: true,
        },
      }),
      // 按数量获取：最近 N 次
      prisma.healthCheck.findMany({
        take: count,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          createdAt: true,
          issues: true,
        },
      }),
    ]);

    // 合并两个结果集并去重
    const mergedMap = new Map<number, (typeof recentByTime)[0]>();

    recentByTime.forEach((record) => {
      mergedMap.set(record.id, record);
    });

    recentByCount.forEach((record) => {
      mergedMap.set(record.id, record);
    });

    // 转换为数组并按时间排序
    const merged = Array.from(mergedMap.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    // 转换数据格式
    const data: DoctorTrendItem[] = merged.map((record) => {
      const issues = record.issues as HealthCheckIssue[];
      const counts = {
        info: 0,
        warning: 0,
        error: 0,
      };

      issues.forEach((issue) => {
        counts[issue.severity]++;
      });

      return {
        time: record.createdAt.toISOString(),
        data: counts,
      };
    });

    return response.ok({ data });
  } catch (error) {
    console.error("Get doctor trends error:", error);
    return response.serverError();
  }
}

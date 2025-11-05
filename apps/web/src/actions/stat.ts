"use server";
import { NextResponse } from "next/server";
import { ApiResponse, ApiResponseData } from "@repo/shared-types/api/common";
import ResponseBuilder from "@/lib/server/response";
import limitControl from "@/lib/server/rateLimit";
import { headers } from "next/headers";
import { validateData } from "@/lib/server/validator";
import { authVerify } from "@/lib/server/auth-verify";
import {
  GetUsersStatsSuccessResponse,
  GetUsersStats,
  GetUsersStatsSchema,
  GetAuditStatsSuccessResponse,
  GetAuditStats,
  GetAuditStatsSchema,
  GetPostsStatsSuccessResponse,
  GetPostsStats,
  GetPostsStatsSchema,
} from "@repo/shared-types/api/stats";
import prisma from "@/lib/server/prisma";
import { getCache, setCache, generateCacheKey } from "@/lib/server/cache";

type ActionEnvironment = "serverless" | "serveraction";
type ActionConfig = { environment?: ActionEnvironment };
type ActionResult<T extends ApiResponseData> =
  | NextResponse<ApiResponse<T>>
  | ApiResponse<T>;

export async function getUsersStats(
  params: GetUsersStats,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<GetUsersStatsSuccessResponse["data"]>>>;
export async function getUsersStats(
  params: GetUsersStats,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<GetUsersStatsSuccessResponse["data"]>>;
export async function getUsersStats(
  { access_token, force }: GetUsersStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<GetUsersStatsSuccessResponse["data"] | null>> {
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
    GetUsersStatsSchema,
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
    const CACHE_KEY = generateCacheKey("stats", "users");
    const CACHE_TTL = 60 * 60; // 1小时

    // 如果不是强制刷新，尝试从缓存获取
    if (!force) {
      const cachedData = await getCache<GetUsersStatsSuccessResponse["data"]>(
        CACHE_KEY,
        {
          ttl: CACHE_TTL,
        },
      );

      if (cachedData) {
        return response.ok({
          data: cachedData,
        });
      }
    }

    // 计算时间边界
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 使用一次原生 SQL 查询获取所有统计数据
    // 优化：从 7 次查询减少到 1 次查询
    const stats = await prisma.$queryRaw<
      Array<{
        role: string;
        total_count: bigint;
        active_1d: bigint;
        active_7d: bigint;
        active_30d: bigint;
        new_1d: bigint;
        new_7d: bigint;
        new_30d: bigint;
      }>
    >`
      SELECT 
        role,
        COUNT(*) as total_count,
        COUNT(CASE WHEN "lastUseAt" >= ${oneDayAgo} THEN 1 END) as active_1d,
        COUNT(CASE WHEN "lastUseAt" >= ${sevenDaysAgo} THEN 1 END) as active_7d,
        COUNT(CASE WHEN "lastUseAt" >= ${thirtyDaysAgo} THEN 1 END) as active_30d,
        COUNT(CASE WHEN "createdAt" >= ${oneDayAgo} THEN 1 END) as new_1d,
        COUNT(CASE WHEN "createdAt" >= ${sevenDaysAgo} THEN 1 END) as new_7d,
        COUNT(CASE WHEN "createdAt" >= ${thirtyDaysAgo} THEN 1 END) as new_30d
      FROM "User"
      WHERE "deletedAt" IS NULL
      GROUP BY role
    `;

    // 初始化统计数据
    const total = {
      total: 0,
      user: 0,
      admin: 0,
      editor: 0,
      author: 0,
    };

    let activeLastDay = 0;
    let activeLast7Days = 0;
    let activeLast30Days = 0;
    let newLastDay = 0;
    let newLast7Days = 0;
    let newLast30Days = 0;

    // 聚合统计结果
    stats.forEach((stat) => {
      const count = Number(stat.total_count);
      total.total += count;

      // 按角色分类
      switch (stat.role) {
        case "USER":
          total.user = count;
          break;
        case "ADMIN":
          total.admin = count;
          break;
        case "EDITOR":
          total.editor = count;
          break;
        case "AUTHOR":
          total.author = count;
          break;
      }

      // 累加活跃用户数
      activeLastDay += Number(stat.active_1d);
      activeLast7Days += Number(stat.active_7d);
      activeLast30Days += Number(stat.active_30d);

      // 累加新增用户数
      newLastDay += Number(stat.new_1d);
      newLast7Days += Number(stat.new_7d);
      newLast30Days += Number(stat.new_30d);
    });

    // 构建响应数据
    const data: GetUsersStatsSuccessResponse["data"] = {
      updatedAt: now.toISOString(),
      cache: false,
      total,
      active: {
        lastDay: activeLastDay,
        last7Days: activeLast7Days,
        last30Days: activeLast30Days,
      },
      new: {
        lastDay: newLastDay,
        last7Days: newLast7Days,
        last30Days: newLast30Days,
      },
    };

    // 保存到缓存（缓存1小时）
    const cacheData = { ...data, cache: true };
    await setCache(CACHE_KEY, cacheData, {
      ttl: CACHE_TTL,
    });

    return response.ok({
      data,
    });
  } catch (error) {
    console.error("GetUsersStats error:", error);
    return response.serverError();
  }
}

export async function getAuditStats(
  params: GetAuditStats,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<GetAuditStatsSuccessResponse["data"]>>>;
export async function getAuditStats(
  params: GetAuditStats,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<GetAuditStatsSuccessResponse["data"]>>;
export async function getAuditStats(
  { access_token, force }: GetAuditStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<GetAuditStatsSuccessResponse["data"] | null>> {
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
    GetAuditStatsSchema,
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
    const CACHE_KEY = generateCacheKey("stats", "audit");
    const CACHE_TTL = 60 * 60; // 1小时

    // 如果不是强制刷新，尝试从缓存获取
    if (!force) {
      const cachedData = await getCache<GetAuditStatsSuccessResponse["data"]>(
        CACHE_KEY,
        {
          ttl: CACHE_TTL,
        },
      );

      if (cachedData) {
        return response.ok({
          data: cachedData,
        });
      }
    }

    // 计算时间边界
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 使用单次查询获取所有统计数据
    const [totalLogs, activeUsers, recentLogs] = await Promise.all([
      // 总日志数
      prisma.auditLog.count(),

      // 活跃用户数（产生过日志的用户数）
      prisma.auditLog.findMany({
        select: { userUid: true },
        distinct: ["userUid"],
      }),

      // 最近的日志数量（按时间段）
      prisma.$queryRaw<
        Array<{
          last_1d: bigint;
          last_7d: bigint;
          last_30d: bigint;
        }>
      >`
        SELECT
          COUNT(CASE WHEN "timestamp" >= ${oneDayAgo} THEN 1 END) as last_1d,
          COUNT(CASE WHEN "timestamp" >= ${sevenDaysAgo} THEN 1 END) as last_7d,
          COUNT(CASE WHEN "timestamp" >= ${thirtyDaysAgo} THEN 1 END) as last_30d
        FROM "AuditLog"
      `,
    ]);

    const recentStats = recentLogs[0];

    // 构建响应数据
    const data: GetAuditStatsSuccessResponse["data"] = {
      updatedAt: now.toISOString(),
      cache: false,
      total: {
        logs: totalLogs,
        activeUsers: activeUsers.length,
      },
      recent: {
        lastDay: Number(recentStats?.last_1d || 0),
        last7Days: Number(recentStats?.last_7d || 0),
        last30Days: Number(recentStats?.last_30d || 0),
      },
    };

    // 保存到缓存（缓存1小时）
    const cacheData = { ...data, cache: true };
    await setCache(CACHE_KEY, cacheData, {
      ttl: CACHE_TTL,
    });

    return response.ok({
      data,
    });
  } catch (error) {
    console.error("GetAuditStats error:", error);
    return response.serverError();
  }
}

export async function getPostsStats(
  params: GetPostsStats,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<GetPostsStatsSuccessResponse["data"]>>>;
export async function getPostsStats(
  params: GetPostsStats,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<GetPostsStatsSuccessResponse["data"]>>;
export async function getPostsStats(
  { access_token, force }: GetPostsStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<GetPostsStatsSuccessResponse["data"] | null>> {
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
    GetPostsStatsSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    const CACHE_KEY = generateCacheKey("stats", "posts");
    const CACHE_TTL = 60 * 60; // 1小时

    // 如果不是强制刷新，尝试从缓存获取
    if (!force) {
      const cachedData = await getCache<GetPostsStatsSuccessResponse["data"]>(
        CACHE_KEY,
        {
          ttl: CACHE_TTL,
        },
      );

      if (cachedData) {
        return response.ok({
          data: cachedData,
        });
      }
    }

    // 计算时间边界
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // 使用一次原生 SQL 查询获取所有统计数据
    const stats = await prisma.$queryRaw<
      Array<{
        status: string;
        total_count: bigint;
        new_7d: bigint;
        new_30d: bigint;
        new_1y: bigint;
      }>
    >`
      SELECT 
        status,
        COUNT(*) as total_count,
        COUNT(CASE WHEN "createdAt" >= ${sevenDaysAgo} THEN 1 END) as new_7d,
        COUNT(CASE WHEN "createdAt" >= ${thirtyDaysAgo} THEN 1 END) as new_30d,
        COUNT(CASE WHEN "createdAt" >= ${oneYearAgo} THEN 1 END) as new_1y
      FROM "Post"
      WHERE "deletedAt" IS NULL
      GROUP BY status
    `;

    // 初始化统计数据
    const total = {
      total: 0,
      published: 0,
      draft: 0,
      archived: 0,
    };

    let newLast7Days = 0;
    let newLast30Days = 0;
    let newLastYear = 0;

    // 聚合统计结果
    stats.forEach((stat) => {
      const count = Number(stat.total_count);
      total.total += count;

      // 按状态分类
      switch (stat.status) {
        case "PUBLISHED":
          total.published = count;
          break;
        case "DRAFT":
          total.draft = count;
          break;
        case "ARCHIVED":
          total.archived = count;
          break;
      }

      // 累加新增文章数
      newLast7Days += Number(stat.new_7d);
      newLast30Days += Number(stat.new_30d);
      newLastYear += Number(stat.new_1y);
    });

    // 获取最后发布的文章时间和第一篇文章时间
    const [lastPublishedPost, firstPublishedPost] = await Promise.all([
      prisma.post.findFirst({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
        },
        orderBy: {
          publishedAt: "desc",
        },
        select: {
          publishedAt: true,
        },
      }),
      prisma.post.findFirst({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
        },
        orderBy: {
          publishedAt: "asc",
        },
        select: {
          publishedAt: true,
        },
      }),
    ]);

    // 计算平均发布间隔（天）
    let averageDaysBetweenPosts = null;
    if (
      firstPublishedPost?.publishedAt &&
      lastPublishedPost?.publishedAt &&
      total.published > 1
    ) {
      const firstDate = firstPublishedPost.publishedAt.getTime();
      const lastDate = lastPublishedPost.publishedAt.getTime();
      const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
      averageDaysBetweenPosts = daysDiff / (total.published - 1);
    }

    // 构建响应数据
    const data: GetPostsStatsSuccessResponse["data"] = {
      updatedAt: now.toISOString(),
      cache: false,
      total,
      new: {
        last7Days: newLast7Days,
        last30Days: newLast30Days,
        lastYear: newLastYear,
      },
      lastPublished: lastPublishedPost?.publishedAt?.toISOString() || null,
      firstPublished: firstPublishedPost?.publishedAt?.toISOString() || null,
      averageDaysBetweenPosts,
    };

    // 保存到缓存（缓存1小时）
    const cacheData = { ...data, cache: true };
    await setCache(CACHE_KEY, cacheData, {
      ttl: CACHE_TTL,
    });

    return response.ok({
      data,
    });
  } catch (error) {
    console.error("GetPostsStats error:", error);
    return response.serverError();
  }
}

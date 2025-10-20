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
} from "@repo/shared-types/api/stats";
import prisma from "@/lib/server/prisma";
import { getCache, setCache } from "@/lib/server/cache";

type ActionEnvironment = "serverless" | "serveraction";
type ActionConfig = { environment?: ActionEnvironment };
type ActionResult<T extends ApiResponseData> =
  | NextResponse<ApiResponse<T>>
  | ApiResponse<T>;

export async function getUsersStat(
  params: GetUsersStats,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<GetUsersStatsSuccessResponse["data"]>>>;
export async function getUsersStat(
  params: GetUsersStats,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<GetUsersStatsSuccessResponse["data"]>>;
export async function getUsersStat(
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
    const CACHE_KEY = "users_stats";
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

    // 获取用户总数统计（按角色分组）
    const usersByRole = await prisma.user.groupBy({
      by: ["role"],
      _count: {
        uid: true,
      },
      where: {
        deletedAt: null,
      },
    });

    // 计算各角色用户数
    const total = {
      total: 0,
      user: 0,
      admin: 0,
      editor: 0,
      author: 0,
    };

    usersByRole.forEach((item) => {
      const count = item._count.uid;
      total.total += count;

      switch (item.role) {
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
    });

    // 计算时间边界
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 活跃用户统计（根据 lastUseAt）
    const [activeLastDay, activeLast7Days, activeLast30Days] =
      await Promise.all([
        prisma.user.count({
          where: {
            lastUseAt: { gte: oneDayAgo },
            deletedAt: null,
          },
        }),
        prisma.user.count({
          where: {
            lastUseAt: { gte: sevenDaysAgo },
            deletedAt: null,
          },
        }),
        prisma.user.count({
          where: {
            lastUseAt: { gte: thirtyDaysAgo },
            deletedAt: null,
          },
        }),
      ]);

    // 新增用户统计（根据 createdAt）
    const [newLastDay, newLast7Days, newLast30Days] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: { gte: oneDayAgo },
          deletedAt: null,
        },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
          deletedAt: null,
        },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          deletedAt: null,
        },
      }),
    ]);

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

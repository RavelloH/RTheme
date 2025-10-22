"use server";
import { NextResponse } from "next/server";
import {
  GetUsersTrendsSchema,
  GetUsersTrends,
  UserTrendItem,
  GetUsersListSchema,
  GetUsersList,
  UserListItem,
} from "@repo/shared-types/api/user";
import { ApiResponse, ApiResponseData } from "@repo/shared-types/api/common";
import ResponseBuilder from "@/lib/server/response";
import limitControl from "@/lib/server/rateLimit";
import { headers } from "next/headers";
import { validateData } from "@/lib/server/validator";
import prisma from "@/lib/server/prisma";
import { authVerify } from "@/lib/server/auth-verify";

type ActionEnvironment = "serverless" | "serveraction";
type ActionConfig = { environment?: ActionEnvironment };
type ActionResult<T extends ApiResponseData> =
  | NextResponse<ApiResponse<T>>
  | ApiResponse<T>;

/*
  getUsersTrends - 获取用户趋势数据
*/
export async function getUsersTrends(
  params: GetUsersTrends,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<UserTrendItem[] | null>>>;
export async function getUsersTrends(
  params: GetUsersTrends,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<UserTrendItem[] | null>>;
export async function getUsersTrends(
  { access_token, days = 30, count = 30 }: GetUsersTrends,
  serverConfig?: ActionConfig,
): Promise<ActionResult<UserTrendItem[] | null>> {
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
    GetUsersTrendsSchema,
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
    const now = new Date();
    const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 生成日期序列
    const datePoints: Date[] = [];
    const interval = Math.floor((days * 24 * 60 * 60 * 1000) / count);

    for (let i = 0; i < count; i++) {
      datePoints.push(new Date(daysAgo.getTime() + i * interval));
    }
    datePoints.push(now); // 确保包含当前时间点

    // 为每个时间点计算统计数据
    const trendData: UserTrendItem[] = await Promise.all(
      datePoints.map(async (date) => {
        const oneDayBefore = new Date(date.getTime() - 24 * 60 * 60 * 1000);

        const [totalUsers, activeUsers, newUsers] = await Promise.all([
          // 截止该时间点的总用户数
          prisma.user.count({
            where: { createdAt: { lte: date } },
          }),
          // 该时间点前24小时活跃用户数
          prisma.user.count({
            where: {
              lastUseAt: {
                gte: oneDayBefore,
                lte: date,
              },
            },
          }),
          // 该时间点前24小时新增用户数
          prisma.user.count({
            where: {
              createdAt: {
                gte: oneDayBefore,
                lte: date,
              },
            },
          }),
        ]);

        return {
          time: date.toISOString(),
          data: {
            total: totalUsers,
            active: activeUsers,
            new: newUsers,
          },
        };
      }),
    );

    return response.ok({ data: trendData });
  } catch (error) {
    console.error("Get users trends error:", error);
    return response.serverError();
  }
}

/*
  getUsersList - 获取用户列表
*/
export async function getUsersList(
  params: GetUsersList,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<UserListItem[] | null>>>;
export async function getUsersList(
  params: GetUsersList,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<UserListItem[] | null>>;
export async function getUsersList(
  {
    access_token,
    page = 1,
    pageSize = 25,
    sortBy = "uid",
    sortOrder = "asc",
    role,
    status,
    search,
  }: GetUsersList,
  serverConfig?: ActionConfig,
): Promise<ActionResult<UserListItem[] | null>> {
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
      role,
      status,
      search,
    },
    GetUsersListSchema,
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

    // 构建 where 条件
    const where: {
      role?: "USER" | "ADMIN" | "EDITOR" | "AUTHOR";
      status?: "ACTIVE" | "SUSPENDED" | "NEEDS_UPDATE";
      OR?: Array<{
        username?: { contains: string; mode: "insensitive" };
        nickname?: { contains: string; mode: "insensitive" };
        email?: { contains: string; mode: "insensitive" };
      }>;
    } = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search && search.trim()) {
      where.OR = [
        { username: { contains: search.trim(), mode: "insensitive" } },
        { nickname: { contains: search.trim(), mode: "insensitive" } },
        { email: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    // 获取总数
    const total = await prisma.user.count({ where });

    // 构建排序条件
    const orderBy = { [sortBy]: sortOrder };

    // 获取分页数据
    const users = await prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      select: {
        uid: true,
        email: true,
        emailVerified: true,
        emailNotice: true,
        username: true,
        nickname: true,
        website: true,
        bio: true,
        avatar: true,
        createdAt: true,
        lastUseAt: true,
        role: true,
        status: true,
      },
    });

    // 转换数据格式
    const data: UserListItem[] = users.map((user) => ({
      uid: user.uid,
      email: user.email,
      emailVerified: user.emailVerified,
      emailNotice: user.emailNotice,
      username: user.username,
      nickname: user.nickname,
      website: user.website,
      bio: user.bio,
      avatar: user.avatar,
      createdAt: user.createdAt.toISOString(),
      lastUseAt: user.lastUseAt.toISOString(),
      role: user.role,
      status: user.status,
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
    console.error("Get users list error:", error);
    return response.serverError();
  }
}

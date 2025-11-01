"use server";
import { NextResponse } from "next/server";
import {
  GetUsersTrendsSchema,
  GetUsersTrends,
  UserTrendItem,
  GetUsersListSchema,
  GetUsersList,
  UserListItem,
  UpdateUsersSchema,
  UpdateUsers,
  DeleteUsersSchema,
  DeleteUsers,
} from "@repo/shared-types/api/user";
import { ApiResponse, ApiResponseData } from "@repo/shared-types/api/common";
import ResponseBuilder from "@/lib/server/response";
import limitControl from "@/lib/server/rateLimit";
import { headers } from "next/headers";
import { validateData } from "@/lib/server/validator";
import prisma from "@/lib/server/prisma";
import { authVerify } from "@/lib/server/auth-verify";
import { logAuditEvent } from "./audit";
import { getClientIP, getClientUserAgent } from "@/lib/server/getClientInfo";

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
            where: { createdAt: { lte: date }, deletedAt: null },
          }),
          // 该时间点前24小时活跃用户数
          prisma.user.count({
            where: {
              lastUseAt: {
                gte: oneDayBefore,
                lte: date,
              },
              deletedAt: null,
            },
          }),
          // 该时间点前24小时新增用户数
          prisma.user.count({
            where: {
              createdAt: {
                gte: oneDayBefore,
                lte: date,
              },
              deletedAt: null,
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
      deletedAt: null;
      role?: "USER" | "ADMIN" | "EDITOR" | "AUTHOR";
      status?: "ACTIVE" | "SUSPENDED" | "NEEDS_UPDATE";
      OR?: Array<{
        username?: { contains: string; mode: "insensitive" };
        nickname?: { contains: string; mode: "insensitive" };
        email?: { contains: string; mode: "insensitive" };
      }>;
    } = {
      deletedAt: null, // 只获取未删除的用户
    };

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

/*
  updateUsers - 批量更新用户信息
*/
export async function updateUsers(
  params: UpdateUsers,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<{ updated: number } | null>>>;
export async function updateUsers(
  params: UpdateUsers,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<{ updated: number } | null>>;
export async function updateUsers(
  {
    access_token,
    uids,
    role,
    status,
    username,
    nickname,
    email,
    avatar,
    website,
    bio,
    emailVerified,
    emailNotice,
  }: UpdateUsers,
  serverConfig?: ActionConfig,
): Promise<ActionResult<{ updated: number } | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      uids,
      role,
      status,
      username,
      nickname,
      email,
      avatar,
      website,
      bio,
      emailVerified,
      emailNotice,
    },
    UpdateUsersSchema,
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
    const isSingleUser = uids.length === 1;
    const isBatchUpdate = uids.length > 1;

    // 单个用户编辑模式：可以更改所有字段
    if (isSingleUser) {
      const targetUid = uids[0];

      // 检查是否是当前用户，如果是则不允许更改角色和状态
      const isCurrentUser = targetUid === user.uid;

      // 先查询旧值（用于审计日志）
      const oldUser = await prisma.user.findUnique({
        where: {
          uid: targetUid,
        },
        select: {
          username: true,
          nickname: true,
          email: true,
          avatar: true,
          website: true,
          bio: true,
          emailVerified: true,
          emailNotice: true,
          role: true,
          status: true,
        },
      });

      if (!oldUser) {
        return response.badRequest({
          message: "用户不存在",
        });
      }

      // 构建更新数据
      const updateData: {
        username?: string;
        nickname?: string;
        email?: string;
        avatar?: string | null;
        website?: string | null;
        bio?: string | null;
        emailVerified?: boolean;
        emailNotice?: boolean;
        role?: "USER" | "ADMIN" | "EDITOR" | "AUTHOR";
        status?: "ACTIVE" | "SUSPENDED" | "NEEDS_UPDATE";
      } = {};

      // 基本信息字段（所有情况都允许更新）
      if (username !== undefined) updateData.username = username;
      if (nickname !== undefined) updateData.nickname = nickname;
      if (email !== undefined) updateData.email = email;
      if (avatar !== undefined) updateData.avatar = avatar || null;
      if (website !== undefined) updateData.website = website || null;
      if (bio !== undefined) updateData.bio = bio || null;
      if (emailVerified !== undefined) updateData.emailVerified = emailVerified;
      if (emailNotice !== undefined) updateData.emailNotice = emailNotice;

      // 角色和状态字段（当前用户不允许更改）
      if (!isCurrentUser) {
        if (role !== undefined) updateData.role = role;
        if (status !== undefined) updateData.status = status;
      } else if (role !== undefined || status !== undefined) {
        return response.badRequest({
          message: "不允许更改当前用户的角色和状态",
        });
      }

      // 验证至少提供一个更新字段
      if (Object.keys(updateData).length === 0) {
        return response.badRequest({
          message: "必须提供至少一个更新字段",
        });
      }

      // 构建旧值对象（只包含被更新的字段）
      const oldData: Record<string, unknown> = {};
      Object.keys(updateData).forEach((key) => {
        oldData[key] = oldUser[key as keyof typeof oldUser];
      });

      // 执行更新
      const result = await prisma.user.updateMany({
        where: {
          uid: targetUid,
          deletedAt: null,
        },
        data: updateData,
      });

      // 记录审计日志
      if (result.count > 0) {
        await logAuditEvent({
          user: {
            uid: String(user.uid),
            ipAddress: await getClientIP(),
            userAgent: await getClientUserAgent(),
          },
          details: {
            action: "UPDATE",
            resourceType: "USER",
            resourceId: String(targetUid),
            vaule: {
              old: oldData,
              new: updateData,
            },
            description: `更新用户信息：${oldUser.username} (UID: ${targetUid})`,
          },
        });
      }

      return response.ok({
        data: { updated: result.count },
      });
    }

    // 批量更新模式：只允许更改角色和状态
    if (isBatchUpdate) {
      // 批量更新时不允许更改基本信息字段
      if (
        username !== undefined ||
        nickname !== undefined ||
        email !== undefined ||
        avatar !== undefined ||
        website !== undefined ||
        bio !== undefined ||
        emailVerified !== undefined ||
        emailNotice !== undefined
      ) {
        return response.badRequest({
          message: "批量更新只允许更改角色和状态，不允许更改其他字段",
        });
      }

      // 验证至少提供一个更新字段
      if (!role && !status) {
        return response.badRequest({
          message: "必须提供至少一个更新字段（role 或 status）",
        });
      }

      // 检查是否包含当前用户
      if (uids.includes(user.uid)) {
        return response.badRequest({
          message: "不允许更改当前用户的角色和状态",
        });
      }

      // 查询旧值（用于审计日志）
      const oldUsers = await prisma.user.findMany({
        where: {
          uid: {
            in: uids,
          },
          deletedAt: null,
        },
        select: {
          uid: true,
          username: true,
          role: true,
          status: true,
        },
      });

      // 构建旧值摘要
      const oldData: Record<string, unknown> = {
        users: oldUsers.map((u) => ({
          uid: u.uid,
          username: u.username,
          ...(role !== undefined && { role: u.role }),
          ...(status !== undefined && { status: u.status }),
        })),
      };

      // 构建更新数据
      const updateData: {
        role?: "USER" | "ADMIN" | "EDITOR" | "AUTHOR";
        status?: "ACTIVE" | "SUSPENDED" | "NEEDS_UPDATE";
      } = {};

      if (role) {
        updateData.role = role;
      }

      if (status) {
        updateData.status = status;
      }

      // 执行批量更新
      const result = await prisma.user.updateMany({
        where: {
          uid: {
            in: uids,
          },
          deletedAt: null, // 只更新未删除的用户
        },
        data: updateData,
      });

      // 记录审计日志
      if (result.count > 0) {
        await logAuditEvent({
          user: {
            uid: String(user.uid),
            ipAddress: await getClientIP(),
            userAgent: await getClientUserAgent(),
          },
          details: {
            action: "BULK_UPDATE",
            resourceType: "USER",
            resourceId: uids.join(","),
            vaule: {
              old: oldData,
              new: updateData,
            },
            description: `批量更新 ${result.count} 个用户的${role ? "角色" : ""}${role && status ? "和" : ""}${status ? "状态" : ""}`,
          },
        });
      }

      return response.ok({
        data: { updated: result.count },
      });
    }

    return response.badRequest({
      message: "无效的请求",
    });
  } catch (error) {
    console.error("Update users error:", error);
    return response.serverError();
  }
}

/*
  deleteUsers - 批量删除用户（软删除）
*/
export async function deleteUsers(
  params: DeleteUsers,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<{ deleted: number } | null>>>;
export async function deleteUsers(
  params: DeleteUsers,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<{ deleted: number } | null>>;
export async function deleteUsers(
  { access_token, uids }: DeleteUsers,
  serverConfig?: ActionConfig,
): Promise<ActionResult<{ deleted: number } | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      uids,
    },
    DeleteUsersSchema,
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
    // 检查是否包含当前用户
    if (uids.includes(user.uid)) {
      return response.badRequest({
        message: "不允许删除当前用户",
      });
    }

    // 查询要删除的用户信息（用于审计日志）
    const usersToDelete = await prisma.user.findMany({
      where: {
        uid: {
          in: uids,
        },
        deletedAt: null,
      },
      select: {
        uid: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // 构建旧值记录
    const oldData: Record<string, unknown> = {
      users: usersToDelete.map((u) => ({
        uid: u.uid,
        username: u.username,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt.toISOString(),
      })),
    };

    const NOW = new Date();

    // 执行软删除
    const result = await prisma.user.updateMany({
      where: {
        uid: {
          in: uids,
        },
        deletedAt: null, // 只删除未删除的用户
      },
      data: {
        deletedAt: NOW,
      },
    });

    // 记录审计日志
    if (result.count > 0) {
      await logAuditEvent({
        user: {
          uid: String(user.uid),
          ipAddress: await getClientIP(),
          userAgent: await getClientUserAgent(),
        },
        details: {
          action: "BULK_DELETE",
          resourceType: "USER",
          resourceId: uids.join(","),
          vaule: {
            old: oldData,
            new: { deletedAt: NOW.toISOString() },
          },
          description: `批量删除 ${result.count} 个用户：${usersToDelete.map((u) => u.username).join(", ")}`,
        },
      });
    }

    return response.ok({
      data: { deleted: result.count },
    });
  } catch (error) {
    console.error("Delete users error:", error);
    return response.serverError();
  }
}

"use server";
import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
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
import { validateData } from "@/lib/server/validator";
import prisma from "@/lib/server/prisma";
import { authVerify } from "@/lib/server/auth-verify";
import { logAuditEvent } from "./audit";
import { getClientIP, getClientUserAgent } from "@/lib/server/getClientInfo";
import { jwtTokenVerify, type AccessTokenPayload } from "@/lib/server/jwt";

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

  if (!(await limitControl(await headers(), "getUsersTrends"))) {
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
    uid,
    role,
    status,
    emailVerified,
    emailNotice,
    createdAtStart,
    createdAtEnd,
    lastUseAtStart,
    lastUseAtEnd,
    search,
  }: GetUsersList,
  serverConfig?: ActionConfig,
): Promise<ActionResult<UserListItem[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getUsersList"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      page,
      pageSize,
      sortBy,
      sortOrder,
      uid,
      role,
      status,
      emailVerified,
      emailNotice,
      createdAtStart,
      createdAtEnd,
      lastUseAtStart,
      lastUseAtEnd,
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
      uid?: number;
      role?: { in: ("USER" | "ADMIN" | "EDITOR" | "AUTHOR")[] };
      status?: { in: ("ACTIVE" | "SUSPENDED" | "NEEDS_UPDATE")[] };
      emailVerified?: boolean;
      emailNotice?: boolean;
      createdAt?: { gte?: Date; lte?: Date };
      lastUseAt?: { gte?: Date; lte?: Date };
      OR?: Array<{
        username?: { contains: string; mode: "insensitive" };
        nickname?: { contains: string; mode: "insensitive" };
        email?: { contains: string; mode: "insensitive" };
      }>;
    } = {
      deletedAt: null, // 只获取未删除的用户
    };

    if (uid) {
      where.uid = uid;
    }

    if (role && role.length > 0) {
      where.role = { in: role };
    }

    if (status && status.length > 0) {
      where.status = { in: status };
    }

    // 布尔字段的多选处理
    if (emailVerified && emailVerified.length === 1) {
      // 只选择一个值时，直接添加为 where 条件
      (where as { emailVerified?: boolean }).emailVerified = emailVerified[0];
    }
    // 如果选择了两个值（true 和 false），相当于不筛选，不添加条件

    if (emailNotice && emailNotice.length === 1) {
      // 只选择一个值时，直接添加为 where 条件
      (where as { emailNotice?: boolean }).emailNotice = emailNotice[0];
    }
    // 如果选择了两个值（true 和 false），相当于不筛选，不添加条件

    if (createdAtStart || createdAtEnd) {
      where.createdAt = {};
      if (createdAtStart) {
        where.createdAt.gte = new Date(createdAtStart);
      }
      if (createdAtEnd) {
        where.createdAt.lte = new Date(createdAtEnd);
      }
    }

    if (lastUseAtStart || lastUseAtEnd) {
      where.lastUseAt = {};
      if (lastUseAtStart) {
        where.lastUseAt.gte = new Date(lastUseAtStart);
      }
      if (lastUseAtEnd) {
        where.lastUseAt.lte = new Date(lastUseAtEnd);
      }
    }

    if (search && search.trim()) {
      if (!where.OR) where.OR = [];
      where.OR.push(
        { username: { contains: search.trim(), mode: "insensitive" } },
        { nickname: { contains: search.trim(), mode: "insensitive" } },
        { email: { contains: search.trim(), mode: "insensitive" } },
      );
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
        _count: {
          select: {
            posts: true,
            comments: true,
          },
        },
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
      postsCount: user._count.posts,
      commentsCount: user._count.comments,
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

  if (!(await limitControl(await headers(), "updateUsers"))) {
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

  if (!(await limitControl(await headers(), "deleteUsers"))) {
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

/**
 * 获取当前用户的个人资料（用于设置页面）
 */
export async function getUserProfile(): Promise<
  ApiResponse<{
    uid: number;
    username: string;
    email: string;
    hasPassword: boolean;
    linkedAccounts: Array<{
      provider: string;
      email: string;
    }>;
  }>
> {
  const response = new ResponseBuilder("serveraction");

  try {
    // 从 cookie 获取当前用户的 access token
    const cookieStore = await cookies();
    const token = cookieStore.get("ACCESS_TOKEN")?.value || "";
    const decoded = jwtTokenVerify<AccessTokenPayload>(token);

    if (!decoded) {
      return response.unauthorized({
        message: "请先登录",
      }) as unknown as ApiResponse<{
        uid: number;
        username: string;
        email: string;
        hasPassword: boolean;
        linkedAccounts: Array<{
          provider: string;
          email: string;
        }>;
      }>;
    }

    const { uid } = decoded;

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { uid },
      select: {
        uid: true,
        username: true,
        email: true,
        password: true,
        accounts: {
          select: {
            provider: true,
          },
        },
      },
    });

    if (!user) {
      return response.unauthorized({
        message: "用户不存在",
      }) as unknown as ApiResponse<{
        uid: number;
        username: string;
        email: string;
        hasPassword: boolean;
        linkedAccounts: Array<{
          provider: string;
          email: string;
        }>;
      }>;
    }

    // 构建返回数据
    return response.ok({
      data: {
        uid: user.uid,
        username: user.username,
        email: user.email,
        hasPassword: !!user.password,
        linkedAccounts: user.accounts.map((account) => ({
          provider: account.provider.toLowerCase(),
          email: user.email,
        })),
      },
    }) as unknown as ApiResponse<{
      uid: number;
      username: string;
      email: string;
      hasPassword: boolean;
      linkedAccounts: Array<{
        provider: string;
        email: string;
      }>;
    }>;
  } catch (error) {
    console.error("Get user profile error:", error);
    return response.serverError({
      message: "获取用户信息失败，请稍后重试",
    }) as unknown as ApiResponse<{
      uid: number;
      username: string;
      email: string;
      hasPassword: boolean;
      linkedAccounts: Array<{
        provider: string;
        email: string;
      }>;
    }>;
  }
}

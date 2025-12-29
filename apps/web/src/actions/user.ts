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
  UpdateUserProfileSchema,
  UpdateUserProfile,
  Disable2FASchema,
  Disable2FA,
} from "@repo/shared-types/api/user";
import {
  usernameSchema,
  emailSchema,
  nicknameSchema,
} from "@repo/shared-types/api/auth";
import { ApiResponse, ApiResponseData } from "@repo/shared-types/api/common";
import ResponseBuilder from "@/lib/server/response";
import limitControl from "@/lib/server/rate-limit";
import { validateData } from "@/lib/server/validator";
import prisma from "@/lib/server/prisma";
import { authVerify } from "@/lib/server/auth-verify";
import { logAuditEvent } from "./audit";
import { getClientIP, getClientUserAgent } from "@/lib/server/get-client-info";
import { jwtTokenVerify, type AccessTokenPayload } from "@/lib/server/jwt";
import { Prisma } from ".prisma/client";

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
        totpSecret: true,
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
      hasTwoFactor: !!user.totpSecret,
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
export async function getUserProfile(serverConfig: {
  environment: "serverless";
}): Promise<
  NextResponse<
    ApiResponse<{
      uid: number;
      username: string;
      email: string;
      nickname: string | null;
      website: string | null;
      bio: string | null;
      role: "USER" | "ADMIN" | "EDITOR" | "AUTHOR";
      createdAt: string;
      hasPassword: boolean;
      linkedAccounts: Array<{
        provider: string;
        email: string;
      }>;
    } | null>
  >
>;
export async function getUserProfile(serverConfig?: ActionConfig): Promise<
  ApiResponse<{
    uid: number;
    username: string;
    email: string;
    nickname: string | null;
    website: string | null;
    bio: string | null;
    role: "USER" | "ADMIN" | "EDITOR" | "AUTHOR";
    createdAt: string;
    hasPassword: boolean;
    linkedAccounts: Array<{
      provider: string;
      email: string;
    }>;
  } | null>
>;
export async function getUserProfile(serverConfig?: ActionConfig): Promise<
  ActionResult<{
    uid: number;
    username: string;
    email: string;
    nickname: string | null;
    website: string | null;
    bio: string | null;
    role: "USER" | "ADMIN" | "EDITOR" | "AUTHOR";
    createdAt: string;
    hasPassword: boolean;
    linkedAccounts: Array<{
      provider: string;
      email: string;
    }>;
  } | null>
> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getUserProfile"))) {
    return response.tooManyRequests();
  }

  try {
    // 从 cookie 获取当前用户的 access token
    const cookieStore = await cookies();
    const token = cookieStore.get("ACCESS_TOKEN")?.value || "";
    const decoded = jwtTokenVerify<AccessTokenPayload>(token);

    if (!decoded) {
      return response.unauthorized({
        message: "请先登录",
      });
    }

    const { uid } = decoded;

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { uid },
      select: {
        uid: true,
        username: true,
        email: true,
        nickname: true,
        website: true,
        bio: true,
        role: true,
        createdAt: true,
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
      });
    }

    // 构建返回数据
    return response.ok({
      data: {
        uid: user.uid,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        website: user.website,
        bio: user.bio,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        hasPassword: !!user.password,
        linkedAccounts: user.accounts.map((account) => ({
          provider: account.provider.toLowerCase(),
          email: user.email,
        })),
      },
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    return response.serverError({
      message: "获取用户信息失败，请稍后重试",
    });
  }
}

/**
 * 更新当前用户的个人资料
 */
export async function updateUserProfile(
  params: UpdateUserProfile,
  serverConfig: { environment: "serverless" },
): Promise<
  NextResponse<ApiResponse<{ updated: boolean; needsLogout?: boolean } | null>>
>;
export async function updateUserProfile(
  params: UpdateUserProfile,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<{ updated: boolean; needsLogout?: boolean } | null>>;
export async function updateUserProfile(
  { field, value }: UpdateUserProfile,
  serverConfig?: ActionConfig,
): Promise<ActionResult<{ updated: boolean; needsLogout?: boolean } | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "updateUserProfile"))) {
    return response.tooManyRequests();
  }

  // 参数验证
  const validationError = validateData(
    { field, value },
    UpdateUserProfileSchema,
  );
  if (validationError) return response.badRequest(validationError);

  try {
    // 从 cookie 获取当前用户
    const cookieStore = await cookies();
    const token = cookieStore.get("ACCESS_TOKEN")?.value || "";
    const { jwtTokenVerify } = await import("@/lib/server/jwt");
    const decoded = jwtTokenVerify<AccessTokenPayload>(token);

    if (!decoded) {
      return response.unauthorized({
        message: "请先登录",
      });
    }

    const { uid } = decoded;

    // 敏感字段需要 reauth
    const sensitiveFields = ["username", "email"];
    if (sensitiveFields.includes(field)) {
      const { checkReauthToken } = await import("./reauth");
      const hasReauthToken = await checkReauthToken();
      if (!hasReauthToken) {
        return response.forbidden({
          message: "需要重新验证身份",
          error: {
            code: "NEED_REAUTH",
            message: "需要重新验证身份",
          },
        });
      }
    }

    // 查询当前用户信息
    const currentUser = await prisma.user.findUnique({
      where: { uid },
      select: {
        username: true,
        email: true,
        nickname: true,
        website: true,
        bio: true,
      },
    });

    if (!currentUser) {
      return response.unauthorized({
        message: "用户不存在",
      });
    }

    // 字段级验证
    let validatedValue: string | null = value.trim() || null;
    const { websiteSchema } = await import("@repo/shared-types/api/user");

    switch (field) {
      case "nickname": {
        if (validatedValue) {
          const result = nicknameSchema.safeParse(validatedValue);
          if (!result.success) {
            return response.badRequest({
              message: result.error.issues[0]?.message || "昵称格式不正确",
            });
          }
        }
        break;
      }

      case "username": {
        const result = usernameSchema.safeParse(validatedValue);
        if (!result.success) {
          return response.badRequest({
            message: result.error.issues[0]?.message || "用户名格式不正确",
          });
        }

        // 唯一性检查
        const existingUser = await prisma.user.findFirst({
          where: {
            username: validatedValue!,
            uid: { not: uid },
          },
        });

        if (existingUser) {
          return response.conflict({
            message: "该用户名已被使用",
          });
        }
        break;
      }

      case "email": {
        const result = emailSchema.safeParse(validatedValue);
        if (!result.success) {
          return response.badRequest({
            message: result.error.issues[0]?.message || "邮箱格式不正确",
          });
        }

        // 唯一性检查
        const existingUser = await prisma.user.findFirst({
          where: {
            email: validatedValue!,
            uid: { not: uid },
          },
        });

        if (existingUser) {
          return response.conflict({
            message: "该邮箱已被使用",
          });
        }
        break;
      }

      case "website": {
        if (validatedValue) {
          const result = websiteSchema.safeParse(validatedValue);
          if (!result.success) {
            return response.badRequest({
              message: result.error.issues[0]?.message || "网站链接格式不正确",
            });
          }
          validatedValue = result.data;
        }
        break;
      }

      case "bio": {
        if (validatedValue && validatedValue.length > 255) {
          return response.badRequest({
            message: "个人简介不能超过255个字符",
          });
        }
        break;
      }
    }

    // 准备更新数据
    const updateData: {
      nickname?: string | null;
      username?: string;
      email?: string;
      website?: string | null;
      bio?: string | null;
      emailVerifyCode?: string;
      emailVerified?: boolean;
    } = {
      [field]: validatedValue,
    };

    // 如果是邮箱修改，需要生成验证码
    let oldEmail: string | undefined;
    let newVerifyCode: string | undefined;
    if (field === "email" && validatedValue) {
      oldEmail = currentUser.email;
      const emailUtils = await import("@/lib/server/email");
      newVerifyCode = emailUtils.default.generate();
      updateData.emailVerifyCode = newVerifyCode;

      // 检查是否启用邮箱验证
      const { getConfig } = await import("@/lib/server/config-cache");
      const emailVerificationEnabled = await getConfig<boolean>(
        "user.email.verification.required",
        false,
      );
      if (emailVerificationEnabled) {
        updateData.emailVerified = false;
      }
    }

    // 执行更新
    await prisma.user.update({
      where: { uid },
      data: updateData,
    });

    // 获取客户端信息用于审计日志
    const clientIP = await getClientIP();
    const clientUserAgent = await getClientUserAgent();

    // 发送邮件通知（after 钩子）
    const { after } = await import("next/server");
    after(async () => {
      try {
        const { sendEmail } = await import("@/lib/server/email");
        const { renderEmail } = await import("@/emails/utils");
        const { getConfig } = await import("@/lib/server/config-cache");
        const siteName =
          (await getConfig<string>("site.name")) || "NeutralPress";
        const siteUrl = (await getConfig<string>("site.url")) || "";

        if (field === "username" && validatedValue) {
          // 发送用户名变更通知
          const { ProfileChangedTemplate } = await import("@/emails/templates");
          const emailComponent = ProfileChangedTemplate({
            username: currentUser.nickname || currentUser.username,
            changedField: "username",
            oldValue: currentUser.username,
            newValue: validatedValue,
            siteName,
            siteUrl,
          });

          const { html, text } = await renderEmail(emailComponent);

          await sendEmail({
            to: currentUser.email,
            subject: "账户用户名已变更",
            html,
            text,
          });
        } else if (
          field === "email" &&
          validatedValue &&
          oldEmail &&
          newVerifyCode
        ) {
          // 向旧邮箱发送变更通知
          const { ProfileChangedTemplate } = await import("@/emails/templates");
          const oldEmailComponent = ProfileChangedTemplate({
            username: currentUser.nickname || currentUser.username,
            changedField: "email",
            oldValue: oldEmail,
            newValue: validatedValue,
            siteName,
            siteUrl,
          });

          const oldEmailRendered = await renderEmail(oldEmailComponent);

          await sendEmail({
            to: oldEmail,
            subject: "账户邮箱已变更",
            html: oldEmailRendered.html,
            text: oldEmailRendered.text,
          });

          // 向新邮箱发送验证邮件
          const { EmailChangedTemplate } = await import("@/emails/templates");
          const newEmailComponent = EmailChangedTemplate({
            username: currentUser.nickname || currentUser.username,
            verificationCode: newVerifyCode.split("-")[0]!,
            oldEmail,
            newEmail: validatedValue,
            siteName,
            siteUrl,
          });

          const newEmailRendered = await renderEmail(newEmailComponent);

          await sendEmail({
            to: validatedValue,
            subject: "验证您的新邮箱",
            html: newEmailRendered.html,
            text: newEmailRendered.text,
          });
        }
      } catch (error) {
        console.error("Failed to send email notification:", error);
      }
    });

    // 记录审计日志（after 钩子）
    after(async () => {
      try {
        await logAuditEvent({
          user: {
            uid: String(uid),
            ipAddress: clientIP,
            userAgent: clientUserAgent,
          },
          details: {
            action: "UPDATE",
            resourceType: "USER",
            resourceId: String(uid),
            vaule: {
              old: { [field]: currentUser[field as keyof typeof currentUser] },
              new: { [field]: validatedValue },
            },
            description: `更新个人资料：${field}`,
          },
        });
      } catch (error) {
        console.error("Failed to log audit event:", error);
      }
    });

    // 敏感字段修改后需要退出登录
    if (sensitiveFields.includes(field)) {
      cookieStore.delete("ACCESS_TOKEN");
      cookieStore.delete("REFRESH_TOKEN");
      cookieStore.delete("REAUTH_TOKEN");

      return response.ok({
        data: { updated: true, needsLogout: true },
      });
    }

    return response.ok({
      data: { updated: true },
    });
  } catch (error) {
    console.error("Update user profile error:", error);
    return response.serverError({
      message: "更新失败，请稍后重试",
    });
  }
}

/**
 * 管理员关闭用户的2FA
 */
export async function disable2FA(
  params: Disable2FA,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<{ success: boolean } | null>>>;
export async function disable2FA(
  params: Disable2FA,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<{ success: boolean } | null>>;
export async function disable2FA(
  { access_token, uid }: Disable2FA,
  serverConfig?: ActionConfig,
): Promise<ActionResult<{ success: boolean } | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "disable2FA"))) {
    return response.tooManyRequests();
  }

  // 参数验证
  const validationError = validateData({ access_token, uid }, Disable2FASchema);
  if (validationError) return response.badRequest(validationError);

  // 身份验证 - 仅管理员可以操作
  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized({
      message: "需要管理员权限",
    });
  }

  try {
    // 检查是否尝试操作自己的账户
    if (uid === user.uid) {
      return response.badRequest({
        message: "不能关闭自己的2FA，请使用用户设置页面",
      });
    }

    // 查询目标用户
    const targetUser = await prisma.user.findUnique({
      where: { uid },
      select: {
        uid: true,
        username: true,
        totpSecret: true,
        totpBackupCodes: true,
      },
    });

    if (!targetUser) {
      return response.badRequest({
        message: "用户不存在",
      });
    }

    if (!targetUser.totpSecret) {
      return response.badRequest({
        message: "该用户未启用2FA",
      });
    }

    // 清除2FA相关字段
    await prisma.user.update({
      where: { uid },
      data: {
        totpSecret: null,
        totpBackupCodes: null as unknown as Prisma.InputJsonValue,
      },
    });

    // 获取客户端信息用于审计日志
    const clientIP = await getClientIP();
    const clientUserAgent = await getClientUserAgent();

    // 记录审计日志（after 钩子）
    const { after } = await import("next/server");
    after(async () => {
      try {
        await logAuditEvent({
          user: {
            uid: String(user.uid),
            ipAddress: clientIP,
            userAgent: clientUserAgent,
          },
          details: {
            action: "DISABLE_2FA",
            resourceType: "USER",
            resourceId: String(uid),
            vaule: {
              old: { hasTwoFactor: true },
              new: { hasTwoFactor: false },
            },
            description: `管理员关闭用户 ${targetUser.username} (UID: ${uid}) 的两步验证`,
          },
        });
      } catch (error) {
        console.error("Failed to log audit event:", error);
      }
    });

    return response.ok({
      data: { success: true },
    });
  } catch (error) {
    console.error("Disable 2FA error:", error);
    return response.serverError({
      message: "操作失败，请稍后重试",
    });
  }
}

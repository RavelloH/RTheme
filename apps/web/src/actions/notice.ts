"use server";

import { NextResponse, after } from "next/server";
import { cookies, headers } from "next/headers";
import prisma from "@/lib/server/prisma";
import { authVerify } from "@/lib/server/auth-verify";
import { revalidatePath } from "next/cache";
import ResponseBuilder from "@/lib/server/response";
import limitControl from "@/lib/server/rate-limit";
import { validateData } from "@/lib/server/validator";
import { getClientIP, getClientUserAgent } from "@/lib/server/get-client-info";
import { AccessTokenPayload, jwtTokenVerify } from "@/lib/server/jwt";
import { ApiResponse, ApiResponseData } from "@repo/shared-types/api/common";
import {
  MarkNoticesAsReadSchema,
  GetNoticesSuccessResponse,
  MarkNoticesAsReadSuccessResponse,
  MarkAllNoticesAsReadSuccessResponse,
  GetUnreadNoticeCountSuccessResponse,
} from "@repo/shared-types/api/notice";
import { publishNoticeToUser } from "@/lib/server/ably";

type NoticeActionEnvironment = "serverless" | "serveraction";
type NoticeActionConfig = { environment?: NoticeActionEnvironment };
type ActionResult<T extends ApiResponseData> =
  | NextResponse<ApiResponse<T>>
  | ApiResponse<T>;

/**
 * 获取当前用户的通知列表
 * @param readLimit - 已读通知的数量限制，默认 10 条
 */
export async function getNotices(
  readLimit: number,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<GetNoticesSuccessResponse["data"]>>>;
export async function getNotices(
  readLimit?: number,
  serverConfig?: NoticeActionConfig,
): Promise<ApiResponse<GetNoticesSuccessResponse["data"]>>;
export async function getNotices(
  readLimit?: number | NoticeActionConfig,
  serverConfig?: NoticeActionConfig,
): Promise<ActionResult<GetNoticesSuccessResponse["data"] | null>> {
  // 处理参数重载
  let actualReadLimit = 10;
  let actualServerConfig = serverConfig;
  if (typeof readLimit === "object") {
    actualServerConfig = readLimit;
  } else if (typeof readLimit === "number") {
    actualReadLimit = readLimit;
  }

  const response = new ResponseBuilder(
    actualServerConfig?.environment || "serveraction",
  );

  // 速率控制
  if (!(await limitControl(await headers(), "getNotices"))) {
    return response.tooManyRequests();
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ACCESS_TOKEN")?.value;
    const user = await authVerify({
      allowedRoles: ["USER", "ADMIN", "EDITOR", "AUTHOR"],
      accessToken: token,
    });

    if (!user) {
      return response.unauthorized({
        message: "未登录",
      });
    }

    // 获取所有未读通知
    const unreadNotices = await prisma.notice.findMany({
      where: {
        userUid: user.uid,
        isRead: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 获取已读通知（分页）
    const readNotices = await prisma.notice.findMany({
      where: {
        userUid: user.uid,
        isRead: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: actualReadLimit,
    });

    // 获取总数
    const totalReadCount = await prisma.notice.count({
      where: {
        userUid: user.uid,
        isRead: true,
      },
    });

    return response.ok({
      message: "获取通知成功",
      data: {
        unread: unreadNotices,
        read: readNotices,
        total: unreadNotices.length + totalReadCount,
        unreadCount: unreadNotices.length,
        hasMoreRead: readNotices.length < totalReadCount,
      },
    }) as unknown as ActionResult<GetNoticesSuccessResponse["data"] | null>;
  } catch (error) {
    console.error("获取通知失败:", error);
    return response.serverError({
      message: "获取通知失败",
      error: {
        code: "SERVER_ERROR",
        message: error instanceof Error ? error.message : "获取通知失败",
      },
    });
  }
}

/**
 * 获取更多已读通知（用于分页加载）
 * @param skip - 跳过的记录数
 * @param limit - 获取的记录数，默认 10 条
 */
export async function getReadNotices(
  skip: number,
  limit: number,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<GetNoticesSuccessResponse["data"]>>>;
export async function getReadNotices(
  skip: number,
  limit?: number,
  serverConfig?: NoticeActionConfig,
): Promise<ApiResponse<GetNoticesSuccessResponse["data"]>>;
export async function getReadNotices(
  skip: number,
  limit?: number | NoticeActionConfig,
  serverConfig?: NoticeActionConfig,
): Promise<ActionResult<GetNoticesSuccessResponse["data"] | null>> {
  // 处理参数重载
  let actualLimit = 10;
  let actualServerConfig = serverConfig;
  if (typeof limit === "object") {
    actualServerConfig = limit;
  } else if (typeof limit === "number") {
    actualLimit = limit;
  }

  const response = new ResponseBuilder(
    actualServerConfig?.environment || "serveraction",
  );

  // 速率控制
  if (!(await limitControl(await headers(), "getReadNotices"))) {
    return response.tooManyRequests();
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ACCESS_TOKEN")?.value;
    const user = await authVerify({
      allowedRoles: ["USER", "ADMIN", "EDITOR", "AUTHOR"],
      accessToken: token,
    });

    if (!user) {
      return response.unauthorized({
        message: "未登录",
      });
    }

    // 获取已读通知（分页）
    const readNotices = await prisma.notice.findMany({
      where: {
        userUid: user.uid,
        isRead: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: actualLimit,
    });

    // 获取总数
    const totalReadCount = await prisma.notice.count({
      where: {
        userUid: user.uid,
        isRead: true,
      },
    });

    return response.ok({
      message: "获取已读通知成功",
      data: {
        unread: [],
        read: readNotices,
        total: totalReadCount,
        unreadCount: 0,
        hasMoreRead: skip + readNotices.length < totalReadCount,
      },
    }) as unknown as ActionResult<GetNoticesSuccessResponse["data"] | null>;
  } catch (error) {
    console.error("获取已读通知失败:", error);
    return response.serverError({
      message: "获取已读通知失败",
      error: {
        code: "SERVER_ERROR",
        message: error instanceof Error ? error.message : "获取已读通知失败",
      },
    });
  }
}

/**
 * 标记通知为已读
 */
export async function markNoticesAsRead(
  noticeIds: string[],
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<MarkNoticesAsReadSuccessResponse["data"]>>>;
export async function markNoticesAsRead(
  noticeIds: string[],
  serverConfig?: NoticeActionConfig,
): Promise<ApiResponse<MarkNoticesAsReadSuccessResponse["data"]>>;
export async function markNoticesAsRead(
  noticeIds: string[],
  serverConfig?: NoticeActionConfig,
): Promise<ActionResult<MarkNoticesAsReadSuccessResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  // 速率控制
  if (!(await limitControl(await headers(), "markNoticesAsRead"))) {
    return response.tooManyRequests();
  }

  // 验证输入
  const validationError = validateData({ noticeIds }, MarkNoticesAsReadSchema);
  if (validationError) return response.badRequest(validationError);

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ACCESS_TOKEN")?.value || "";
    const decoded = jwtTokenVerify<AccessTokenPayload>(token);

    if (!decoded) {
      return response.unauthorized({
        message: "未登录",
      });
    }

    const { uid } = decoded;

    // 更新通知状态
    const result = await prisma.notice.updateMany({
      where: {
        id: {
          in: noticeIds,
        },
        userUid: uid, // 确保只能标记自己的通知
      },
      data: {
        isRead: true,
      },
    });

    // 推送未读数量更新
    if (result.count > 0) {
      const unreadCount = await prisma.notice.count({
        where: {
          userUid: uid,
          isRead: false,
        },
      });

      await publishNoticeToUser(uid, {
        type: "unread_count_update",
        payload: {
          count: unreadCount,
        },
      });
    }

    // 获取客户端信息用于审计日志
    const clientIP = await getClientIP();
    const clientUserAgent = await getClientUserAgent();

    // 记录审计日志
    if (result.count > 0) {
      after(async () => {
        try {
          await prisma.auditLog.create({
            data: {
              action: "UPDATE",
              resource: "Notice",
              resourceId: noticeIds.join(","),
              userUid: uid,
              ipAddress: clientIP,
              userAgent: clientUserAgent,
              description: `标记 ${result.count} 条通知为已读`,
              metadata: {
                noticeIds,
                count: result.count,
              },
            },
          });
        } catch (error) {
          console.error("Failed to create audit log:", error);
        }
      });
    }

    revalidatePath("/notifications");

    return response.ok({
      message: `已标记 ${result.count} 条通知为已读`,
      data: {
        message: `已标记 ${result.count} 条通知为已读`,
      },
    }) as unknown as ActionResult<
      MarkNoticesAsReadSuccessResponse["data"] | null
    >;
  } catch (error) {
    console.error("标记通知失败:", error);
    return response.serverError({
      message: "标记通知失败",
      error: {
        code: "SERVER_ERROR",
        message: error instanceof Error ? error.message : "标记通知失败",
      },
    });
  }
}

/**
 * 标记所有通知为已读
 */
export async function markAllNoticesAsRead(serverConfig: {
  environment: "serverless";
}): Promise<
  NextResponse<ApiResponse<MarkAllNoticesAsReadSuccessResponse["data"]>>
>;
export async function markAllNoticesAsRead(
  serverConfig?: NoticeActionConfig,
): Promise<ApiResponse<MarkAllNoticesAsReadSuccessResponse["data"]>>;
export async function markAllNoticesAsRead(
  serverConfig?: NoticeActionConfig,
): Promise<ActionResult<MarkAllNoticesAsReadSuccessResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  // 速率控制
  if (!(await limitControl(await headers(), "markAllNoticesAsRead"))) {
    return response.tooManyRequests();
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ACCESS_TOKEN")?.value || "";
    const decoded = jwtTokenVerify<AccessTokenPayload>(token);

    if (!decoded) {
      return response.unauthorized({
        message: "未登录",
      });
    }

    const { uid } = decoded;

    const result = await prisma.notice.updateMany({
      where: {
        userUid: uid,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    // 推送未读数量更新（标记全部已读后，未读数量为 0）
    if (result.count > 0) {
      await publishNoticeToUser(uid, {
        type: "unread_count_update",
        payload: {
          count: 0,
        },
      });
    }

    // 获取客户端信息用于审计日志
    const clientIP = await getClientIP();
    const clientUserAgent = await getClientUserAgent();

    // 记录审计日志
    if (result.count > 0) {
      after(async () => {
        try {
          await prisma.auditLog.create({
            data: {
              action: "UPDATE",
              resource: "Notice",
              resourceId: "all",
              userUid: uid,
              ipAddress: clientIP,
              userAgent: clientUserAgent,
              description: `标记所有通知为已读 (${result.count} 条)`,
              metadata: {
                count: result.count,
              },
            },
          });
        } catch (error) {
          console.error("Failed to create audit log:", error);
        }
      });
    }

    revalidatePath("/notifications");

    return response.ok({
      message: `已标记 ${result.count} 条通知为已读`,
      data: {
        message: `已标记 ${result.count} 条通知为已读`,
      },
    }) as unknown as ActionResult<
      MarkAllNoticesAsReadSuccessResponse["data"] | null
    >;
  } catch (error) {
    console.error("标记所有通知失败:", error);
    return response.serverError({
      message: "标记所有通知失败",
      error: {
        code: "SERVER_ERROR",
        message: error instanceof Error ? error.message : "标记所有通知失败",
      },
    });
  }
}

/**
 * 获取未读通知数量
 */
export async function getUnreadNoticeCount(serverConfig: {
  environment: "serverless";
}): Promise<
  NextResponse<ApiResponse<GetUnreadNoticeCountSuccessResponse["data"]>>
>;
export async function getUnreadNoticeCount(
  serverConfig?: NoticeActionConfig,
): Promise<ApiResponse<GetUnreadNoticeCountSuccessResponse["data"]>>;
export async function getUnreadNoticeCount(
  serverConfig?: NoticeActionConfig,
): Promise<ActionResult<GetUnreadNoticeCountSuccessResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  // 速率控制
  if (!(await limitControl(await headers(), "getUnreadNoticeCount"))) {
    return response.tooManyRequests();
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ACCESS_TOKEN")?.value;
    const user = await authVerify({
      allowedRoles: ["USER", "ADMIN", "EDITOR", "AUTHOR"],
      accessToken: token,
    });

    if (!user) {
      return response.unauthorized({
        message: "未登录",
      });
    }

    const count = await prisma.notice.count({
      where: {
        userUid: user.uid,
        isRead: false,
      },
    });

    // 查询私信未读数：汇总所有私聊对话的 unreadCount
    const messageUnreadResult = await prisma.conversationParticipant.aggregate({
      where: {
        userUid: user.uid,
      },
      _sum: {
        unreadCount: true,
      },
    });

    const messageCount = messageUnreadResult._sum?.unreadCount || 0;

    return response.ok({
      message: "获取未读通知数量成功",
      data: {
        count,
        messageCount,
      },
    }) as unknown as ActionResult<
      GetUnreadNoticeCountSuccessResponse["data"] | null
    >;
  } catch (error) {
    console.error("获取未读通知数量失败:", error);
    return response.serverError({
      message: "获取未读通知数量失败",
      error: {
        code: "SERVER_ERROR",
        message:
          error instanceof Error ? error.message : "获取未读通知数量失败",
      },
    });
  }
}

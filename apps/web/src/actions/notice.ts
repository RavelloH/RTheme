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

type NoticeActionEnvironment = "serverless" | "serveraction";
type NoticeActionConfig = { environment?: NoticeActionEnvironment };
type ActionResult<T extends ApiResponseData> =
  | NextResponse<ApiResponse<T>>
  | ApiResponse<T>;

/**
 * 获取当前用户的通知列表
 */
export async function getNotices(serverConfig: {
  environment: "serverless";
}): Promise<NextResponse<ApiResponse<GetNoticesSuccessResponse["data"]>>>;
export async function getNotices(
  serverConfig?: NoticeActionConfig,
): Promise<ApiResponse<GetNoticesSuccessResponse["data"]>>;
export async function getNotices(
  serverConfig?: NoticeActionConfig,
): Promise<ActionResult<GetNoticesSuccessResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
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

    const notices = await prisma.notice.findMany({
      where: {
        userUid: user.uid,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100, // 限制最多返回 100 条
    });

    // 分离未读和已读通知
    const unreadNotices = notices.filter((n) => !n.isRead);
    const readNotices = notices.filter((n) => n.isRead);

    return response.ok({
      message: "获取通知成功",
      data: {
        unread: unreadNotices,
        read: readNotices,
        total: notices.length,
        unreadCount: unreadNotices.length,
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

    return response.ok({
      message: "获取未读通知数量成功",
      data: {
        count,
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

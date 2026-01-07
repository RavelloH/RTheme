import "server-only";

import * as Ably from "ably";
import { getAblyApiKey } from "./ably-config";

/**
 * Ably 服务端客户端单例
 */
let ablyServerClient: Ably.Rest | null = null;

/**
 * 获取 Ably 服务端客户端实例
 *
 * 使用单例模式，避免重复创建客户端
 *
 * @returns Ably Rest 客户端实例，如果未配置则返回 null
 */
export const getAblyServerClient = async (): Promise<Ably.Rest | null> => {
  const apiKey = await getAblyApiKey();

  if (!apiKey) {
    return null;
  }

  if (!ablyServerClient) {
    ablyServerClient = new Ably.Rest({ key: apiKey });
  }

  return ablyServerClient;
};

/**
 * 通知类型定义
 */
export type NotificationType =
  | "new_comment" // 新评论
  | "comment_reply" // 评论回复
  | "post_status_changed" // 文章状态变更
  | "system_notice" // 系统通知
  | "unread_count_update" // 未读数更新
  | "new_notice" // 新通知
  | "new_private_message"; // 新私信

/**
 * 未读数更新 payload
 */
export interface UnreadCountUpdatePayload {
  count: number;
  noticeId?: string;
  title?: string;
}

/**
 * 新通知 payload（包含完整通知信息）
 */
export interface NewNoticePayload {
  id: string;
  title: string;
  content: string;
  link: string | null;
  createdAt: string;
  count: number; // 当前未读总数
}

/**
 * 新私信 payload（包含完整消息信息）
 */
export interface NewPrivateMessagePayload {
  conversationId: string;
  message: {
    id: string;
    content: string;
    type: "TEXT" | "SYSTEM";
    senderUid: number;
    createdAt: string;
  };
  sender: {
    uid: number;
    username: string;
    nickname: string | null;
  };
  messageCount: number; // 接收者的私信未读总数
}

/**
 * 通知数据接口
 */
export interface NotificationData {
  type: NotificationType;
  payload:
    | UnreadCountUpdatePayload
    | NewNoticePayload
    | NewPrivateMessagePayload
    | Record<string, unknown>;
}

/**
 * 向指定用户推送通知
 *
 * 通过 Ably 实时推送通知到用户的 WebSocket 连接。
 * 如果 Ably 未配置或推送失败，会静默失败并记录日志。
 *
 * @param userUid - 目标用户的 UID
 * @param data - 通知数据（类型 + 载荷）
 * @returns 推送是否成功
 *
 * @example
 * ```typescript
 * await publishNoticeToUser(123, {
 *   type: "unread_count_update",
 *   payload: {
 *     count: 5,
 *     noticeId: "notice-123",
 *   },
 * });
 * ```
 */
export const publishNoticeToUser = async (
  userUid: number,
  data: NotificationData,
): Promise<boolean> => {
  const client = await getAblyServerClient();
  if (!client) {
    console.warn("[Ably] Client not available, skipping push");
    return false;
  }

  try {
    const channel = client.channels.get(`user:${userUid}`);
    await channel.publish("notification", data);
    console.log(`[Ably] Notification pushed to user:${userUid}`, data.type);
    return true;
  } catch (error) {
    console.error("[Ably] Failed to publish notification:", error);
    return false;
  }
};

/**
 * 向多个用户批量推送通知
 *
 * @param userUids - 目标用户 UID 数组
 * @param data - 通知数据
 * @returns 推送成功的用户数量
 */
export const publishNoticeToUsers = async (
  userUids: number[],
  data: NotificationData,
): Promise<number> => {
  const results = await Promise.allSettled(
    userUids.map((uid) => publishNoticeToUser(uid, data)),
  );

  const successCount = results.filter(
    (result) => result.status === "fulfilled" && result.value === true,
  ).length;

  console.log(
    `[Ably] Batch push completed: ${successCount}/${userUids.length} succeeded`,
  );

  return successCount;
};

/**
 * 检查用户是否在线（通过 Ably Presence API）
 *
 * 使用 Ably 的 Presence 功能实时检测用户是否有活跃的 WebSocket 连接。
 * 这比基于 RefreshToken 的检测更精准，因为它反映的是真实的连接状态。
 *
 * @param userUid - 用户的 UID
 * @returns Promise<boolean> - 用户是否在线（true = 在线，false = 离线或检测失败）
 *
 * @example
 * ```typescript
 * const isOnline = await checkUserOnlineStatus(123);
 * if (isOnline) {
 *   console.log("用户在线，跳过邮件通知");
 * } else {
 *   console.log("用户离线，发送邮件通知");
 * }
 * ```
 */
export const checkUserOnlineStatus = async (
  userUid: number,
): Promise<boolean> => {
  const client = await getAblyServerClient();
  if (!client) {
    console.warn(
      "[Ably] Client not available, cannot check presence, assuming offline",
    );
    return false;
  }

  try {
    const channel = client.channels.get(`user:${userUid}`);
    const presenceResult = await channel.presence.get();

    // 检查是否有任何成员在线
    // presenceResult 是 PaginatedResult<PresenceMessage>，需要访问 items 属性
    const presenceMembers = presenceResult.items || [];
    const isOnline = presenceMembers.length > 0;

    console.log(
      `[Ably] User ${userUid} online status: ${isOnline ? "ONLINE" : "OFFLINE"} (${presenceMembers.length} presence members)`,
    );

    return isOnline;
  } catch (error) {
    console.error(
      `[Ably] Failed to check presence for user ${userUid}:`,
      error,
    );
    // 检测失败时返回 false，降级到其他检测方式
    return false;
  }
};

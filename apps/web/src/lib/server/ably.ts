import "server-only";

import * as Ably from "ably";
import { ablyConfig } from "./ably-config";

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
export const getAblyServerClient = (): Ably.Rest | null => {
  if (!ablyConfig.apiKey) {
    return null;
  }

  if (!ablyServerClient) {
    ablyServerClient = new Ably.Rest({ key: ablyConfig.apiKey });
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
  | "unread_count_update"; // 未读数更新

/**
 * 通知数据接口
 */
export interface NotificationData {
  type: NotificationType;
  payload: Record<string, unknown>;
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
  const client = getAblyServerClient();
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

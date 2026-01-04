import "server-only";
import webpush from "web-push";
import prisma from "./prisma";
import { getConfig } from "./config-cache";

/**
 * 初始化 VAPID 配置
 *
 * @returns 是否成功初始化
 */
export async function initWebPush(): Promise<boolean> {
  try {
    const vapidKeys =
      (await getConfig<{
        publicKey?: string;
        privateKey?: string;
      }>("notice.webPush.vapidKeys")) || {};
    const siteUrl = (await getConfig<string>("site.url")) || "";

    if (vapidKeys?.publicKey && vapidKeys?.privateKey) {
      let vapidSubject = siteUrl;
      if (!vapidSubject || vapidSubject.startsWith("http://")) {
        vapidSubject = "mailto:noreply@example.com";
      }

      webpush.setVapidDetails(
        vapidSubject,
        vapidKeys.publicKey,
        vapidKeys.privateKey,
      );
      return true;
    }

    console.warn("[WebPush] VAPID keys not configured");
    return false;
  } catch (error) {
    console.error("[WebPush] Failed to initialize:", error);
    return false;
  }
}

/**
 * 发送 Web Push 到单个订阅
 *
 * @param subscription - 订阅信息
 * @param payload - 推送内容
 * @returns 是否发送成功
 */
export async function sendWebPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: Record<string, unknown>;
  },
): Promise<boolean> {
  if (!(await initWebPush())) {
    return false;
  }

  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    await webpush.sendNotification(pushSubscription, JSON.stringify(payload), {
      TTL: 86400, // 24 小时有效期
    });

    // 更新最后使用时间
    await prisma.pushSubscription
      .update({
        where: { endpoint: subscription.endpoint },
        data: { lastUsedAt: new Date() },
      })
      .catch((error) => {
        console.warn(
          "[WebPush] Failed to update lastUsedAt:",
          error.message || error,
        );
      });

    console.log(
      `[WebPush] Notification sent to ${subscription.endpoint.substring(0, 50)}...`,
    );
    return true;
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    console.error(
      "[WebPush] Send failed:",
      err.message || "Unknown error",
      err.statusCode,
    );

    // 处理过期/无效的订阅
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log(
        `[WebPush] Subscription expired or invalid, marking as inactive`,
      );
      await prisma.pushSubscription
        .update({
          where: { endpoint: subscription.endpoint },
          data: { isActive: false },
        })
        .catch((updateError) => {
          console.warn(
            "[WebPush] Failed to mark subscription as inactive:",
            updateError,
          );
        });
    }

    return false;
  }
}

/**
 * 向用户的所有设备发送 Web Push
 *
 * @param userUid - 用户 UID
 * @param payload - 推送内容
 * @returns 发送结果统计
 */
export async function sendWebPushToUser(
  userUid: number,
  payload: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    data?: Record<string, unknown>;
  },
): Promise<{ success: number; failed: number }> {
  try {
    // 获取用户启用的订阅
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userUid,
        isActive: true,
      },
    });

    if (subscriptions.length === 0) {
      console.log(`[WebPush] No active subscriptions for user ${userUid}`);
      return { success: 0, failed: 0 };
    }

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        sendWebPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
        ),
      ),
    );

    const success = results.filter(
      (r) => r.status === "fulfilled" && r.value,
    ).length;
    const failed = results.length - success;

    console.log(
      `[WebPush] Sent to user ${userUid}: ${success} success, ${failed} failed`,
    );

    return { success, failed };
  } catch (error) {
    console.error(
      `[WebPush] Failed to send to user ${userUid}:`,
      error instanceof Error ? error.message : error,
    );
    return { success: 0, failed: 0 };
  }
}

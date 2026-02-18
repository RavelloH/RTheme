import NotificationEmail, {
  type NotificationType,
} from "@/emails/templates/NotificationEmail";
import { renderEmail } from "@/emails/utils";
import { checkUserOnlineStatus, publishNoticeToUser } from "@/lib/server/ably";
import { isAblyEnabled } from "@/lib/server/ably-config";
import { getConfig } from "@/lib/server/config-cache";
import { sendEmail } from "@/lib/server/email";
import { jwtTokenSign } from "@/lib/server/jwt";
import prisma from "@/lib/server/prisma";
import { sendWebPushToUser } from "@/lib/server/web-push";

/**
 * 通知选项
 */
export interface SendNoticeOptions {
  /**
   * 是否为测试通知
   * 如果为 true，无论用户是否在线，都会发送 Web Push
   */
  isTest?: boolean;
  /**
   * 通知类型
   */
  type?: NotificationType;
  /**
   * 发送者名称（仅当 type="message" 时使用）
   */
  senderName?: string;
  /**
   * 是否跳过邮件发送（仅发送站内通知与 Web Push）
   */
  skipEmail?: boolean;
}

/**
 * 发送通知
 * @param userUid 接收用户的 UID
 * @param title 通知标题
 * @param content 通知内容（正文）
 * @param link 可选的跳转链接
 * @param options 通知选项
 */
export async function sendNotice(
  userUid: number,
  title: string,
  content: string,
  link?: string,
  options?: SendNoticeOptions,
): Promise<void> {
  // 检查全局通知是否启用
  const noticeConfig = await getConfig("notice.enable");
  if (!noticeConfig) {
    return;
  }

  // 获取用户信息
  const user = await prisma.user.findUnique({
    where: { uid: userUid },
    select: {
      email: true,
      username: true,
      emailVerified: true,
    },
  });

  if (!user) {
    throw new Error(`用户不存在: ${userUid}`);
  }

  // 创建站内通知记录
  const notice = await prisma.notice.create({
    data: {
      userUid,
      title,
      content,
      link: link || null,
      isRead: false,
    },
  });

  // 推送实时通知（WebSocket）
  // 获取未读通知数量
  const unreadCount = await prisma.notice.count({
    where: {
      userUid,
      isRead: false,
    },
  });

  // 通过 Ably 推送新通知（包含完整信息）
  await publishNoticeToUser(userUid, {
    type: "new_notice",
    payload: {
      id: notice.id,
      title: notice.title,
      content: notice.content,
      link: notice.link,
      createdAt: notice.createdAt.toISOString(),
      count: unreadCount,
    },
  });

  // 检查用户是否在线
  // 策略：如果 Ably 已启用，只信任 Ably Presence；否则降级到 RefreshToken
  let isUserOnline = false;
  const ablyEnabled = await isAblyEnabled();

  if (ablyEnabled) {
    // Ably 已启用：使用 Presence API（最可信，实时反映 WebSocket 连接状态）
    isUserOnline = await checkUserOnlineStatus(userUid);
    console.log(
      `[Notice] User ${userUid} online status via Ably Presence: ${isUserOnline ? "ONLINE" : "OFFLINE"}`,
    );
  } else {
    // Ably 未启用：降级到 RefreshToken 检测（兼容模式）
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const activeToken = await prisma.refreshToken.findFirst({
      where: {
        userUid,
        lastUsedAt: {
          gte: tenMinutesAgo,
        },
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        lastUsedAt: "desc",
      },
    });

    isUserOnline = Boolean(activeToken);
    console.log(
      `[Notice] User ${userUid} online status via RefreshToken (fallback): ${isUserOnline ? "ONLINE" : "OFFLINE"}`,
    );
  }

  // Web Push 推送逻辑
  const webPushEnabled = await getConfig("notice.webPush.enable");

  if (webPushEnabled) {
    // 决定是否发送 Web Push
    // 如果是测试通知，无论用户是否在线都发送 Web Push
    const shouldSendWebPush = options?.isTest || !isUserOnline || !ablyEnabled;

    if (shouldSendWebPush) {
      const siteUrl = await getConfig("site.url");
      const reason = options?.isTest
        ? "test notification"
        : `online: ${isUserOnline}, ably: ${ablyEnabled}`;

      console.log(`[Notice] Sending Web Push to user ${userUid} (${reason})`);

      // 异步发送 Web Push，不阻塞主流程
      sendWebPushToUser(userUid, {
        title: notice.title,
        body: notice.content,
        icon: `${siteUrl}/icon/192x`,
        badge: `${siteUrl}/icon/72x`,
        data: {
          url: notice.link || siteUrl,
          noticeId: notice.id,
          isTest: options?.isTest || false, // 标记是否为测试通知
        },
      }).catch((error) => {
        console.error(
          `[Notice] Failed to send Web Push to user ${userUid}:`,
          error,
        );
      });
    } else {
      console.log(
        `[Notice] Skipping Web Push for user ${userUid} (will be handled by client)`,
      );
    }
  }

  if (options?.skipEmail) {
    return;
  }

  // 如果用户在线，不发送邮件
  if (isUserOnline) {
    console.log(
      `[Notice] User ${userUid} is online, skipping email notification`,
    );
    return;
  }

  console.log(
    `[Notice] User ${userUid} is offline, proceeding with email notification`,
  );

  // TODO: 未来需要检查用户的 emailNotice 字段，允许用户控制是否接收邮件通知
  // if (!user.emailNotice) {
  //   return;
  // }

  // 如果用户邮箱未验证，不发送邮件
  if (!user.emailVerified) {
    return;
  }

  // 生成 JWT 重定向令牌 (7天有效期)
  const redirectToken = jwtTokenSign({
    inner: {
      noticeId: notice.id,
      userUid,
    },
    expired: "7d",
  });

  // 构建重定向链接
  const siteUrl = await getConfig("site.url");
  const siteName = await getConfig("site.title");
  const redirectUrl = `${siteUrl}/r/${redirectToken}`;

  // 渲染邮件模板
  const emailComponent = NotificationEmail({
    username: user.username,
    title,
    content,
    link: link ? redirectUrl : undefined,
    siteName,
    siteUrl,
    type: options?.type || "general",
    senderName: options?.senderName,
  });

  const { html, text } = await renderEmail(emailComponent);

  // 使用 title 作为邮件标题
  const emailSubject = title || "您有一条新通知";

  // 发送邮件通知
  await sendEmail({
    to: user.email,
    subject: emailSubject,
    html,
    text,
  });
}

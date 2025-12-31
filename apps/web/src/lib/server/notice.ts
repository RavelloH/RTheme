import { getConfig } from "@/lib/server/config-cache";
import { sendEmail } from "@/lib/server/email";
import { jwtTokenSign } from "@/lib/server/jwt";
import prisma from "@/lib/server/prisma";
import { renderEmail } from "@/emails/utils";
import NotificationEmail from "@/emails/templates/NotificationEmail";

/**
 * 发送通知
 * @param userUid 接收用户的 UID
 * @param content 通知内容
 * @param link 可选的跳转链接
 */
export async function sendNotice(
  userUid: number,
  content: string,
  link?: string,
): Promise<void> {
  // 检查全局通知是否启用
  const noticeConfig = await getConfig<{ enable: boolean }>("notice.enable");
  if (!noticeConfig?.enable) {
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
      content,
      link: link || null,
      isRead: false,
    },
  });

  // 检查用户是否在线 (最近10分钟内有活跃的 RefreshToken)
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

  // 如果用户在线，不发送邮件
  if (activeToken) {
    return;
  }

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const redirectUrl = `${siteUrl}/r/${redirectToken}`;

  // 渲染邮件模板
  const emailComponent = NotificationEmail({
    username: user.username,
    content,
    link: link ? redirectUrl : undefined,
  });

  const { html, text } = await renderEmail(emailComponent);

  // 提取 content 的第一行作为邮件标题
  const emailSubject = content.split("\n")[0]?.trim() || "您有一条新通知";

  // 发送邮件通知
  await sendEmail({
    to: user.email,
    subject: emailSubject,
    html,
    text,
  });
}

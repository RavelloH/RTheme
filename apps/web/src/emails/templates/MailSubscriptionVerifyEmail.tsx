import * as React from "react";

import {
  EmailAlert,
  EmailButton,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "@/emails/components";

export interface MailSubscriptionVerifyEmailProps {
  email: string;
  confirmUrl: string;
  siteName?: string;
  siteUrl?: string;
  logoUrl?: string;
  primaryColor?: string;
}

export function MailSubscriptionVerifyEmail({
  email,
  confirmUrl,
  siteName = "NeutralPress",
  siteUrl = "https://example.com",
  logoUrl,
  primaryColor = "#2dd4bf",
}: MailSubscriptionVerifyEmailProps) {
  return (
    <EmailLayout
      preview={`请确认你在 ${siteName} 的邮件订阅`}
      siteName={siteName}
      siteUrl={siteUrl}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
    >
      <EmailHeading level={2}>确认邮件订阅</EmailHeading>

      <EmailParagraph>
        我们收到了来自 {email} 的邮件订阅请求。请点击下方按钮完成确认：
      </EmailParagraph>

      <EmailParagraph align="center">
        <EmailButton href={confirmUrl} primaryColor={primaryColor}>
          确认订阅
        </EmailButton>
      </EmailParagraph>

      <EmailParagraph variant="muted">
        如果这不是你的操作，请忽略此邮件。该链接会在 30 分钟后失效。
      </EmailParagraph>

      <EmailAlert variant="info">
        只有完成确认后，系统才会向你发送新文章通知。
      </EmailAlert>
    </EmailLayout>
  );
}

export default MailSubscriptionVerifyEmail;

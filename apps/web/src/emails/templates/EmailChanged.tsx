import * as React from "react";

import {
  EmailAlert,
  EmailCodeBlock,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "@/emails/components";

/**
 * 邮箱变更验证邮件模板属性
 */
export interface EmailChangedTemplateProps {
  /** 用户名 */
  username: string;
  /** 验证码 */
  verificationCode: string;
  /** 旧邮箱 */
  oldEmail: string;
  /** 新邮箱 */
  newEmail: string;
  /** 站点名称 */
  siteName?: string;
  /** 站点URL */
  siteUrl?: string;
  /** Logo URL */
  logoUrl?: string;
  /** 主题色 */
  primaryColor?: string;
}

/**
 * 邮箱变更验证邮件模板
 */
export function EmailChangedTemplate({
  username,
  verificationCode,
  oldEmail,
  newEmail,
  siteName = "NeutralPress",
  siteUrl = "https://example.com",
  logoUrl,
  primaryColor = "#2dd4bf",
}: EmailChangedTemplateProps) {
  const preview = `验证您在 ${siteName} 的新邮箱地址`;

  return (
    <EmailLayout
      preview={preview}
      siteName={siteName}
      siteUrl={siteUrl}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
    >
      <EmailHeading level={1}>验证您的新邮箱</EmailHeading>

      <EmailParagraph>您好 {username}，</EmailParagraph>

      <EmailParagraph>
        您正在将账户邮箱从 <strong>{oldEmail}</strong> 更改为{" "}
        <strong>{newEmail}</strong>。
      </EmailParagraph>

      <EmailParagraph>请使用以下验证码完成邮箱验证：</EmailParagraph>

      <EmailCodeBlock>{verificationCode}</EmailCodeBlock>

      <EmailAlert variant="info">
        此验证码将在 15 分钟后过期。如果您没有请求此操作，请忽略此邮件。
      </EmailAlert>

      <EmailParagraph>
        完成验证后，您将可以使用新邮箱地址登录和接收通知。
      </EmailParagraph>
    </EmailLayout>
  );
}

export default EmailChangedTemplate;

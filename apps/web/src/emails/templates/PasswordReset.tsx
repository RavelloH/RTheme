import * as React from "react";

import {
  EmailAlert,
  EmailButton,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "@/emails/components";

/**
 * 密码重置邮件模板属性
 */
export interface PasswordResetTemplateProps {
  /** 用户名或邮箱 */
  username: string;
  /** 重置链接 */
  resetUrl: string;
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
 * 密码重置邮件模板
 */
export function PasswordResetTemplate({
  username,
  resetUrl,
  siteName = "NeutralPress",
  siteUrl = "https://example.com",
  logoUrl,
  primaryColor = "#2dd4bf",
}: PasswordResetTemplateProps) {
  const preview = `重置您的 ${siteName} 账户密码`;

  return (
    <EmailLayout
      preview={preview}
      siteName={siteName}
      siteUrl={siteUrl}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
    >
      <EmailHeading level={1}>重置密码</EmailHeading>

      <EmailParagraph>您好 {username}，</EmailParagraph>

      <EmailParagraph>
        我们收到了重置您 {siteName} 账户密码的请求。
      </EmailParagraph>

      <EmailParagraph>请点击下方链接按钮以重置密码：</EmailParagraph>

      <EmailParagraph align="center">
        <EmailButton href={resetUrl} primaryColor={primaryColor}>
          重置密码
        </EmailButton>
      </EmailParagraph>

      <EmailAlert variant="warning">
        如果您没有请求重置密码，请忽略此邮件。您的密码将保持不变。
      </EmailAlert>

      <EmailParagraph variant="muted">
        为了您的账户安全，请不要将重置码分享给任何人。如果您怀疑账户存在安全问题，请立即联系我们。
      </EmailParagraph>
    </EmailLayout>
  );
}

export default PasswordResetTemplate;

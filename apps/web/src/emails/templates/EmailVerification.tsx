import * as React from "react";
import {
  EmailLayout,
  EmailHeading,
  EmailParagraph,
  EmailCodeBlock,
  EmailAlert,
} from "../components";

/**
 * 邮箱验证邮件模板属性
 */
export interface EmailVerificationTemplateProps {
  /** 用户名 */
  username: string;
  /** 验证码 */
  verificationCode: string;
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
 * 邮箱验证邮件模板
 */
export function EmailVerificationTemplate({
  username,
  verificationCode,
  siteName = "NeutralPress",
  siteUrl = "https://example.com",
  logoUrl,
  primaryColor = "#2dd4bf",
}: EmailVerificationTemplateProps) {
  const preview = `欢迎加入 ${siteName}！请验证您的邮箱地址`;

  return (
    <EmailLayout
      preview={preview}
      siteName={siteName}
      siteUrl={siteUrl}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
    >
      <EmailHeading level={1}>欢迎加入 {siteName}！</EmailHeading>

      <EmailParagraph>您好 {username}，</EmailParagraph>

      <EmailParagraph>
        感谢您注册 {siteName}
        ！为了确保您的账户安全，我们需要验证您的邮箱地址。
      </EmailParagraph>

      <EmailParagraph>
        请在验证页面输入以下验证码（验证码将在 15 分钟后失效）：
      </EmailParagraph>

      <EmailCodeBlock>{verificationCode}</EmailCodeBlock>

      <EmailAlert variant="info">
        如果您没有注册 {siteName} 账户，请忽略此邮件
      </EmailAlert>

      <EmailParagraph variant="muted" align="center">
        为了您的账户安全，请不要将验证码分享给任何人
      </EmailParagraph>
    </EmailLayout>
  );
}

export default EmailVerificationTemplate;

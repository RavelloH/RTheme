import * as React from "react";
import {
  EmailLayout,
  EmailHeading,
  EmailParagraph,
  EmailAlert,
} from "../components";

/**
 * 密码已修改通知邮件模板属性
 */
export interface PasswordChangedTemplateProps {
  /** 用户名 */
  username: string;
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
 * 密码已修改通知邮件模板
 */
export function PasswordChangedTemplate({
  username,
  siteName = "NeutralPress",
  siteUrl = "https://example.com",
  logoUrl,
  primaryColor = "#2dd4bf",
}: PasswordChangedTemplateProps) {
  const preview = `您在 ${siteName} 的密码已成功修改`;

  return (
    <EmailLayout
      preview={preview}
      siteName={siteName}
      siteUrl={siteUrl}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
    >
      <EmailHeading level={1}>密码已成功修改</EmailHeading>

      <EmailParagraph>您好 {username}，</EmailParagraph>

      <EmailParagraph>
        您在 {siteName} 的账户密码已成功修改。如果这是您本人操作，请忽略此邮件。
      </EmailParagraph>

      <EmailAlert variant="warning">
        如果您没有进行此操作，您的账户可能已被盗用。请立即联系我们的支持团队。
      </EmailAlert>

      <EmailParagraph>
        为了保护您的账户安全，我们建议您采取以下措施：
      </EmailParagraph>

      <EmailParagraph>
        • 使用强密码，包含大小写字母、数字和特殊字符
        <br />
        • 不要在多个网站使用相同的密码
        <br />
        • 定期更换密码
        <br />• 启用两步验证
      </EmailParagraph>
    </EmailLayout>
  );
}

export default PasswordChangedTemplate;

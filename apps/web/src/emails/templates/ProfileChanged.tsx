import * as React from "react";

import {
  EmailAlert,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "@/emails/components";

/**
 * 用户资料变更通知邮件模板属性
 */
export interface ProfileChangedTemplateProps {
  /** 用户名 */
  username: string;
  /** 变更的字段 */
  changedField: "username" | "email";
  /** 旧值 */
  oldValue: string;
  /** 新值 */
  newValue: string;
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
 * 用户资料变更通知邮件模板
 */
export function ProfileChangedTemplate({
  username,
  changedField,
  oldValue,
  newValue,
  siteName = "NeutralPress",
  siteUrl = "https://example.com",
  logoUrl,
  primaryColor = "#2dd4bf",
}: ProfileChangedTemplateProps) {
  const fieldNameMap = {
    username: "用户名",
    email: "邮箱",
  };

  const fieldName = fieldNameMap[changedField];
  const preview = `您在 ${siteName} 的${fieldName}已成功修改`;

  return (
    <EmailLayout
      preview={preview}
      siteName={siteName}
      siteUrl={siteUrl}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
    >
      <EmailHeading level={1}>账户{fieldName}已变更</EmailHeading>

      <EmailParagraph>您好 {username}，</EmailParagraph>

      <EmailParagraph>
        您在 {siteName} 的账户{fieldName}已成功变更：
      </EmailParagraph>

      <EmailParagraph>
        • 旧{fieldName}：{oldValue}
        <br />• 新{fieldName}：{newValue}
      </EmailParagraph>

      <EmailAlert variant="warning">
        如果这不是您本人的操作，您的账户可能已被盗用。请立即联系我们的支持团队。
      </EmailAlert>

      <EmailParagraph>
        为了保护您的账户安全，我们建议您定期检查账户活动并启用两步验证。
      </EmailParagraph>
    </EmailLayout>
  );
}

export default ProfileChangedTemplate;

import * as React from "react";
import {
  EmailLayout,
  EmailHeading,
  EmailParagraph,
  EmailButton,
  EmailAlert,
} from "../components";

/**
 * 通知邮件模板属性
 */
export interface NotificationEmailProps {
  /** 用户名 */
  username: string;
  /** 通知内容 */
  content: string;
  /** 可选的跳转链接 */
  link?: string;
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
 * 通知邮件模板
 */
export function NotificationEmail({
  username,
  content,
  link,
  siteName = "NeutralPress",
  siteUrl = "https://example.com",
  logoUrl,
  primaryColor = "#2dd4bf",
}: NotificationEmailProps) {
  // 拆分 content：第一行作为标题，其余作为正文
  const lines = content.split("\n");
  const title = lines[0]?.trim() || "";
  const body = lines.slice(1).join("\n").trim();

  const preview = title || `${siteName} - 您有一条新通知`;

  return (
    <EmailLayout
      preview={preview}
      siteName={siteName}
      siteUrl={siteUrl}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
    >
      <EmailHeading level={1}>新通知</EmailHeading>

      <EmailParagraph>您好 {username}，</EmailParagraph>

      <EmailParagraph>您在 {siteName} 收到一条新通知：</EmailParagraph>

      <EmailAlert variant="info">{title}</EmailAlert>

      {body && <EmailParagraph>{body}</EmailParagraph>}

      {link && (
        <>
          <EmailParagraph>请点击下方按钮查看详情：</EmailParagraph>

          <EmailParagraph align="center">
            <EmailButton href={link} primaryColor={primaryColor}>
              查看详情
            </EmailButton>
          </EmailParagraph>
        </>
      )}

      <EmailParagraph>
        您也可以访问{" "}
        <a
          href={`${siteUrl}/notifications`}
          style={{ color: primaryColor, textDecoration: "none" }}
        >
          通知中心
        </a>{" "}
        查看所有通知。
      </EmailParagraph>
    </EmailLayout>
  );
}

export default NotificationEmail;

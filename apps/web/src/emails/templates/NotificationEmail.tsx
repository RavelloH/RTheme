import * as React from "react";
import {
  EmailLayout,
  EmailParagraph,
  EmailButton,
  EmailAlert,
} from "../components";

/**
 * 通知类型
 */
export type NotificationType = "general" | "message";

/**
 * 通知邮件模板属性
 */
export interface NotificationEmailProps {
  /** 用户名 */
  username: string;
  /** 通知标题 */
  title: string;
  /** 通知内容（正文） */
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
  /** 通知类型 */
  type?: NotificationType;
  /** 发送者名称（仅当 type="message" 时使用） */
  senderName?: string;
}

/**
 * 通知邮件模板
 */
export function NotificationEmail({
  username,
  title,
  content,
  link,
  siteName = "NeutralPress",
  siteUrl = "https://example.com",
  logoUrl,
  primaryColor = "#2dd4bf",
  type = "general",
  senderName,
}: NotificationEmailProps) {
  // 邮件预览使用标题
  const preview = title || `${siteName} - 您有一条新通知`;

  // 将 content 按换行符拆分成段落
  const contentLines = content.split("\n").filter((line) => line.trim());

  // 根据通知类型生成不同的引导文字
  const introText =
    type === "message" && senderName
      ? `您在 ${siteName} 收到一条来自 ${senderName} 的私信：`
      : `您在 ${siteName} 收到一条新通知：`;

  return (
    <EmailLayout
      preview={preview}
      siteName={siteName}
      siteUrl={siteUrl}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
    >
      <EmailParagraph>您好 {username}，</EmailParagraph>

      <EmailParagraph>{introText}</EmailParagraph>

      {/* 显示正文内容，支持多段落 */}
      {contentLines.length > 0 && (
        <EmailAlert variant="info">
          {contentLines.map((line, index) => (
            <div key={index}>
              {line}
              {index < contentLines.length - 1 && <br />}
            </div>
          ))}
        </EmailAlert>
      )}

      {link && (
        <>
          <EmailParagraph>请点击下方按钮查看详情：</EmailParagraph>

          <EmailParagraph align="center">
            <EmailButton href={link} primaryColor={primaryColor}>
              {type === "message" ? "查看私信" : "查看详情"}
            </EmailButton>
          </EmailParagraph>
        </>
      )}

      <EmailParagraph>
        您也可以访问{" "}
        <a
          href={`${siteUrl}/${type === "message" ? "messages" : "notifications"}`}
          style={{ color: primaryColor, textDecoration: "none" }}
        >
          {type === "message" ? "私信中心" : "通知中心"}
        </a>{" "}
        查看所有{type === "message" ? "私信" : "通知"}。
      </EmailParagraph>
    </EmailLayout>
  );
}

export default NotificationEmail;

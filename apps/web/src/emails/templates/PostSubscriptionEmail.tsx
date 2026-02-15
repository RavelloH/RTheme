import * as React from "react";
import { Img } from "@react-email/components";

import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
} from "@/emails/components";

export interface PostSubscriptionEmailProps {
  postTitle: string;
  postExcerpt: string;
  postUrl: string;
  unsubscribeUrl: string;
  coverImageUrl?: string;
  siteName?: string;
  siteUrl?: string;
  logoUrl?: string;
  primaryColor?: string;
}

export function PostSubscriptionEmail({
  postTitle,
  postExcerpt,
  postUrl,
  unsubscribeUrl,
  coverImageUrl,
  siteName = "NeutralPress",
  siteUrl = "https://example.com",
  logoUrl,
  primaryColor = "#2dd4bf",
}: PostSubscriptionEmailProps) {
  return (
    <EmailLayout
      preview={`${siteName} 发布了新文章：${postTitle}`}
      siteName={siteName}
      siteUrl={siteUrl}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
    >
      <EmailHeading level={2} align="left">
        {postTitle}
      </EmailHeading>

      {coverImageUrl ? (
        <Img
          src={coverImageUrl}
          alt={postTitle}
          width="520"
          className="w-full h-auto rounded-sm mb-4"
        />
      ) : null}

      <EmailParagraph>{postExcerpt}</EmailParagraph>

      <EmailParagraph align="center">
        <EmailButton href={postUrl} primaryColor={primaryColor}>
          阅读全文
        </EmailButton>
      </EmailParagraph>

      <EmailParagraph variant="muted">
        你收到此邮件是因为你订阅了 {siteName} 的文章更新。
      </EmailParagraph>

      <EmailParagraph variant="muted">
        如不再希望接收通知，可点击{" "}
        <a
          href={unsubscribeUrl}
          style={{ color: primaryColor, textDecoration: "none" }}
        >
          取消订阅
        </a>
        。
      </EmailParagraph>
    </EmailLayout>
  );
}

export default PostSubscriptionEmail;

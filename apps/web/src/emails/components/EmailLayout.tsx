import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";
import * as React from "react";

/**
 * 邮件布局配置接口
 */
export interface EmailLayoutProps {
  /** 邮件预览文本（在邮件客户端列表中显示） */
  preview: string;
  /** 邮件主要内容 */
  children: React.ReactNode;
  /** 站点名称（默认：NeutralPress） */
  siteName?: string;
  /** 站点URL（用于logo链接） */
  siteUrl?: string;
  /** 站点Logo URL */
  logoUrl?: string;
  /** 主题色（默认：#2dd4bf） */
  primaryColor?: string;
  /** 页脚内容（可选） */
  footerContent?: React.ReactNode;
}

/**
 * 邮件标准布局组件 - NeutralUI 设计系统
 * 使用 Tailwind CSS 类名，自动转换为内联样式以兼容邮件客户端
 */
export function EmailLayout({
  preview,
  children,
  siteName = "NeutralPress",
  siteUrl = "https://example.com",
  logoUrl,
  primaryColor: _primaryColor = "#2dd4bf",
  footerContent,
}: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind
        config={{
          theme: {
            extend: {
              colors: {
                primary: "#2dd4bf",
                foreground: "#111111",
                muted: "#666666",
              },
            },
          },
        }}
      >
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto max-w-[600px] bg-white border border-gray-200">
            {/* 邮件头部 - Logo 和站点名称 */}
            <Section className="text-center border-b border-gray-200">
              {logoUrl ? (
                <Img
                  src={logoUrl}
                  alt={siteName}
                  width="120"
                  className="mx-auto"
                />
              ) : (
                <Text className="text-2xl font-bold text-foreground tracking-wider bg-primary py-12 px-0 m-0">
                  {siteName}
                </Text>
              )}
            </Section>

            {/* 主要内容区域 */}
            <Section className="px-12 py-12">{children}</Section>

            {/* 邮件页脚 */}
            <Section className="px-12 py-12 bg-primary">
              {footerContent || (
                <>
                  <Text className="text-foreground text-center text-sm leading-5 my-2">
                    此邮件为自动发送，请勿回复此邮件
                  </Text>
                  <Text className="text-foreground text-center text-sm leading-5 my-2">
                    © {new Date().getFullYear()}{" "}
                    <a
                      href={siteUrl}
                      className="text-foreground no-underline font-medium"
                    >
                      {siteName}
                    </a>{" "}
                    -{" "}
                    <a
                      href={siteUrl + "/settings"}
                      className="text-foreground no-underline font-medium"
                    >
                      邮件设置
                    </a>
                  </Text>
                </>
              )}
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default EmailLayout;

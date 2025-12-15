import { Text } from "@react-email/components";
import * as React from "react";

/**
 * 邮件段落组件属性
 */
export interface EmailParagraphProps {
  /** 段落文本 */
  children: React.ReactNode;
  /** 对齐方式 */
  align?: "left" | "center" | "right";
  /** 文本颜色类型 */
  variant?: "default" | "muted" | "error" | "success";
}

/**
 * 邮件段落组件 - NeutralUI 设计
 * 使用 Tailwind CSS 类名
 */
export function EmailParagraph({
  children,
  align = "left",
  variant = "default",
}: EmailParagraphProps) {
  const alignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };
  const colorClasses = {
    default: "text-[#333333]",
    muted: "text-muted",
    error: "text-red-500",
    success: "text-green-500",
  };

  const className = `text-[15px] leading-6 mb-4 ${alignClasses[align]} ${colorClasses[variant]}`;

  return <Text className={className}>{children}</Text>;
}

export default EmailParagraph;

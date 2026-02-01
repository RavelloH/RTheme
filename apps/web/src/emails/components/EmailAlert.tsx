import * as React from "react";
import { Section } from "@react-email/components";

/**
 * 邮件提示框组件属性
 */
export interface EmailAlertProps {
  /** 提示内容 */
  children: React.ReactNode;
  /** 提示类型 */
  variant?: "info" | "warning" | "error" | "success";
}

/**
 * 邮件提示框组件 - NeutralUI 设计
 * 用于显示重要提示、警告等信息
 * 使用 Tailwind CSS 类名
 */
export function EmailAlert({ children, variant = "info" }: EmailAlertProps) {
  const variantClasses = {
    info: "bg-primary/10 border-l-primary",
    warning: "bg-yellow-500/10 border-l-yellow-500",
    error: "bg-red-500/10 border-l-red-500",
    success: "bg-green-500/10 border-l-green-500",
  };

  const className = `text-foreground px-5 py-4 my-5 rounded-sm text-sm text-center leading-6 border-l-4 ${variantClasses[variant]}`;

  return <Section className={className}>{children}</Section>;
}

export default EmailAlert;

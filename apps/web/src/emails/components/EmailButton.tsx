import * as React from "react";
import { Button } from "@react-email/components";

/**
 * 邮件按钮组件属性
 */
export interface EmailButtonProps {
  /** 按钮文本 */
  children: React.ReactNode;
  /** 跳转链接 */
  href: string;
  /** 主题色（默认：#2dd4bf） */
  primaryColor?: string;
  /** 按钮样式类型 */
  variant?: "primary" | "secondary";
}

/**
 * 邮件按钮组件 - NeutralUI 设计
 * 使用 Tailwind CSS 类名
 */
export function EmailButton({
  children,
  href,
  primaryColor: _primaryColor = "#2dd4bf",
  variant = "primary",
}: EmailButtonProps) {
  const className =
    variant === "primary"
      ? "inline-block px-8 py-3 text-base font-medium no-underline rounded-sm text-center cursor-pointer tracking-widest bg-primary text-foreground"
      : "inline-block px-8 py-3 text-base font-medium no-underline rounded-sm text-center cursor-pointer tracking-widest bg-transparent text-foreground border-2 border-foreground";

  return (
    <Button href={href} className={className}>
      {children}
    </Button>
  );
}

export default EmailButton;

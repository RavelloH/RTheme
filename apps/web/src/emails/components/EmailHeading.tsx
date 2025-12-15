import { Heading } from "@react-email/components";
import * as React from "react";

/**
 * 邮件标题组件属性
 */
export interface EmailHeadingProps {
  /** 标题文本 */
  children: React.ReactNode;
  /** 标题级别 */
  level?: 1 | 2 | 3;
  /** 对齐方式 */
  align?: "left" | "center" | "right";
}

/**
 * 邮件标题组件 - NeutralUI 设计
 * 使用 Tailwind CSS 类名
 */
export function EmailHeading({
  children,
  level = 1,
  align = "center",
}: EmailHeadingProps) {
  const baseClasses = "text-foreground font-bold leading-tight tracking-wider";
  const alignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };
  const sizeClasses = {
    1: "text-[32px] my-6",
    2: "text-2xl mb-5",
    3: "text-lg mb-4",
  };

  const className = `${baseClasses} ${alignClasses[align]} ${sizeClasses[level]}`;
  const as = `h${level}` as "h1" | "h2" | "h3";

  return (
    <Heading as={as} className={className}>
      {children}
    </Heading>
  );
}

export default EmailHeading;

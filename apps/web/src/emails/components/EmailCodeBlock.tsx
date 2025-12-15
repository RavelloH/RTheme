import { Section } from "@react-email/components";
import * as React from "react";

/**
 * 邮件代码块组件属性
 */
export interface EmailCodeBlockProps {
  /** 代码内容 */
  children: React.ReactNode;
  /** 是否为内联代码 */
  inline?: boolean;
}

/**
 * 邮件代码块组件 - NeutralUI 设计
 * 用于显示验证码、重置码等
 * 使用 Tailwind CSS 类名
 */
export function EmailCodeBlock({
  children,
  inline = false,
}: EmailCodeBlockProps) {
  if (inline) {
    return (
      <code className="font-mono text-sm bg-black/5 px-2 py-1 rounded-sm text-foreground">
        {children}
      </code>
    );
  }

  return (
    <Section className="bg-primary/10 rounded-sm p-6 my-6 border-2 border-primary">
      <code className="font-mono text-[28px] font-bold text-foreground tracking-[0.5em] block text-center">
        {children}
      </code>
    </Section>
  );
}

export default EmailCodeBlock;

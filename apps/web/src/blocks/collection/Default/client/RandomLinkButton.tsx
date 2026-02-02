"use client";

import LinkButton from "@/components/ui/LinkButton";

/**
 * 随机链接按钮组件
 * 从提供的选项列表中随机选择一个链接进行跳转
 */
export default function RandomLinkButton({
  options,
  text,
}: {
  options: string[];
  text?: string;
}) {
  const href = options[Math.floor(Math.random() * options.length)];
  return (
    <LinkButton mode="link" href={href} text={text || "Random / 随便看看"} />
  );
}

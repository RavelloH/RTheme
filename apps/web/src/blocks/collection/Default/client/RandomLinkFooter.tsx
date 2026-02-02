"use client";

import LinkButton from "@/components/ui/LinkButton";

/**
 * 随机链接 Footer 组件
 * 封装随机链接逻辑，供 DefaultBlock 使用
 */
export default function RandomLinkFooter({
  options,
  text,
}: {
  options: string[];
  text: string;
}) {
  const href = options[Math.floor(Math.random() * options.length)];
  return (
    <LinkButton mode="link" href={href} text={text || "Random / 随便看看"} />
  );
}

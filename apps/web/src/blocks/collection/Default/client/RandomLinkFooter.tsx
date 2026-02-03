"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import LinkButton from "@/components/ui/LinkButton";

/**
 * 随机链接 Footer 组件
 * 封装随机链接逻辑，供 DefaultBlock 使用
 * 每次点击时动态计算随机链接，避免后退时链接不变的问题
 */
export default function RandomLinkFooter({
  options,
  text,
}: {
  options: string[];
  text: string;
}) {
  const router = useRouter();

  const handleClick = useCallback(() => {
    if (options.length === 0) return;
    const randomIndex = Math.floor(Math.random() * options.length);
    const randomHref = options[randomIndex];
    if (randomHref) {
      router.push(randomHref);
    }
  }, [options, router]);

  return (
    <LinkButton
      mode="onClick"
      onClick={handleClick}
      text={text || "Random / 随便看看"}
    />
  );
}

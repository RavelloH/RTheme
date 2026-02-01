"use client";

import Marquee from "react-fast-marquee";

interface MarqueeTextProps {
  text: string;
  direction?: "left" | "right";
  className?: string;
}

/**
 * MarqueeText - 小型客户端组件
 * 封装 Marquee 滚动逻辑，减少客户端组件范围
 */
export default function MarqueeText({
  text,
  direction = "right",
  className = "",
}: MarqueeTextProps) {
  return (
    <Marquee
      speed={40}
      autoFill={true}
      className={`h-full text-7xl ${className}`}
      gradient={true}
      gradientWidth={20}
      gradientColor="var(--color-background)"
      direction={direction}
    >
      <span>{text}</span>
      <span className="px-6">/</span>
    </Marquee>
  );
}

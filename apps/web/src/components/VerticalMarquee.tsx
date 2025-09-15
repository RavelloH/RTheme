"use client";

import Marquee from "react-fast-marquee";
import { ReactNode } from "react";

interface VerticalMarqueeProps {
  children: ReactNode;
  speed?: number; // 滚动速度（像素/秒）
  className?: string;
}

export default function VerticalMarquee({
  children,
  speed = 50,
  className = "",
}: VerticalMarqueeProps) {
  return (
      <div className="bg-primary text-primary-foreground h-48 flex">
        <Marquee
          direction="left"
          speed={speed}
          autoFill={true}
          gradient={false}
          pauseOnHover={false}
        >
          <div className={className}>{children}</div>
        </Marquee>
      </div>
  );
}

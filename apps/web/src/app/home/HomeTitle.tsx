"use client";

import { useMobile } from "@/hooks/useMobile";
import Marquee from "react-fast-marquee";

export default function HomeTitle({ title }: { title: string }) {
  const isMobile = useMobile();

  return isMobile ? (
    <Marquee
      speed={40}
      autoFill={true}
      className="h-full text-7xl"
      gradient={true}
      gradientWidth={20}
      gradientColor="var(--color-background)"
      direction="right"
    >
      <span className="font-bold">{title}</span>
      <span className="px-6">/</span>
    </Marquee>
  ) : (
    <div
      data-fade
      data-parallax="-0.5"
      className="p-12 font-bold"
      data-fade-char
    >
      <h1>{title}</h1>
    </div>
  );
}

"use client";

import { useMobile } from "@/hooks/useMobile";
import Image from "next/image";
import Avatar from "@/../public/avatar.jpg";
import Marquee from "react-fast-marquee";

export default function HomeSlogan({ slogan }: { slogan: string }) {
  const isMobile = useMobile();

  return isMobile ? (
    <Marquee
      speed={40}
      autoFill={true}
      className="h-full text-7xl"
      gradient={true}
      gradientWidth={20}
      gradientColor="var(--color-background)"
    >
      <span>{slogan}</span>
      <span className="px-6">/</span>
    </Marquee>
  ) : (
    <>
      <div className="h-full aspect-square mr-4 relative">
        <Image src={Avatar} alt="logo" className="h-full w-auto object-cover" />
      </div>
      <div
        className="flex-1 flex items-center justify-end pr-12 text-8xl"
        data-fade
      >
        <span data-parallax="0.5">{slogan}</span>
      </div>
    </>
  );
}

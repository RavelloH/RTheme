"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useMobile } from "@/hooks/useMobile";

interface AnimationManagerProps {
  onTrigger: () => void;
}

export function AnimationManager({ onTrigger }: AnimationManagerProps) {
  const hasTriggeredRef = useRef(false);
  const isMobile = useMobile();

  // 根据设备类型获取高度值（像素）
  const getHeaderHeightPixels = () => {
    // 假设根元素字体大小为16px，计算对应的像素值
    const baseFontSize = 16;
    return isMobile ? 7 * baseFontSize : 5 * baseFontSize; // 6em * 16px = 112px, 5em * 16px = 80px
  };

  const triggerAnimations = () => {
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    // 触发Header动画
    const header = document.querySelector("header");
    if (header) {
      const headerHeight = getHeaderHeightPixels();
      gsap.fromTo(
        header,
        { y: -headerHeight },
        {
          y: 0,
          duration: 0.8,
          ease: "power2.out",
        },
      );
    }

    // 触发Footer动画
    const footer = document.querySelector("footer");
    if (footer) {
      const headerHeight = getHeaderHeightPixels();
      gsap.fromTo(
        footer,
        { y: headerHeight },
        {
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          delay: 0.2,
        },
      );
    }

    // 触发Main动画
    const main = document.querySelector("main");
    if (main) {
      gsap.fromTo(
        main,
        { x: "100%" },
        {
          x: "0%",
          duration: 0.8,
          ease: "power2.out",
          delay: 0.4,
        },
      );
    }

    onTrigger();
  };

  return { triggerAnimations };
}

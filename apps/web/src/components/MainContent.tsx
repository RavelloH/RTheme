"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

import { useMobile } from "@/hooks/use-mobile";

interface MainContentProps {
  children: React.ReactNode;
}

export function MainContent({ children }: MainContentProps) {
  const mainRef = useRef<HTMLElement>(null);
  const [, setIsLoaded] = useState(false);
  const isMobile = useMobile();

  // 根据设备类型获取高度值
  const getHeaderHeight = () => (isMobile ? "6em" : "5em");

  // 监听加载完成事件
  useEffect(() => {
    const handleLoadingComplete = () => {
      setIsLoaded(true);

      // 使用GSAP透明度渐变动画，延迟等待Header和Footer完成
      if (mainRef.current) {
        gsap.fromTo(
          mainRef.current,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.6,
            ease: "power2.out",
            delay: 0.4, // 在Header和Footer之后
          },
        );
      }
    };

    window.addEventListener("loadingComplete", handleLoadingComplete);

    return () => {
      window.removeEventListener("loadingComplete", handleLoadingComplete);
    };
  }, []);

  return (
    <main
      ref={mainRef}
      className={`${isMobile ? "min-h-screen" : "flex-1 overflow-hidden"}`}
      style={{
        marginTop: getHeaderHeight(),
        opacity: 0,
      }}
    >
      {children}
    </main>
  );
}

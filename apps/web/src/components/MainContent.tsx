"use client";

import { useRef, useState, useEffect } from "react";
import { gsap } from "gsap";

interface MainContentProps {
  children: React.ReactNode;
}

export function MainContent({ children }: MainContentProps) {
  const mainRef = useRef<HTMLElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // 监听加载完成事件
  useEffect(() => {
    const handleLoadingComplete = () => {
      setIsLoaded(true);

      // 使用GSAP动画从右侧滑入
      if (mainRef.current) {
        gsap.fromTo(
          mainRef.current,
          { x: "100%" },
          {
            x: "0%",
            duration: 0.8,
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
      className={`flex-1 ${isLoaded ? "translate-x-0" : "translate-x-full"}`}
    >
      {children}
    </main>
  );
}

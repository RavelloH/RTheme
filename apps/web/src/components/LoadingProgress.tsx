"use client";

import { useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";

interface LoadingProgressProps {
  onComplete?: () => void;
}

export function LoadingProgress({ onComplete }: LoadingProgressProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<gsap.core.Timeline | null>(null);

  // 使用useCallback来稳定onComplete引用
  const handleComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    if (!progressRef.current || !progressBarRef.current) return;

    // 清理之前的动画
    if (animationRef.current) {
      animationRef.current.kill();
    }

    // 确保进度条从0开始
    gsap.set(progressBarRef.current, { width: "0%" });

    // 延迟一帧来确保DOM已经准备好
    const timer = setTimeout(() => {
      if (!progressBarRef.current || !progressRef.current) return;

      // 创建进度条动画
      const tl = gsap.timeline({
        onComplete: () => {
          // 进度条完成后，淡出整个加载界面
          gsap.to(progressRef.current, {
            opacity: 0,
            duration: 0.5,
            ease: "power2.out",
            onComplete: handleComplete,
          });
        },
      });

      // 进度条动画
      tl.to(progressBarRef.current, {
        width: "100%",
        duration: 2,
        ease: "power2.out",
      });

      animationRef.current = tl;
    }, 50);

    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        animationRef.current.kill();
        animationRef.current = null;
      }
    };
  }, [handleComplete]);

  return (
    <div
      ref={progressRef}
      className="fixed inset-0 z-[9999] bg-background flex items-center justify-center"
    >
      <div className="w-80 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          ref={progressBarRef}
          className="h-full bg-white rounded-full w-0"
        />
      </div>
    </div>
  );
}

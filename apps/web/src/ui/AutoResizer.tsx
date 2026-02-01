"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Easing } from "framer-motion";
import { motion } from "framer-motion";

export interface AutoResizerProps {
  children: React.ReactNode;
  className?: string;
  /**
   * 过渡持续时间（秒）
   * @default 0.3
   */
  duration?: number;
  /**
   * 缓动函数
   * @default "easeInOut"
   */
  ease?: Easing | Easing[];
  /**
   * 是否在首次渲染时也播放动画
   * @default false
   */
  initial?: boolean;
}

export function AutoResizer({
  children,
  className = "",
  duration = 0.3,
  ease = "easeInOut",
  initial = false,
}: AutoResizerProps) {
  const [height, setHeight] = useState<number | "auto">("auto");
  const [updateCount, setUpdateCount] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newHeight = entry.contentRect.height;
        setHeight(newHeight);
        setUpdateCount((prev) => prev + 1);
      }
    });

    resizeObserver.observe(contentRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // 如果 initial=true，总是播放动画
  // 如果 initial=false，只有在第二次及以后的更新才播放动画
  const shouldAnimate = initial || updateCount > 1;

  return (
    <motion.div
      className={className}
      style={{ overflow: "hidden" }}
      animate={{ height }}
      transition={{
        duration: shouldAnimate ? duration : 0,
        ease: ease as Easing | Easing[],
      }}
    >
      <div ref={contentRef}>{children}</div>
    </motion.div>
  );
}

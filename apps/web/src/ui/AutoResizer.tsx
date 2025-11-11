"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, Easing } from "framer-motion";

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
  const [height, setHeight] = useState<number | "auto">(initial ? "auto" : 0);
  const contentRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!contentRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newHeight = entry.contentRect.height;

        // 首次渲染时，根据 initial 决定是否直接设置高度
        if (isFirstRender.current && !initial) {
          setHeight(newHeight);
          isFirstRender.current = false;
        } else {
          setHeight(newHeight);
        }
      }
    });

    resizeObserver.observe(contentRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [initial]);

  return (
    <motion.div
      className={className}
      style={{ overflow: "hidden" }}
      initial={initial ? false : { height: 0 }}
      animate={{ height }}
      transition={{
        duration,
        ease: ease as Easing | Easing[],
      }}
    >
      <div ref={contentRef}>{children}</div>
    </motion.div>
  );
}

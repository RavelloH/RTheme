"use client";

import { useEffect } from "react";
import { useBroadcastSender } from "@/hooks/use-broadcast";
import { useMobile } from "@/hooks/use-mobile";

/**
 * 全局鼠标追踪组件
 * 在整个页面级别监听鼠标移动，统一广播坐标
 */
export default function GlobalMouseTracker() {
  const { broadcast } = useBroadcastSender<
    | {
        type: "mouse-move";
        x: number;
        y: number;
      }
    | {
        type: "mouse-leave";
      }
  >();
  const isMobile = useMobile();

  useEffect(() => {
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      // 获取视口尺寸
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // 归一化坐标 0-1
      const x = e.clientX / viewportWidth;
      const y = e.clientY / viewportHeight;

      broadcast({
        type: "mouse-move",
        x,
        y,
      });
    };

    const handleMouseLeave = () => {
      // 鼠标离开页面时广播离开事件
      broadcast({
        type: "mouse-leave",
      });
    };

    // 在整个文档上监听
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [broadcast, isMobile]);

  return null;
}

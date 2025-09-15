"use client";

import { ReactNode, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// 注册 ScrollTrigger 插件
gsap.registerPlugin(ScrollTrigger);

interface HorizontalScrollLayoutProps {
  children: ReactNode;
  className?: string;
  scrollSpeed?: number; // 滚动速度倍数
  ease?: string; // 缓动函数
}

export default function HorizontalScrollLayout({
  children,
  className = "",
  scrollSpeed = 2.5,
  ease = "none",
}: HorizontalScrollLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    
    if (!container || !content) return;

    // 创建 GSAP 上下文，确保动画可以被正确清理
    const ctx = gsap.context(() => {
      // 获取内容的实际宽度
      const getScrollAmount = () => {
        const containerWidth = container.offsetWidth;
        const contentWidth = content.scrollWidth;
        return -(contentWidth - containerWidth);
      };

      // 创建水平滚动动画
      const horizontalScroll = gsap.to(content, {
        x: getScrollAmount,
        duration: 1,
        ease: ease,
        scrollTrigger: {
          trigger: container,
          start: "top bottom",
          end: "bottom top",
          scrub: 1, // 平滑跟随滚动
          invalidateOnRefresh: true, // 窗口大小改变时重新计算
        },
      });

      // 监听鼠标滚轮事件实现更直接的控制
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        
        // 使用 GSAP 的 to 方法创建平滑滚动
        const currentX = gsap.getProperty(content, "x") as number;
        const deltaX = e.deltaY * scrollSpeed * 1.8; // 增加额外的速度倍数
        const newX = Math.max(getScrollAmount(), Math.min(0, currentX - deltaX));
        
        gsap.to(content, {
          x: newX,
          duration: 0.15, // 减少动画持续时间，使响应更快
          ease: "power2.out",
          overwrite: true,
        });
      };

      // 添加鼠标滚轮监听
      container.addEventListener("wheel", handleWheel, { passive: false });

      // 清理函数
      return () => {
        container.removeEventListener("wheel", handleWheel);
        horizontalScroll.kill();
      };
    }, container);

    // 组件卸载时清理 GSAP 上下文
    return () => ctx.revert();
  }, [scrollSpeed, ease]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden ${className}`}
    >
      <div
        ref={contentRef}
        className="flex h-full will-change-transform"
      >
        {children}
      </div>
    </div>
  );
}
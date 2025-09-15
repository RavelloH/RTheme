"use client";

import { ReactNode, useEffect, useRef } from "react";
import { gsap } from "gsap";

// 简化的 GSAP 横向滚动组件
interface GSAPHorizontalScrollProps {
  children: ReactNode;
  className?: string;
  scrollSpeed?: number;
  enableParallax?: boolean;
  enableFadeElements?: boolean;
  snapToElements?: boolean;
}

export default function GSAPHorizontalScroll({
  children,
  className = "",
  scrollSpeed = 3,
  enableParallax = false,
  enableFadeElements = false,
}: GSAPHorizontalScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    
    if (!container || !content) return;

    // 创建 GSAP 上下文
    const ctx = gsap.context(() => {
      
      // 鼠标滚轮控制
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        
        // 获取当前位置
        const currentX = gsap.getProperty(content, "x") as number;
        const deltaX = e.deltaY * scrollSpeed;
        
        // 计算边界
        const maxScrollLeft = -(content.scrollWidth - container.offsetWidth);
        const newX = Math.max(maxScrollLeft, Math.min(0, currentX - deltaX));
        
        // 使用 GSAP 创建平滑滚动
        gsap.to(content, {
          x: newX,
          duration: 0.8,
          ease: "power2.out",
          overwrite: true,
        });
      };

      // 如果启用视差效果
      if (enableParallax) {
        const parallaxElements = content.querySelectorAll("[data-parallax]");
        parallaxElements.forEach((element) => {
          const speed = parseFloat(element.getAttribute("data-parallax") || "0.5");
          
          // 监听主容器的移动，应用视差效果
          gsap.set(element, { transformOrigin: "center center" });
          
          // 创建一个简单的视差动画
          const parallaxAnimation = () => {
            const currentX = gsap.getProperty(content, "x") as number;
            const parallaxX = currentX * speed;
            gsap.set(element, { x: parallaxX });
          };
          
          // 使用 GSAP 的 ticker 来更新视差效果
          gsap.ticker.add(parallaxAnimation);
          
          // 清理函数中移除 ticker
          return () => gsap.ticker.remove(parallaxAnimation);
        });
      }

      // 如果启用淡入效果
      if (enableFadeElements) {
        const fadeElements = content.querySelectorAll("[data-fade]");
        fadeElements.forEach((element) => {
          // 初始状态
          gsap.set(element, { opacity: 0, y: 30 });
          
          // 创建 Intersection Observer 来监听元素进入视口
          const observer = new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  gsap.to(entry.target, {
                    opacity: 1,
                    y: 0,
                    duration: 0.6,
                    ease: "power2.out",
                  });
                }
              });
            },
            { threshold: 0.1 }
          );
          
          observer.observe(element as Element);
        });
      }

      // 添加鼠标滚轮监听
      container.addEventListener("wheel", handleWheel, { passive: false });

      // 清理函数
      return () => {
        container.removeEventListener("wheel", handleWheel);
      };
    }, container);

    // 组件卸载时清理
    return () => ctx.revert();
  }, [scrollSpeed, enableParallax, enableFadeElements]);

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
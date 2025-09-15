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

export default function HorizontalScroll({
  children,
  className = "",
  scrollSpeed = 1,
  enableParallax = false,
  enableFadeElements = false,
}: GSAPHorizontalScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const targetXRef = useRef(0);
  const animationRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    
    if (!container || !content) return;

    // 初始化位置
    const initialX = gsap.getProperty(content, "x") as number || 0;
    targetXRef.current = initialX;

    // 存储清理函数
    const cleanupFunctions: (() => void)[] = [];

    // 创建 GSAP 上下文
    const ctx = gsap.context(() => {
      
      // 更新到目标位置的函数
      const animateToTarget = () => {
        // 停止当前动画
        if (animationRef.current) {
          animationRef.current.kill();
        }
        
        // 获取当前位置
        const currentX = gsap.getProperty(content, "x") as number;
        const targetX = targetXRef.current;
        
        // 如果已经在目标位置，不需要动画
        if (Math.abs(targetX - currentX) < 0.1) {
          return;
        }
        
        // 创建新的GSAP动画，使用惯性ease
        animationRef.current = gsap.to(content, {
          x: targetX,
          duration: 1,
          ease: "power3.out", // 这个ease模拟真实的惯性感觉
          overwrite: false,
        });
      };
      
      // 鼠标滚轮控制
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        
        // 计算滚动增量
        const deltaX = e.deltaY * scrollSpeed;
        
        // 更新目标位置
        const newTargetX = targetXRef.current - deltaX;
        
        // 计算边界
        const maxScrollLeft = -(content.scrollWidth - container.offsetWidth);
        targetXRef.current = Math.max(maxScrollLeft, Math.min(0, newTargetX));
        
        // 触发动画到新的目标位置
        animateToTarget();
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
          
          // 添加清理函数
          cleanupFunctions.push(() => gsap.ticker.remove(parallaxAnimation));
        });
      }

      // 如果启用淡入效果
      if (enableFadeElements) {
        const fadeElements = content.querySelectorAll("[data-fade]");
        
        // 创建一个函数来更新所有淡入元素的状态
        const updateFadeElements = () => {
          const containerRect = container.getBoundingClientRect();
          const containerWidth = containerRect.width;
          
          fadeElements.forEach((element) => {
            // 获取元素在文档中的位置
            const elementRect = element.getBoundingClientRect();
            
            // 计算元素相对于容器视口的位置
            // elementRect.left 是相对于整个页面的，containerRect.left 也是
            // 所以 elementRect.left - containerRect.left 得到的是元素相对于容器的位置
            const elementLeftInContainer = elementRect.left - containerRect.left;
            const elementCenter = elementLeftInContainer + elementRect.width / 2;
            
            // 定义动画范围：从右边界到屏幕右侧80%位置
            const animationStartX = containerWidth; // 右边界
            const animationEndX = containerWidth * 0.8;   // 屏幕右侧80%位置
            
            // 计算元素中心在动画范围内的进度
            let animationProgress = 0;
            
            if (elementCenter <= animationEndX) {
              // 元素已经到达或超过屏幕右侧80%位置，完全显示
              animationProgress = 1;
            } else if (elementCenter >= animationStartX) {
              // 元素还在右边界外，不显示
              animationProgress = 0;
            } else {
              // 元素在动画范围内，计算进度
              const totalDistance = animationStartX - animationEndX;
              const currentDistance = animationStartX - elementCenter;
              animationProgress = currentDistance / totalDistance;
            }
            
            // 确保进度在 0-1 范围内
            animationProgress = Math.max(0, Math.min(1, animationProgress));
            
            // 根据动画进度计算透明度和Y偏移
            const opacity = animationProgress;
            const yOffset = (1 - animationProgress) * 30; // 从30px偏移到0
            
            // 应用动画，使用较短的持续时间以保持响应性
            gsap.to(element, {
              opacity,
              y: yOffset,
              duration: 0.1,
              ease: "none",
              overwrite: true,
            });
          });
        };
        
        // 初始状态设置
        fadeElements.forEach((element) => {
          gsap.set(element, { opacity: 0, y: 30 });
        });
        
        // 立即更新一次
        updateFadeElements();
        
        // 使用 GSAP ticker 来持续更新淡入效果
        gsap.ticker.add(updateFadeElements);
        
        // 添加清理函数
        cleanupFunctions.push(() => gsap.ticker.remove(updateFadeElements));
      }

      // 添加鼠标滚轮监听
      container.addEventListener("wheel", handleWheel, { passive: false });
      
      // 添加清理函数
      cleanupFunctions.push(() => container.removeEventListener("wheel", handleWheel));

    }, container);

    // 组件卸载时清理
    return () => {
      if (animationRef.current) {
        animationRef.current.kill();
      }
      ctx.revert();
      cleanupFunctions.forEach(cleanup => cleanup());
    };
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
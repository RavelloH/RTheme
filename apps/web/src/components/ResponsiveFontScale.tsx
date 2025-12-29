"use client";

import { ReactNode, useRef, useEffect } from "react";
import { useMobile } from "@/hooks/use-mobile";
interface ResponsiveFontScaleProps {
  children: ReactNode;
  scaleFactor?: number; // 缩放因子，基于视窗高度的比例
  mobileScaleFactor?: number; // 移动端缩放因子，基于容器宽度的比例
  baseSize?: number; // 基础字体大小（px）
  className?: string;
}

export default function ResponsiveFontScale({
  children,
  scaleFactor = 0.2, // 默认为视窗高度的20%
  mobileScaleFactor = 0.025, // 默认为容器宽度的2.5%
  baseSize = 16, // 默认16px基础大小
  className = "",
}: ResponsiveFontScaleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const originalFontSizeRef = useRef<string>("");
  const isMobile = useMobile();

  useEffect(() => {
    // 确保只在客户端运行
    if (typeof window === "undefined") return;

    // 保存原始字体大小
    if (originalFontSizeRef.current === "") {
      originalFontSizeRef.current = getComputedStyle(
        document.documentElement,
      ).fontSize;
      console.log("原始字体大小:", originalFontSizeRef.current);
    }

    const updateRootFontSize = () => {
      if (!containerRef.current) return;

      if (isMobile) {
        // 移动端：根据容器宽度动态计算字体大小
        const containerWidth = containerRef.current.offsetWidth;
        const calculatedSize = Math.max(10, containerWidth * mobileScaleFactor);
        console.log(
          `移动端 - 容器宽度: ${containerWidth}px, 缩放因子: ${mobileScaleFactor}, 计算字体大小: ${calculatedSize}px`,
        );
        document.documentElement.style.fontSize = `${calculatedSize}px`;
      } else {
        // 桌面端：使用视口高度计算字体大小
        const viewportHeight = window.innerHeight;
        const calculatedSize = Math.max(10, viewportHeight * scaleFactor);
        console.log(
          `桌面端 - 视口高度: ${viewportHeight}px, 缩放因子: ${scaleFactor}, 计算字体大小: ${calculatedSize}px`,
        );
        document.documentElement.style.fontSize = `${calculatedSize}px`;
      }
    };

    // 初始化设置（延迟一下确保容器已渲染）
    const timer = setTimeout(updateRootFontSize, 0);

    // 监听窗口大小变化
    window.addEventListener("resize", updateRootFontSize);

    // 使用 ResizeObserver 监听容器大小变化，与 RowGrid 保持一致
    const resizeObserver = new ResizeObserver(updateRootFontSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // 清理函数
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateRootFontSize);
      resizeObserver.disconnect();
      if (originalFontSizeRef.current) {
        document.documentElement.style.fontSize = originalFontSizeRef.current;
        console.log("恢复原始字体大小:", originalFontSizeRef.current);
      }
    };
  }, [scaleFactor, mobileScaleFactor, baseSize, isMobile]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

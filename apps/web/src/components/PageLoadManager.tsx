"use client";

import { useEffect, useRef } from "react";

interface PageLoadManagerProps {
  onLoadComplete: () => void;
}

export function PageLoadManager({ onLoadComplete }: PageLoadManagerProps) {
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    // 检测页面加载状态
    const checkPageLoad = () => {
      if (hasTriggeredRef.current) return;

      const isReady = 
        document.readyState === "complete" &&
        window.performance &&
        performance.getEntriesByType("navigation").length > 0;

      if (isReady) {
        hasTriggeredRef.current = true;
        
        // 延迟一点时间确保所有资源都已加载
        setTimeout(() => {
          onLoadComplete();
        }, 500);
      }
    };

    // 立即检查
    checkPageLoad();

    // 监听load事件
    const handleLoad = () => {
      setTimeout(checkPageLoad, 100);
    };

    // 监听DOMContentLoaded事件
    const handleDOMContentLoaded = () => {
      setTimeout(checkPageLoad, 100);
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", handleDOMContentLoaded);
    }
    
    window.addEventListener("load", handleLoad);

    // 兜底：最多3秒后强制完成加载
    const fallbackTimer = setTimeout(() => {
      if (!hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        onLoadComplete();
      }
    }, 3000);

    return () => {
      document.removeEventListener("DOMContentLoaded", handleDOMContentLoaded);
      window.removeEventListener("load", handleLoad);
      clearTimeout(fallbackTimer);
    };
  }, [onLoadComplete]);

  return null; // 这个组件不渲染任何内容
}
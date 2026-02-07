"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { TabItem } from "@/blocks/collection/Tabs/types";
import { ProcessedText } from "@/blocks/core/components";
import { useMobile } from "@/hooks/use-mobile";

interface TabsContentProps {
  tabs: TabItem[];
  data: Record<string, unknown>;
  tabPosition: "top" | "left";
  style: "underline" | "pills" | "bordered";
  tabsCentered?: boolean;
  contentAlign?: "left" | "center" | "right";
  contentVerticalAlign?: "top" | "center" | "bottom";
}

export default function TabsContent({
  tabs,
  data,
  tabPosition,
  style,
  tabsCentered = false,
  contentAlign = "left",
  contentVerticalAlign = "top",
}: TabsContentProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);

  // 移动端检测：移动版始终使用顶部标签栏
  const isMobile = useMobile();

  // 滑动下划线状态
  const [indicatorPosition, setIndicatorPosition] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const [indicatorReady, setIndicatorReady] = useState(false);

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // 初始化 tabRefs
  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, tabs.length);
  }, [tabs.length]);

  // 更新下划线位置
  // 使用 offsetLeft/offsetTop 而非 getBoundingClientRect，以避免 transform scale 的影响
  const updateIndicatorPosition = useCallback((index: number) => {
    // 使用 requestAnimationFrame 确保 DOM 渲染完成
    requestAnimationFrame(() => {
      const tab = tabRefs.current[index];
      const container = tabsContainerRef.current;
      if (!tab || !container) return;

      // 使用 offsetLeft/offsetTop 计算相对位置，不受 transform scale 影响
      const left = tab.offsetLeft;
      const top = tab.offsetTop;
      const width = tab.offsetWidth;
      const height = tab.offsetHeight;

      setIndicatorPosition({
        left,
        top,
        width,
        height,
      });
      setIndicatorReady(true);
    });
  }, []);

  // 初始化和激活索引变化时更新下划线
  useEffect(() => {
    if (style === "underline") {
      updateIndicatorPosition(activeIndex);
    }
  }, [activeIndex, style, updateIndicatorPosition]);

  // 布局方向改变时（桌面版 ↔ 移动版）重新计算位置
  useEffect(() => {
    if (style === "underline") {
      // 延迟更新，确保布局变化完成
      const timer = setTimeout(() => {
        updateIndicatorPosition(activeIndex);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMobile, tabPosition, style, activeIndex, updateIndicatorPosition]);

  // 窗口大小改变时更新位置
  useEffect(() => {
    if (style !== "underline") return;

    const handleResize = () => {
      updateIndicatorPosition(activeIndex);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeIndex, style, updateIndicatorPosition]);

  // 使用 ResizeObserver 监听容器尺寸变化
  useEffect(() => {
    if (style !== "underline" || !tabsContainerRef.current) return;

    const container = tabsContainerRef.current;
    const observer = new ResizeObserver(() => {
      updateIndicatorPosition(activeIndex);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [style, activeIndex, updateIndicatorPosition]);

  const handleTabChange = (index: number) => {
    if (index === activeIndex || isAnimating) return;

    // 先更新下划线位置
    if (style === "underline") {
      updateIndicatorPosition(index);
    }

    setIsAnimating(true);
    setContentVisible(false);

    // 淡出后切换内容
    setTimeout(() => {
      setActiveIndex(index);
      setDisplayIndex(index);

      // 淡入新内容
      setTimeout(() => {
        setContentVisible(true);
        setTimeout(() => {
          setIsAnimating(false);
        }, 300);
      }, 50);
    }, 150);
  };

  const getTabClasses = (isActive: boolean) => {
    const base = "px-6 py-3 text-lg cursor-pointer relative z-10";

    if (style === "underline") {
      // 下划线样式由独立指示器处理，这里只设置文本颜色
      return `${base} transition-colors duration-300 ease-out ${
        isActive
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
      }`;
    }

    if (style === "pills") {
      return `${base} rounded-full transition-all duration-300 ease-out ${
        isActive
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-muted-foreground"
      }`;
    }

    // bordered
    return `${base} border transition-all duration-300 ease-out ${
      isActive
        ? "border-primary bg-primary/5 text-primary"
        : "border-transparent hover:border-border text-muted-foreground"
    }`;
  };

  // 移动版或顶部配置时使用水平布局
  const isHorizontal = isMobile || tabPosition === "top";
  const showIndicator = style === "underline" && indicatorReady;

  // 内容对齐类名
  const contentAlignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[contentAlign];

  // 垂直对齐类名（仅桌面版有效）
  const contentVerticalAlignClass = {
    top: "items-start",
    center: "items-center",
    bottom: "items-end",
  }[contentVerticalAlign];

  // 内容动画类
  const contentAnimationClass = contentVisible
    ? "opacity-100 translate-y-0"
    : "opacity-0 translate-y-2";

  return (
    <div
      className={`flex ${isHorizontal ? "flex-col" : "flex-row"} ${isMobile ? "" : "h-full"}`}
    >
      {/* 标签栏 */}
      <div
        ref={tabsContainerRef}
        className={`flex ${
          isHorizontal ? "flex-row gap-2" : "flex-col gap-2"
        } ${tabsCentered ? "justify-center" : "justify-start"} relative ${
          isHorizontal
            ? "border-b border-border pb-2 mb-6"
            : "border-r border-border pr-6 mr-6"
        }`}
      >
        {tabs.map((tab, index) => (
          <button
            title={tab.label || `Tab ${index + 1}`}
            key={index}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            onClick={() => handleTabChange(index)}
            className={getTabClasses(index === activeIndex)}
            disabled={isAnimating}
          >
            <ProcessedText
              text={tab.label || `Tab ${index + 1}`}
              data={data}
              inline
              disableMarkdown
            />
          </button>
        ))}

        {/* 滑动下划线指示器 */}
        {showIndicator && (
          <div
            className="absolute bg-primary transition-all duration-300 ease-out z-0"
            style={{
              left: isHorizontal ? `${indicatorPosition.left}px` : 0,
              top: isHorizontal ? "auto" : `${indicatorPosition.top}px`,
              bottom: isHorizontal ? 0 : "auto",
              right: isHorizontal ? "auto" : 0,
              width: isHorizontal ? `${indicatorPosition.width}px` : "2px",
              height: isHorizontal ? "2px" : `${indicatorPosition.height}px`,
            }}
          />
        )}
      </div>

      {/* 内容区域 */}
      {/* 移动版：不限制高度和滚动；桌面版：固定高度和内部滚动 */}
      <div
        className={`${isMobile ? "" : "flex-1 overflow-auto"} flex ${isMobile ? "" : contentVerticalAlignClass}`}
      >
        {tabs[displayIndex] && (
          <div
            className={`space-y-3 text-xl w-full ${contentAlignClass} transition-all duration-300 ease-out ${contentAnimationClass}`}
            data-line-reveal
            key={`tab-${displayIndex}`}
          >
            {(tabs[displayIndex].content || []).map((line, lineIndex) => (
              <div
                key={lineIndex}
                className="transition-all duration-300 ease-out"
                style={{
                  animation: `fadeInUp 0.4s ease-out ${contentVisible ? lineIndex * 0.05 : 0}s both`,
                }}
              >
                <ProcessedText text={line} data={data} inline />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 全局动画样式 */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

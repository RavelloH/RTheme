"use client";

import { ReactNode, useRef, useEffect } from "react";

// 定义区域类型
export type GridArea = 1 | 2 | 3 | 4;

interface GridItemProps {
  children: ReactNode;
  areas: GridArea[]; // 占据的区域（1-4）
  width?: number; // 宽度比例，基于高度的倍数。例如：width=1 表示宽度等于高度，width=2 表示宽度为高度的2倍
  fontScale?: number; // 字体大小比例，基于容器高度。例如：fontScale=0.1 表示字体大小为容器高度的10%
  className?: string;
}

interface FourAreaGridProps {
  children: ReactNode;
  className?: string;
}

// 网格项组件
export function GridItem({ 
  children, 
  areas, 
  width = 3.2, // 默认宽度比例（相当于原来的 w-80）
  fontScale = 0.05, // 默认字体大小比例（容器高度的5%）
  className = "" 
}: GridItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (itemRef.current) {
      const element = itemRef.current;
      // 设置 CSS 自定义属性
      element.style.setProperty('--width-scale', width.toString());
      element.style.setProperty('--font-scale', fontScale.toString());
      
      // 计算实际的宽度和字体大小
      const updateSizes = () => {
        const containerHeight = element.offsetHeight;
        const calculatedWidth = containerHeight * width;
        const calculatedFontSize = containerHeight * fontScale;
        
        element.style.width = `${calculatedWidth}px`;
        element.style.fontSize = `${calculatedFontSize}px`;
      };
      
      // 初始化大小
      updateSizes();
      
      // 监听窗口大小变化
      const resizeObserver = new ResizeObserver(updateSizes);
      resizeObserver.observe(element);
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [width, fontScale]);

  // 根据占据的区域计算位置
  const startArea = Math.min(...areas);
  const endArea = Math.max(...areas);
  
  // 根据区域生成对应的CSS类
  const getGridRowClass = () => {
    if (startArea === endArea) {
      // 单个区域
      switch (startArea) {
        case 1: return "row-start-1 row-end-2";
        case 2: return "row-start-2 row-end-3";
        case 3: return "row-start-3 row-end-4";
        case 4: return "row-start-4 row-end-5";
        default: return "";
      }
    } else {
      // 多个区域
      const rowStart = `row-start-${startArea}`;
      const rowEnd = `row-end-${endArea + 1}`;
      return `${rowStart} ${rowEnd}`;
    }
  };

  return (
    <div
      ref={itemRef}
      className={`${className} h-full border-accent border ${getGridRowClass()}`}
    >
      {children}
    </div>
  );
}

// 四区域网格容器
export default function FourAreaGrid({ 
  children, 
  className = "" 
}: FourAreaGridProps) {
  return (
    <div 
      className={`grid grid-rows-4 auto-cols-max grid-flow-col gap-0 h-full min-w-max ${className}`}
    >
      {children}
    </div>
  );
}
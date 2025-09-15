"use client";

import { ReactNode } from "react";

// 定义区域类型
export type GridArea = 1 | 2 | 3 | 4;

interface GridItemProps {
  children: ReactNode;
  areas: GridArea[]; // 占据的区域（1-4）
  width?: string; // 宽度，支持 Tailwind CSS 类名或任意CSS值
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
  width = "w-80", // 默认宽度
  className = "" 
}: GridItemProps) {
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
      className={`${width} ${className} h-full ${getGridRowClass()}`}
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
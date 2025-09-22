"use client";

import { ReactNode, useRef, useEffect } from "react";

// 定义区域类型
export type GridArea = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

interface GridItemProps {
  children: ReactNode;
  areas: GridArea[]; // 占据的区域（1-12）
  width?: number; // 宽度比例，基于高度的倍数。例如：width=1 表示宽度等于高度，width=2 表示宽度为高度的2倍
  className?: string;
}

interface RowGridProps {
  children: ReactNode;
  className?: string;
}

// 网格项组件
export function GridItem({
  children,
  areas,
  width = 3.2, // 默认宽度比例（相当于原来的 w-80）
  className = "",
}: GridItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (itemRef.current) {
      const element = itemRef.current;
      // 设置 CSS 自定义属性
      element.style.setProperty("--width-scale", width.toString());

      // 计算实际的宽度
      const updateSizes = () => {
        // 获取整个网格容器的高度，而不是单个项目的高度
        const gridContainer = element.closest(
          ".grid.grid-rows-12",
        ) as HTMLElement;
        if (!gridContainer) return;

        const totalHeight = gridContainer.offsetHeight;
        const areaCount = areas.length;

        // 计算单行高度（使用精确计算避免浮点误差）
        const singleRowHeight = totalHeight / 12;

        // 计算当前项目应该占据的高度
        const itemHeight = singleRowHeight * areaCount;

        // 使用 Math.round 避免浮点数精度问题
        const calculatedWidth = Math.round(itemHeight * width);

        element.style.width = `${calculatedWidth}px`;
      };

      // 初始化大小
      updateSizes();

      // 监听网格容器的大小变化，而不是单个项目
      const gridContainer = element.closest(
        ".grid.grid-rows-12",
      ) as HTMLElement;
      if (gridContainer) {
        const resizeObserver = new ResizeObserver(updateSizes);
        resizeObserver.observe(gridContainer);

        return () => {
          resizeObserver.disconnect();
        };
      }
    }
  }, [width, areas]);

  // 根据占据的区域计算位置
  const startArea = Math.min(...areas);
  const endArea = Math.max(...areas);

  // 根据区域生成对应的CSS类
  const getGridRowClass = () => {
    if (startArea === endArea) {
      // 单个区域
      switch (startArea) {
        case 1:
          return "row-start-1 row-end-2";
        case 2:
          return "row-start-2 row-end-3";
        case 3:
          return "row-start-3 row-end-4";
        case 4:
          return "row-start-4 row-end-5";
        case 5:
          return "row-start-5 row-end-6";
        case 6:
          return "row-start-6 row-end-7";
        case 7:
          return "row-start-7 row-end-8";
        case 8:
          return "row-start-8 row-end-9";
        case 9:
          return "row-start-9 row-end-10";
        case 10:
          return "row-start-10 row-end-11";
        case 11:
          return "row-start-11 row-end-12";
        case 12:
          return "row-start-12 row-end-13";
        default:
          return "";
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

// 十二区域网格容器
export default function RowGrid({ children, className = "" }: RowGridProps) {
  return (
    <div
      className={`grid grid-rows-12 auto-cols-max grid-flow-col gap-0 h-full min-w-max ${className}`}
    >
      {children}
    </div>
  );
}

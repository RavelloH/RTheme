"use client";

import { ReactNode, useRef, useEffect, useMemo, useCallback } from "react";

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

  // 使用 useCallback 缓存更新函数
  const updateSizes = useCallback(
    (element: HTMLElement) => {
      const gridContainer = element.closest(
        ".grid.grid-rows-12",
      ) as HTMLElement;
      if (!gridContainer) return;

      const totalHeight = gridContainer.offsetHeight;
      const areaCount = areas.length;
      const singleRowHeight = totalHeight / 12;
      const itemHeight = singleRowHeight * areaCount;
      const calculatedWidth = Math.round(itemHeight * width);

      element.style.width = `${calculatedWidth}px`;
    },
    [width, areas.length],
  );

  useEffect(() => {
    if (itemRef.current) {
      const element = itemRef.current;
      // 设置 CSS 自定义属性
      element.style.setProperty("--width-scale", width.toString());

      // 初始化大小
      updateSizes(element);

      // 监听网格容器的大小变化
      const gridContainer = element.closest(
        ".grid.grid-rows-12",
      ) as HTMLElement;
      if (gridContainer) {
        const resizeObserver = new ResizeObserver(() => updateSizes(element));
        resizeObserver.observe(gridContainer);

        return () => {
          resizeObserver.disconnect();
        };
      }
    }
  }, [width, areas, updateSizes]);

  // 使用 useMemo 缓存计算结果
  const { startArea, endArea } = useMemo(() => {
    return {
      startArea: Math.min(...areas),
      endArea: Math.max(...areas),
    };
  }, [areas]);

  // 使用 useMemo 缓存 CSS 类名
  const gridRowClass = useMemo(() => {
    if (startArea === endArea) {
      // 单个区域：使用模板字符串生成，避免数组查找
      return `row-start-${startArea} row-end-${startArea + 1}`;
    }
    // 多个区域
    return `row-start-${startArea} row-end-${endArea + 1}`;
  }, [startArea, endArea]);

  return (
    <div
      ref={itemRef}
      className={`${className} h-full border-accent border ${gridRowClass}`}
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

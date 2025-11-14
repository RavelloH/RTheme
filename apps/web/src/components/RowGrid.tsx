"use client";

import { ReactNode, useEffect, useRef } from "react";
import { useMobile } from "@/hooks/useMobile";

export type GridArea = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

const DEFAULT_MOBILE_AREAS: GridArea[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
];

const COL_SPAN_CLASSES: string[] = [
  "",
  "col-span-1",
  "col-span-2",
  "col-span-3",
  "col-span-4",
  "col-span-5",
  "col-span-6",
  "col-span-7",
  "col-span-8",
  "col-span-9",
  "col-span-10",
  "col-span-11",
  "col-span-12",
];

const ROW_START_CLASSES: Record<number, string> = {
  1: "row-start-1",
  2: "row-start-2",
  3: "row-start-3",
  4: "row-start-4",
  5: "row-start-5",
  6: "row-start-6",
  7: "row-start-7",
  8: "row-start-8",
  9: "row-start-9",
  10: "row-start-10",
  11: "row-start-11",
  12: "row-start-12",
};

const ROW_END_CLASSES: Record<number, string> = {
  1: "row-end-1",
  2: "row-end-2",
  3: "row-end-3",
  4: "row-end-4",
  5: "row-end-5",
  6: "row-end-6",
  7: "row-end-7",
  8: "row-end-8",
  9: "row-end-9",
  10: "row-end-10",
  11: "row-end-11",
  12: "row-end-12",
  13: "row-end-13",
};

const COL_START_CLASSES: Record<number, string> = {
  1: "col-start-1",
  2: "col-start-2",
  3: "col-start-3",
  4: "col-start-4",
  5: "col-start-5",
  6: "col-start-6",
  7: "col-start-7",
  8: "col-start-8",
  9: "col-start-9",
  10: "col-start-10",
  11: "col-start-11",
  12: "col-start-12",
};

const COL_END_CLASSES: Record<number, string> = {
  1: "col-end-1",
  2: "col-end-2",
  3: "col-end-3",
  4: "col-end-4",
  5: "col-end-5",
  6: "col-end-6",
  7: "col-end-7",
  8: "col-end-8",
  9: "col-end-9",
  10: "col-end-10",
  11: "col-end-11",
  12: "col-end-12",
  13: "col-end-13",
};

const ORDER_CLASSES: Record<number, string> = {
  1: "order-1",
  2: "order-2",
  3: "order-3",
  4: "order-4",
  5: "order-5",
  6: "order-6",
  7: "order-7",
  8: "order-8",
  9: "order-9",
  10: "order-10",
  11: "order-11",
  12: "order-12",
};

interface GridItemProps {
  children: ReactNode;
  areas: GridArea[];
  width?: number;
  className?: string;
  mobileAreas?: GridArea[];
  height?: number;
  fixedHeight?: boolean;
  mobileIndex?: number;
}

interface RowGridProps {
  children: ReactNode;
  className?: string;
  full?: boolean;
}

export function GridItem({
  children,
  areas,
  width = 3.2,
  className = "",
  mobileAreas,
  height,
  fixedHeight,
  mobileIndex,
}: GridItemProps) {
  const itemRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobile();
  const mobileHeight = height ?? 1 / width;
  const gridSelector = isMobile ? ".grid.grid-cols-12" : ".grid.grid-rows-12";
  const activeAreas = isMobile ? (mobileAreas ?? DEFAULT_MOBILE_AREAS) : areas;
  const startArea = Math.min(...activeAreas);
  const endArea = Math.max(...activeAreas);

  useEffect(() => {
    const element = itemRef.current;
    if (!element) return;

    element.style.setProperty("--width-scale", width.toString());

    const gridContainer = element.closest(gridSelector) as HTMLElement | null;
    if (!gridContainer) return;

    // 检测父容器是否有 w-full 类（表示是 full 模式）
    const isFullMode = !isMobile && gridContainer.classList.contains("w-full");

    const adjustSizes = () => {
      if (isMobile) {
        const containerWidth = gridContainer.offsetWidth;
        const calculatedHeight = Math.round(containerWidth * mobileHeight);

        element.style.width = "100%";
        if (fixedHeight) element.style.height = `${calculatedHeight}px`;
        else element.style.minHeight = `${calculatedHeight}px`;
      } else {
        const totalHeight = gridContainer.offsetHeight;
        const singleRowHeight = totalHeight / 12;
        const itemHeight = singleRowHeight * areas.length;
        const calculatedWidth = Math.round(itemHeight * width);

        if (isFullMode) {
          // full 模式：使用 flex-grow 按比例分配，flex-basis 为 0
          element.style.flexGrow = width.toString();
          element.style.flexShrink = "1";
          element.style.flexBasis = "0";
          element.style.minWidth = "0";
        } else {
          // 默认模式：使用固定宽度
          element.style.width = `${calculatedWidth}px`;
        }
      }
    };

    adjustSizes();

    const resizeObserver = new ResizeObserver(adjustSizes);
    resizeObserver.observe(gridContainer);

    return () => {
      resizeObserver.disconnect();
    };
  }, [areas.length, gridSelector, isMobile, mobileHeight, width, fixedHeight]);

  const gridPositionClass = isMobile
    ? (() => {
        const minCol = startArea;
        const maxCol = endArea;
        const colSpan = maxCol - minCol + 1;
        const spanClass = COL_SPAN_CLASSES[colSpan];

        if (spanClass) {
          return spanClass;
        }

        if (minCol !== 1) {
          const colStartClass = COL_START_CLASSES[minCol];
          const colEndClass = COL_END_CLASSES[maxCol + 1];
          return `${colStartClass} ${colEndClass}`;
        }

        return "col-span-12";
      })()
    : startArea === endArea
      ? `${ROW_START_CLASSES[startArea]} ${ROW_END_CLASSES[startArea + 1]}`
      : `${ROW_START_CLASSES[startArea]} ${ROW_END_CLASSES[endArea + 1]}`;

  const baseClass = isMobile ? "w-full" : "h-full";

  const orderClass =
    isMobile && mobileIndex !== undefined
      ? ORDER_CLASSES[mobileIndex] || ""
      : "";

  return (
    <div
      key={`grid-item-${isMobile ? "mobile" : "desktop"}`}
      ref={itemRef}
      className={`${className} border-muted border ${gridPositionClass} ${baseClass} ${orderClass}`.trim()}
    >
      {children}
    </div>
  );
}

export default function RowGrid({
  children,
  className = "",
  full = false,
}: RowGridProps) {
  const isMobile = useMobile();

  const baseClass = isMobile
    ? "grid grid-cols-12 auto-rows-max grid-flow-row w-full pb-8"
    : full
      ? "grid grid-rows-12 grid-flow-col gap-0 h-full w-full"
      : "grid grid-rows-12 auto-cols-max grid-flow-col gap-0 h-full min-w-max";

  const combinedClassName = className ? `${baseClass} ${className}` : baseClass;

  return (
    <div
      key={`row-grid-${isMobile ? "mobile" : "desktop"}`}
      className={combinedClassName}
    >
      {children}
    </div>
  );
}

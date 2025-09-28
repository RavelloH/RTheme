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

interface GridItemProps {
  children: ReactNode;
  areas: GridArea[];
  width?: number;
  className?: string;
  mobileAreas?: GridArea[];
  height?: number;
}

interface RowGridProps {
  children: ReactNode;
  className?: string;
}

export function GridItem({
  children,
  areas,
  width = 3.2,
  className = "",
  mobileAreas,
  height,
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

    const adjustSizes = () => {
      if (isMobile) {
        const containerWidth = gridContainer.offsetWidth;
        const calculatedHeight = Math.round(containerWidth * mobileHeight);

        element.style.width = "100%";
        element.style.height = `${calculatedHeight}px`;
      } else {
        const totalHeight = gridContainer.offsetHeight;
        const singleRowHeight = totalHeight / 12;
        const itemHeight = singleRowHeight * areas.length;
        const calculatedWidth = Math.round(itemHeight * width);

        element.style.width = `${calculatedWidth}px`;
      }
    };

    adjustSizes();

    const resizeObserver = new ResizeObserver(adjustSizes);
    resizeObserver.observe(gridContainer);

    return () => {
      resizeObserver.disconnect();
    };
  }, [areas.length, gridSelector, isMobile, mobileHeight, width]);

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
          return `col-start-${minCol} col-end-${maxCol + 1}`;
        }

        return "col-span-12";
      })()
    : startArea === endArea
      ? `row-start-${startArea} row-end-${startArea + 1}`
      : `row-start-${startArea} row-end-${endArea + 1}`;

  const baseClass = isMobile ? "w-full" : "h-full";

  return (
    <div
      ref={itemRef}
      className={`${className} border-accent border ${gridPositionClass} ${baseClass}`}
    >
      {children}
    </div>
  );
}

export default function RowGrid({ children, className = "" }: RowGridProps) {
  const isMobile = useMobile();

  const baseClass = isMobile
    ? "grid grid-cols-12 auto-rows-max grid-flow-row gap-0 w-full"
    : "grid grid-rows-12 auto-cols-max grid-flow-col gap-0 h-full min-w-max";

  const combinedClassName = className ? `${baseClass} ${className}` : baseClass;

  return <div className={combinedClassName}>{children}</div>;
}

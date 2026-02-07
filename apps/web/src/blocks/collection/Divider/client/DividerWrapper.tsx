"use client";

import {
  RiArrowDownLine,
  RiArrowRightLine,
  RiCheckboxBlankCircleFill,
  RiStarFill,
} from "@remixicon/react";

import type { DividerBlockConfig } from "@/blocks/collection/Divider/types";
import { ProcessedText } from "@/blocks/core/components";
import type { BlockComponentProps } from "@/blocks/core/definition";
import { getBlockRuntimeData } from "@/blocks/core/runtime/envelope";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import { useMobile } from "@/hooks/use-mobile";

/**
 * DividerBlock - 服务端组件
 * 装饰性分隔线区块
 */
export default function DividerBlockWrapper({ block }: BlockComponentProps) {
  const content = block.content as DividerBlockConfig["content"];
  const data = getBlockRuntimeData(block.runtime);

  const style = content.style || "line";
  const text = content.text || "";
  const icon = content.icon || "arrow";
  const color = content.color || "muted";
  const backgroundColor = content.backgroundColor || "background";
  const width = content.layout?.width ?? 0.1;
  const thickness = content.layout?.thickness ?? 1;

  const isMobile = useMobile();

  // 颜色映射
  const colorClass = {
    primary: "bg-primary text-primary",
    muted: "bg-muted-foreground/30 text-muted-foreground",
    accent: "bg-foreground text-foreground-foreground",
    background: "bg-background text-background-foreground",
  }[color];

  const textColorClass = {
    primary: "text-primary",
    muted: "text-muted-foreground",
    accent: "text-foreground-foreground",
    background: "text-background",
  }[color];

  // 线条粗细
  const thicknessClass = isMobile
    ? {
        1: "h-1",
        2: "h-2",
        3: "h-3",
        4: "h-4",
      }[thickness]
    : {
        1: "w-1",
        2: "w-2",
        3: "w-3",
        4: "w-4",
      }[thickness];

  // 图标组件
  const IconComponent = {
    arrow: isMobile ? RiArrowDownLine : RiArrowRightLine,
    star: RiStarFill,
    dot: RiCheckboxBlankCircleFill,
    diamond: DiamondIcon,
  }[icon];

  return (
    <RowGrid>
      <GridItem
        areas={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
        width={width}
        height={width}
        className={`flex items-center justify-center ${backgroundColor === "primary" ? "bg-primary" : "bg-background"}`}
      >
        <div className="flex flex-col items-center justify-center h-full w-full px-4">
          {/* 实线样式 */}
          {style === "line" && (
            <div
              className={`${isMobile ? "w-full mx-20" : "h-full my-20"} ${thicknessClass} ${colorClass}`}
            />
          )}

          {/* 点线样式 */}
          {style === "dotted" && (
            <div
              className={`flex ${!isMobile && "flex-col"} items-center gap-3 overflow-clip`}
            >
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${colorClass}`}
                />
              ))}
            </div>
          )}

          {/* 图标样式 */}
          {style === "icon" && IconComponent && (
            <div className={`${textColorClass}`}>
              <IconComponent className="w-8 h-8" />
            </div>
          )}

          {/* 文字样式 */}
          {style === "text" && text && (
            <div
              className={`${textColorClass} text-xl uppercase tracking-[0.3em] whitespace-nowrap`}
              style={
                isMobile
                  ? {}
                  : {
                      writingMode: "vertical-rl",
                      textOrientation: "mixed",
                    }
              }
              data-fade
            >
              <ProcessedText text={text} data={data} inline />
            </div>
          )}
        </div>
      </GridItem>
    </RowGrid>
  );
}

/**
 * 菱形图标组件
 */
function DiamondIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2L22 12L12 22L2 12L12 2Z" />
    </svg>
  );
}

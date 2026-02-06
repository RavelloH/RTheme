"use client";

import type { ReactNode } from "react";

import type { TimelineConnectionMode } from "@/blocks/collection/Timeline/types";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import { useMobile } from "@/hooks/use-mobile";
import { createArray } from "@/lib/client/create-array";

interface TimelineClientProps {
  /** 年份 */
  year: string;
  /** 月日 */
  monthDay: string;
  /** 宽高比 */
  ratio: number;
  /** 交换位置 */
  swapPosition: boolean;
  /** 连接模式 */
  connectionMode: TimelineConnectionMode;
  /** 颜色类 */
  yearColorClass: string;
  incompleteColorClass: string;
  bgClass: string;
  /** 标题元素 */
  titleElement: ReactNode;
  /** 描述元素 */
  descriptionElement: ReactNode;
  /** 图片元素 */
  imageElement: ReactNode;
  /** 链接元素 */
  linkElement: ReactNode;
}

/**
 * TimelineClient - 客户端组件
 * 根据设备类型选择渲染桌面或移动版时间线
 */
export default function TimelineClient({
  year,
  monthDay,
  ratio,
  swapPosition,
  connectionMode,
  yearColorClass,
  incompleteColorClass,
  bgClass,
  titleElement,
  descriptionElement,
  imageElement,
  linkElement,
}: TimelineClientProps) {
  const isMobile = useMobile();

  // 根据连接模式生成边框类名
  const getBorderClass = () => {
    switch (connectionMode) {
      case "start":
        return "border-r-0"; // 不显示右侧边框
      case "middle":
        return "border-l-0 border-r-0"; // 不显示左右侧边框
      case "end":
        return "border-l-0"; // 不显示左侧边框
      default:
        return ""; // standalone: 完整边框
    }
  };

  // 移动端边框类名（上下边框）
  const getMobileBorderClass = () => {
    switch (connectionMode) {
      case "start":
        return "border-b-0"; // 不显示底部边框
      case "middle":
        return "border-t-0 border-b-0"; // 不显示上下边框
      case "end":
        return "border-t-0"; // 不显示顶部边框
      default:
        return ""; // standalone: 完整边框
    }
  };

  // 是否需要显示左侧/顶部连接线
  const showStartConnector =
    connectionMode === "middle" || connectionMode === "end";
  // 是否需要显示右侧/底部连接线
  const showEndConnector =
    connectionMode === "start" || connectionMode === "middle";

  // 移动端：使用 RowGrid 的垂直时间线布局
  if (isMobile) {
    return (
      <RowGrid className={connectionMode !== "standalone" ? "!pb-0" : ""}>
        <GridItem
          areas={createArray(1, 12)}
          width={1}
          height={0.8}
          className={`relative ${getMobileBorderClass()}`}
        >
          <div className="flex h-full px-4 py-6">
            {/* 左侧：年份和月日 */}
            <div className="flex flex-col items-end pr-4 w-20 shrink-0">
              {year && (
                <div
                  className={`text-2xl font-bold ${yearColorClass} leading-tight`}
                >
                  {year}
                </div>
              )}
              {monthDay && (
                <div
                  className={`text-sm font-medium ${incompleteColorClass} mt-1`}
                >
                  {monthDay}
                </div>
              )}
            </div>

            {/* 中间：垂直时间线 */}
            <div className="flex flex-col items-center shrink-0 relative">
              {/* 顶部连接线（middle/end 模式显示，延伸到容器外） */}
              {showStartConnector && (
                <div className="w-px bg-border absolute bottom-full h-8" />
              )}
              {/* 时间点圆点 */}
              <div className={`w-3 h-3 rounded-full ${bgClass} shrink-0`} />
              {/* 垂直线 */}
              <div className="w-px flex-1 bg-border min-h-[60px]" />
              {/* 底部连接线（start/middle 模式显示，延伸到容器外） */}
              {showEndConnector && (
                <div className="w-px bg-border absolute top-full h-4" />
              )}
            </div>

            {/* 右侧：内容 */}
            <div className="flex flex-col pl-4 flex-1 min-w-0">
              {titleElement}
              {descriptionElement}
              {imageElement}
              {linkElement}
            </div>
          </div>
        </GridItem>
      </RowGrid>
    );
  }

  // 桌面端：横向时间线布局
  return (
    <RowGrid>
      <GridItem
        areas={createArray(1, 12)}
        width={ratio}
        height={1}
        className={`flex flex-col px-8 relative ${getBorderClass()}`}
      >
        {/* 上半部分：时间或内容，底部对齐 */}
        <div className="flex-1 flex flex-col justify-end pb-4">
          {swapPosition ? (
            <>
              {titleElement}
              {descriptionElement}
              {imageElement}
              {linkElement}
            </>
          ) : (
            <>
              {/* 年份 - 单独一行 */}
              {year && (
                <div
                  className={`text-6xl font-bold ${yearColorClass} mb-2`}
                  data-fade-char
                >
                  {year}
                </div>
              )}

              {/* 月日 */}
              {monthDay && (
                <div
                  className={`text-3xl font-medium ${incompleteColorClass}`}
                  data-fade-char
                >
                  {monthDay}
                </div>
              )}
            </>
          )}
        </div>

        {/* 时间点指示器 - 绝对居中 */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 flex items-center w-full">
          {/* 左侧连接线（middle/end 模式显示，延伸到容器外） */}
          {showStartConnector && (
            <div className="h-px bg-border w-8 shrink-0" />
          )}
          {/* 左侧内边距 */}
          {!showStartConnector && <div className="w-8 shrink-0" />}
          {/* 圆点 */}
          <div className={`w-3 h-3 rounded-full ${bgClass} shrink-0`} />
          {/* 右侧时间线 */}
          <div className="flex-1 h-px bg-border" />
          {/* 右侧连接线（start/middle 模式显示，延伸到容器外） */}
          {showEndConnector && <div className="h-px bg-border w-8 shrink-0" />}
          {/* 右侧内边距 */}
          {!showEndConnector && <div className="w-8 shrink-0" />}
        </div>

        {/* 下半部分：内容或时间，顶部对齐 */}
        <div className="flex-1 flex flex-col justify-start pt-4">
          {swapPosition ? (
            <>
              {/* 年份 - 单独一行 */}
              {year && (
                <div
                  className={`text-6xl font-bold ${yearColorClass} mb-2`}
                  data-fade-char
                >
                  {year}
                </div>
              )}

              {/* 月日 */}
              {monthDay && (
                <div
                  className={`text-3xl font-medium ${incompleteColorClass}`}
                  data-fade-char
                >
                  {monthDay}
                </div>
              )}
            </>
          ) : (
            <>
              {titleElement}
              {descriptionElement}
              {imageElement}
              {linkElement}
            </>
          )}
        </div>
      </GridItem>
    </RowGrid>
  );
}

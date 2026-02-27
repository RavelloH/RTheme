"use client";

import { useEffect, useRef, useState } from "react";

import type {
  ArchiveCalendarBlockConfig,
  ArchiveCalendarData,
  DayData,
  YearData,
} from "@/blocks/collection/ArchiveCalendar/types";
import type { BlockComponentProps } from "@/blocks/core/definition";
import { getBlockRuntimeData } from "@/blocks/core/runtime/envelope";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import { useMobile } from "@/hooks/use-mobile";
import { Tooltip } from "@/ui/Tooltip";

const MONTH_NAMES = [
  "一月",
  "二月",
  "三月",
  "四月",
  "五月",
  "六月",
  "七月",
  "八月",
  "九月",
  "十月",
  "十一月",
  "十二月",
];

const MONTH_SHORT = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
];

const WEEKDAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

/**
 * 将日期数据按周组织，用于 GitHub 风格热力图
 */
function organizeByWeeks(days: DayData[]): DayData[][] {
  if (days.length === 0) return [];

  const weeks: DayData[][] = [];
  let currentWeek: DayData[] = [];

  // 获取第一天是星期几
  const firstDay = days[0];
  if (!firstDay) return [];
  const firstDate = new Date(firstDay.date);
  const firstDayOfWeek = firstDate.getDay();

  // 在第一周前面填充空位
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push({ date: "", count: -1 }); // -1 表示空位
  }

  for (const day of days) {
    const date = new Date(day.date);
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }

    currentWeek.push(day);
  }

  // 处理最后一周
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}

/**
 * 获取某天所在的月份索引（0-11）
 */
function getMonthFromDate(dateStr: string): number {
  const date = new Date(dateStr);
  return date.getMonth();
}

/**
 * 移动端热力图组件 - 分两行显示（1-6月、7-12月），自适应宽度
 */
function MobileHeatmap({
  yearData,
  getHeatmapColorByDay,
}: {
  yearData: YearData;
  getHeatmapColorByDay: (count: number) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState<number>(10);

  const allDays = yearData.days || [];

  // 按月份分成两组
  const firstHalfDays = allDays.filter((day) => {
    if (day.count < 0 || !day.date) return false;
    const month = new Date(day.date).getMonth();
    return month < 6; // 1-6月
  });

  const secondHalfDays = allDays.filter((day) => {
    if (day.count < 0 || !day.date) return false;
    const month = new Date(day.date).getMonth();
    return month >= 6; // 7-12月
  });

  const firstHalfWeeks = organizeByWeeks(firstHalfDays);
  const secondHalfWeeks = organizeByWeeks(secondHalfDays);

  // 计算最大周数（用于计算 cellSize）
  const maxWeeks = Math.max(firstHalfWeeks.length, secondHalfWeeks.length);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const calculateCellSize = () => {
      const containerWidth = container.clientWidth;
      // 左侧星期标签宽度
      const labelWidth = 20;
      const availableWidth = containerWidth - labelWidth;

      if (maxWeeks === 0) return;

      const gapSize = 2;
      const maxCellWidth = Math.floor(
        (availableWidth - (maxWeeks - 1) * gapSize) / maxWeeks,
      );

      // 限制格子大小在合理范围内
      const size = Math.max(6, Math.min(14, maxCellWidth));
      setCellSize(size);
    };

    calculateCellSize();

    const resizeObserver = new ResizeObserver(calculateCellSize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [maxWeeks]);

  const gapSize = 2;

  const renderRow = (weeks: DayData[][], rowIndex: number) => {
    // 计算月份标签
    const monthLabels: { month: number; weekIdx: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, idx) => {
      const validDay = week.find((d) => d.count >= 0);
      if (validDay) {
        const month = getMonthFromDate(validDay.date);
        if (month !== lastMonth) {
          monthLabels.push({ month, weekIdx: idx });
          lastMonth = month;
        }
      }
    });

    return (
      <div key={rowIndex} className="flex flex-col mb-4">
        {/* 月份标签 */}
        <div className="flex mb-1 relative h-4" style={{ marginLeft: 20 }}>
          {monthLabels.map(({ month, weekIdx }) => (
            <span
              key={`${rowIndex}-${month}`}
              className="text-xs text-muted-foreground absolute"
              style={{ left: weekIdx * (cellSize + gapSize) }}
            >
              {MONTH_SHORT[month]}月
            </span>
          ))}
        </div>

        {/* 热力图主体 */}
        <div className="flex">
          {/* 星期标签 */}
          <div
            className="flex flex-col shrink-0 text-xs text-muted-foreground"
            style={{ width: 18, gap: gapSize }}
          >
            {WEEKDAY_NAMES.map((day, idx) => (
              <span
                key={idx}
                className="flex items-center justify-center"
                style={{ height: cellSize }}
              >
                {idx % 2 === 1 ? day : ""}
              </span>
            ))}
          </div>

          {/* 日期格子 */}
          <div className="flex" style={{ gap: gapSize }}>
            {weeks.map((week, weekIdx) => (
              <div
                key={weekIdx}
                className="flex flex-col"
                style={{ gap: gapSize }}
              >
                {Array.from({ length: 7 }, (_, dayIdx) => {
                  const day = week[dayIdx];
                  if (!day || day.count < 0) {
                    return (
                      <div
                        key={`${rowIndex}-${weekIdx}-${dayIdx}`}
                        className="rounded-sm"
                        style={{ width: cellSize, height: cellSize }}
                      />
                    );
                  }
                  return (
                    <span
                      key={day.date}
                      className={`block rounded-sm ${getHeatmapColorByDay(day.count)}`}
                      style={{ width: cellSize, height: cellSize }}
                    >
                      <span className="sr-only">
                        {day.date}: {day.count} 篇
                      </span>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="flex flex-col w-full">
      {renderRow(firstHalfWeeks, 0)}
      {renderRow(secondHalfWeeks, 1)}
    </div>
  );
}

/**
 * 桌面端热力图组件 - 自适应容器高度
 */
function DesktopHeatmap({
  yearData,
  getHeatmapColorByDay,
}: {
  yearData: YearData;
  getHeatmapColorByDay: (count: number) => string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState<number>(12);

  // 按月份分割原始日期数据，然后分别生成周数组
  const allDays = yearData.days || [];

  // 1-6 月的日期
  const firstHalfDays = allDays.filter((day) => {
    if (day.count < 0 || !day.date) return false;
    const month = new Date(day.date).getMonth();
    return month < 6; // 0-5 月（1-6 月）
  });

  // 7-12 月的日期
  const secondHalfDays = allDays.filter((day) => {
    if (day.count < 0 || !day.date) return false;
    const month = new Date(day.date).getMonth();
    return month >= 6; // 6-11 月（7-12 月）
  });

  // 分别生成周数组
  const firstHalfWeeks = organizeByWeeks(firstHalfDays);
  const secondHalfWeeks = organizeByWeeks(secondHalfDays);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const calculateCellSize = () => {
      const containerHeight = container.clientHeight;
      // 星期标签行高度
      const headerHeight = 20;
      const availableHeight = containerHeight - headerHeight;
      const rowCount = Math.max(firstHalfWeeks.length, secondHalfWeeks.length);

      if (rowCount === 0) return;

      const gapSize = 2;
      const maxCellHeight = Math.floor(
        (availableHeight - (rowCount - 1) * gapSize) / rowCount,
      );

      // 不设上限，让格子尽可能填满
      const size = Math.max(4, maxCellHeight);
      setCellSize(size);
    };

    calculateCellSize();

    const resizeObserver = new ResizeObserver(calculateCellSize);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [firstHalfWeeks.length, secondHalfWeeks.length]);

  const gapSize = 2;

  const renderHalf = (halfWeeks: DayData[][], halfIndex: number) => {
    // 计算月份标签
    const monthLabels: { month: number; relativeIdx: number }[] = [];
    let lastMonth = -1;
    halfWeeks.forEach((week, idx) => {
      const validDay = week.find((d) => d.count >= 0);
      if (validDay) {
        const month = getMonthFromDate(validDay.date);
        if (month !== lastMonth) {
          monthLabels.push({ month, relativeIdx: idx });
          lastMonth = month;
        }
      }
    });

    const gridWidth = cellSize * 7 + gapSize * 6;
    const gridHeight =
      cellSize * halfWeeks.length + gapSize * (halfWeeks.length - 1);

    return (
      <div key={halfIndex} className="flex flex-col h-full">
        {/* 星期标签（横向） */}
        <div
          className="flex shrink-0"
          style={{
            width: gridWidth,
            gap: gapSize,
            marginLeft: 28,
            marginBottom: 6,
          }}
        >
          {WEEKDAY_NAMES.map((day, idx) => (
            <span
              key={idx}
              className="text-xs text-muted-foreground text-center leading-none"
              style={{ width: cellSize }}
            >
              {day}
            </span>
          ))}
        </div>

        {/* 热力图主体 */}
        <div className="flex flex-1">
          {/* 月份标签（纵向） */}
          <div
            className="shrink-0 relative"
            style={{ width: 24, height: gridHeight }}
          >
            {monthLabels.map(({ month, relativeIdx }) => (
              <span
                key={`${halfIndex}-${month}-${relativeIdx}`}
                className="text-xs text-muted-foreground absolute whitespace-nowrap leading-none"
                style={{
                  top: relativeIdx * (cellSize + gapSize),
                  right: 6,
                }}
              >
                {MONTH_SHORT[month]}月
              </span>
            ))}
          </div>

          {/* 日期格子网格 */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(7, ${cellSize}px)`,
              gridTemplateRows: `repeat(${halfWeeks.length}, ${cellSize}px)`,
              gap: gapSize,
            }}
          >
            {halfWeeks.flatMap((week, weekIdx) =>
              Array.from({ length: 7 }, (_, dayIdx) => {
                const day = week[dayIdx];
                if (!day || day.count < 0) {
                  return (
                    <div
                      key={`${halfIndex}-${weekIdx}-${dayIdx}`}
                      className="rounded-sm"
                      style={{ width: cellSize, height: cellSize }}
                    />
                  );
                }
                const linkElement = (
                  <span
                    className={`block rounded-sm transition-all hover:scale-110 hover:ring-1 hover:ring-primary hover:z-10 ${getHeatmapColorByDay(day.count)}`}
                    style={{ width: cellSize, height: cellSize }}
                  >
                    <span className="sr-only">
                      {day.date}: {day.count} 篇
                    </span>
                  </span>
                );
                // 只有当天有文章时才显示 Tooltip
                if (day.count === 0) {
                  return <div key={day.date}>{linkElement}</div>;
                }
                return (
                  <Tooltip
                    key={day.date}
                    content={
                      <div className="text-center">
                        <div className="font-medium">{day.date}</div>
                        <div className="text-muted-foreground">
                          {day.count} 篇文章
                        </div>
                      </div>
                    }
                    placement="top"
                    delay={100}
                  >
                    {linkElement}
                  </Tooltip>
                );
              }),
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-start justify-center min-h-0 h-full pt-1"
    >
      <div className="flex gap-8 h-full">
        {renderHalf(firstHalfWeeks, 0)}
        {renderHalf(secondHalfWeeks, 1)}
      </div>
    </div>
  );
}

/**
 * ArchiveCalendarBlock - 客户端组件（需要检测设备类型）
 * 展示文章归档日历
 */
export default function ArchiveCalendarBlock({ block }: BlockComponentProps) {
  const content = block.content as ArchiveCalendarBlockConfig["content"];
  const data = getBlockRuntimeData<ArchiveCalendarData>(block.runtime);
  const isMobile = useMobile();

  const archiveData: YearData[] = data.archiveData || [];
  const style = content.layout?.style || "calendar";
  const showStats = content.layout?.showStats ?? true;
  const ratio = content.layout?.ratio ?? 0.6;

  if (archiveData.length === 0) {
    return null;
  }

  // 计算最大值用于热力图（按天）
  const maxDayCount = Math.max(
    ...archiveData.flatMap((y) => (y.days || []).map((d) => d.count)),
    1,
  );

  // 热力图颜色（按天）
  const getHeatmapColorByDay = (count: number) => {
    if (count === 0) return "bg-muted/30";
    if (count < 0) return "bg-transparent";
    const intensity = count / maxDayCount;
    if (intensity < 0.25) return "bg-primary/30";
    if (intensity < 0.5) return "bg-primary/50";
    if (intensity < 0.75) return "bg-primary/70";
    return "bg-primary/90";
  };

  return (
    <RowGrid>
      {archiveData.map((yearData, _yearIndex) => (
        <GridItem
          key={yearData.year}
          areas={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
          width={ratio}
          height={0.5}
          className="flex flex-col p-10"
        >
          {/* 年份标题 */}
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-5xl font-bold" data-fade-char>
              {yearData.year}
            </h3>
            {showStats && (
              <span className="text-xl text-muted-foreground">
                {yearData.total} 篇文章
              </span>
            )}
          </div>

          {/* 日历样式 */}
          {style === "calendar" && (
            <div className="grid grid-cols-4 gap-3 flex-1" data-line-reveal>
              {yearData.months.map((monthData) => (
                <span
                  key={monthData.month}
                  className={`flex flex-col items-center justify-center p-3 transition-all hover:bg-primary/10 ${
                    monthData.count > 0 ? "" : "opacity-40"
                  }`}
                >
                  <span className="text-sm text-muted-foreground">
                    {MONTH_NAMES[monthData.month - 1]}
                  </span>
                  <span className="text-2xl font-medium">
                    {monthData.count}
                  </span>
                </span>
              ))}
            </div>
          )}

          {/* 热力图样式 - GitHub 风格，显示全年每一天 */}
          {style === "heatmap" && (
            <div className="flex-1 flex flex-col">
              {isMobile ? (
                // 移动端：分三行显示（1-4月、5-8月、9-12月）
                <MobileHeatmap
                  yearData={yearData}
                  getHeatmapColorByDay={getHeatmapColorByDay}
                />
              ) : (
                // 桌面端：分两列显示，自适应高度
                <DesktopHeatmap
                  yearData={yearData}
                  getHeatmapColorByDay={getHeatmapColorByDay}
                />
              )}

              {/* 图例 */}
              <div className="flex items-center justify-end gap-1 mt-2 text-xs text-muted-foreground">
                <span>少</span>
                <div className="w-2 h-2 rounded-sm bg-muted/30" />
                <div className="w-2 h-2 rounded-sm bg-primary/30" />
                <div className="w-2 h-2 rounded-sm bg-primary/50" />
                <div className="w-2 h-2 rounded-sm bg-primary/70" />
                <div className="w-2 h-2 rounded-sm bg-primary/90" />
                <span>多</span>
              </div>
            </div>
          )}

          {/* 列表样式 - 显示所有月份，包括没有文章的 */}
          {style === "list" && (
            <div className="space-y-2 flex-1" data-line-reveal>
              {yearData.months.map((monthData) => (
                <span
                  key={monthData.month}
                  className={`flex items-center justify-between py-2 px-4 hover:bg-muted/50 transition-colors ${
                    monthData.count === 0 ? "opacity-50" : ""
                  }`}
                >
                  <span>{MONTH_NAMES[monthData.month - 1]}</span>
                  <span
                    className={`font-medium ${monthData.count > 0 ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {monthData.count} 篇
                  </span>
                </span>
              ))}
            </div>
          )}
        </GridItem>
      ))}
    </RowGrid>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { AnimatePresence, motion } from "framer-motion";

import { AutoResizer } from "@/ui/AutoResizer";

export interface BarChartDataPoint {
  time: string; // ISO 8601 格式的时间字符串
  [key: string]: string | number;
}

export interface SeriesConfig {
  key: string;
  label: string;
  color: string;
}

export type TimeGranularity = "year" | "month" | "day" | "hour" | "minute";
export type ShowYearStrategy = "auto" | "always" | "never";

interface BarChartProps {
  data: BarChartDataPoint[];
  series: SeriesConfig[];
  className?: string;
  onHover?: (point: BarChartDataPoint | null) => void;
  showLegend?: boolean;
  formatValue?: (value: number, key: string) => string;
  formatTime?: (time: string) => string; // 自定义时间格式化函数
  timeGranularity?: TimeGranularity; // 时间显示精度，默认 "day"
  showYear?: ShowYearStrategy; // 年份显示策略，默认 "auto"（跨年时显示）
  fillMissingData?: boolean; // 是否填充缺失的数据点为 0，默认 false
  overlappingBars?: boolean; // 是否启用柱子重叠模式，默认 false
}

export default function BarChart({
  data,
  series,
  className = "",
  onHover,
  showLegend = true,
  formatValue = (value: number) => value.toString(),
  formatTime,
  timeGranularity = "day",
  showYear: showYearProp = "auto",
  fillMissingData = false,
  overlappingBars = false,
}: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    screenY: number;
    data: BarChartDataPoint;
  } | null>(null);

  // 数据访问器
  const getDate = (d: BarChartDataPoint) => new Date(d.time);

  // 时间归一化函数：根据粒度统一时间格式
  const normalizeTime = (date: Date, granularity: TimeGranularity): string => {
    // 使用 UTC 时间以避免时区问题
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hour = String(date.getUTCHours()).padStart(2, "0");
    const minute = String(date.getUTCMinutes()).padStart(2, "0");

    switch (granularity) {
      case "year":
        return `${year}-01-01T00:00:00.000Z`;
      case "month":
        return `${year}-${month}-01T00:00:00.000Z`;
      case "day":
        return `${year}-${month}-${day}T00:00:00.000Z`;
      case "hour":
        return `${year}-${month}-${day}T${hour}:00:00.000Z`;
      case "minute":
        return `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;
      default:
        return date.toISOString();
    }
  };

  // 数据填充逻辑：填充缺失的时间点
  const filledData = fillMissingData
    ? (() => {
        if (data.length === 0) return data;

        // 将原始数据归一化并建立映射
        const normalizedDataMap = new Map<string, BarChartDataPoint>();
        data.forEach((d) => {
          const normalizedTime = normalizeTime(
            new Date(d.time),
            timeGranularity,
          );
          normalizedDataMap.set(normalizedTime, { ...d, time: normalizedTime });
        });

        // 生成完整的时间序列
        const dates = Array.from(normalizedDataMap.keys()).map(
          (t) => new Date(t),
        );
        const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

        const timePoints: string[] = [];
        const currentDate = new Date(minDate);

        // 根据时间粒度生成时间点
        while (currentDate <= maxDate) {
          const normalizedTime = normalizeTime(currentDate, timeGranularity);
          timePoints.push(normalizedTime);

          // 根据粒度增加时间
          switch (timeGranularity) {
            case "minute":
              currentDate.setMinutes(currentDate.getMinutes() + 1);
              break;
            case "hour":
              currentDate.setHours(currentDate.getHours() + 1);
              break;
            case "day":
              currentDate.setDate(currentDate.getDate() + 1);
              break;
            case "month":
              currentDate.setMonth(currentDate.getMonth() + 1);
              break;
            case "year":
              currentDate.setFullYear(currentDate.getFullYear() + 1);
              break;
          }
        }

        // 填充缺失的数据点
        return timePoints.map((time) => {
          if (normalizedDataMap.has(time)) {
            return normalizedDataMap.get(time)!;
          }
          // 创建零值数据点
          const zeroPoint: BarChartDataPoint = { time };
          series.forEach((s) => {
            zeroPoint[s.key] = 0;
          });
          return zeroPoint;
        });
      })()
    : data;

  // 检查数据是否跨年
  const isDataCrossYear = () => {
    if (filledData.length === 0) return false;
    const dates = filledData.map((d) => getDate(d));
    const years = new Set(dates.map((d) => d.getFullYear()));
    return years.size > 1;
  };

  // 根据策略决定是否显示年份
  const shouldShowYear =
    showYearProp === "always"
      ? true
      : showYearProp === "never"
        ? false
        : isDataCrossYear(); // auto

  // 默认时间格式化函数
  const defaultFormatTime = (time: string) => {
    // 确保 time 是字符串类型
    const timeStr = typeof time === "string" ? time : String(time);

    const date = new Date(timeStr);
    if (isNaN(date.getTime())) {
      return timeStr; // 如果无法解析，返回原始字符串
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");

    // 根据精度级别构建格式
    const yearPart = shouldShowYear ? `${year}/` : "";

    switch (timeGranularity) {
      case "year":
        return `${year}`;
      case "month":
        return `${yearPart}${month}`;
      case "day":
        return `${yearPart}${month}/${day}`;
      case "hour":
        return `${yearPart}${month}/${day} ${hour}:00`;
      case "minute":
        return `${yearPart}${month}/${day} ${hour}:${minute}`;
      default:
        return `${yearPart}${month}/${day}`;
    }
  };

  const timeFormatter = formatTime || defaultFormatTime;

  // 监听容器大小变化
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  if (filledData.length === 0) {
    return (
      <div
        ref={containerRef}
        className={`${className} flex items-center justify-center`}
      >
        <div className="text-base-content/50">暂无数据</div>
      </div>
    );
  }

  if (dimensions.width === 0 || dimensions.height === 0) {
    return <div ref={containerRef} className={`${className}`} />;
  }

  const margin = { top: 0, right: 0, bottom: 0, left: 0 };
  const innerWidth = dimensions.width - margin.left - margin.right;
  const innerHeight = dimensions.height - margin.top - margin.bottom;

  const getValue = (d: BarChartDataPoint, key: string) => {
    const value = d[key];
    return typeof value === "number" ? value : 0;
  };

  // X轴比例尺
  const xScale = scaleBand<string>({
    domain: filledData.map((d) => d.time),
    range: [0, innerWidth],
    padding: 0.3, // 柱子之间的间距
  });

  // 计算每个系列需要的宽度
  const barGroupWidth = xScale.bandwidth();
  const barWidth = overlappingBars
    ? barGroupWidth // 重叠模式下每个柱子占满整个宽度
    : barGroupWidth / series.length; // 分组模式下平分宽度

  // 计算所有系列的最大值
  const maxValue = Math.max(
    ...filledData.flatMap((d) => series.map((s) => getValue(d, s.key))),
    1, // 至少为 1，避免空图表
  );

  const yScale = scaleLinear({
    domain: [0, maxValue * 1.1],
    range: [innerHeight, 0],
  });

  // 处理交互（鼠标或触摸）
  const handleInteraction = (
    clientX: number,
    clientY: number,
    target: SVGSVGElement,
  ) => {
    const rect = target.getBoundingClientRect();
    const x = clientX - rect.left - margin.left;
    const y = clientY - rect.top;

    if (x < 0 || x > innerWidth) {
      setHoveredPoint(null);
      onHover?.(null);
      return;
    }

    // 找到最接近的柱子（而不是严格要求鼠标在柱子上）
    const closestData = filledData.reduce((prev, curr) => {
      const prevBarX = xScale(prev.time) ?? 0;
      const currBarX = xScale(curr.time) ?? 0;
      const prevCenter = prevBarX + barGroupWidth / 2;
      const currCenter = currBarX + barGroupWidth / 2;
      const prevDiff = Math.abs(x - prevCenter);
      const currDiff = Math.abs(x - currCenter);
      return currDiff < prevDiff ? curr : prev;
    });

    setHoveredPoint({
      x: clientX - rect.left,
      y: y,
      screenY: clientY, // 保存屏幕 Y 坐标用于判断方向
      data: closestData,
    });
    onHover?.(closestData);
  };

  // 处理鼠标移动
  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    handleInteraction(event.clientX, event.clientY, event.currentTarget);
  };

  // 处理触摸移动
  const handleTouchMove = (event: React.TouchEvent<SVGSVGElement>) => {
    event.preventDefault(); // 防止触摸时滚动页面
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      if (touch) {
        handleInteraction(touch.clientX, touch.clientY, event.currentTarget);
      }
    }
  };

  // 处理触摸开始
  const handleTouchStart = (event: React.TouchEvent<SVGSVGElement>) => {
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      if (touch) {
        handleInteraction(touch.clientX, touch.clientY, event.currentTarget);
      }
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    onHover?.(null);
  };

  // 处理触摸结束
  const handleTouchEnd = () => {
    setHoveredPoint(null);
    onHover?.(null);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <svg
        width={dimensions.width}
        height={dimensions.height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-full"
      >
        <Group left={margin.left} top={margin.top}>
          {/* hover 背景高亮 */}
          <AnimatePresence>
            {hoveredPoint && (
              <motion.rect
                key="hover-background"
                y={0}
                width={barGroupWidth + 8}
                height={innerHeight}
                fill="currentColor"
                className="pointer-events-none"
                initial={{
                  opacity: 0,
                  x: (xScale(hoveredPoint.data.time) || 0) - 4,
                }}
                animate={{
                  opacity: 0.08,
                  x: (xScale(hoveredPoint.data.time) || 0) - 4,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>

          {/* 绘制柱状图 */}
          {filledData.map((d) => {
            const timeValue = d.time;
            const barX = xScale(timeValue) || 0;

            // 如果是重叠模式，按值从大到小排序系列
            const sortedSeries = overlappingBars
              ? [...series].sort(
                  (a, b) => getValue(d, b.key) - getValue(d, a.key),
                )
              : series;

            return (
              <Group key={timeValue}>
                {sortedSeries.map((s, index) => {
                  const value = getValue(d, s.key);
                  const barHeight = innerHeight - yScale(value);

                  // 计算 x 位置
                  const x = overlappingBars
                    ? barX // 重叠模式：所有柱子起始位置相同
                    : barX + index * barWidth; // 分组模式：依次排列

                  const y = yScale(value);

                  return (
                    <rect
                      key={`${timeValue}-${s.key}`}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill={s.color}
                      className="transition-opacity duration-200 hover:opacity-80"
                    />
                  );
                })}
              </Group>
            );
          })}
        </Group>
      </svg>

      {/* 悬停提示 */}
      {hoveredPoint && (
        <div
          className="absolute pointer-events-none bg-background border border-border rounded-lg p-3 shadow-lg z-10"
          style={{
            left: `${Math.min(hoveredPoint.x + 10, dimensions.width - 150)}px`,
            // 根据鼠标在屏幕中的位置决定菜单方向：上半部分向下，下半部分向上
            ...(hoveredPoint.screenY < window.innerHeight / 2
              ? { top: `${hoveredPoint.y + 10}px` }
              : { bottom: `${dimensions.height - hoveredPoint.y + 10}px` }),
            transform: "translateZ(0)", // 强制 GPU 加速
          }}
        >
          <div className="text-sm font-medium mb-2 whitespace-nowrap">
            {timeFormatter(hoveredPoint.data.time)}
          </div>
          {showLegend && (
            <AutoResizer duration={0.2}>
              <div className="space-y-1 text-xs">
                {series.map((s) => {
                  const value = getValue(hoveredPoint.data, s.key);
                  // 如果开启了 fillMissingData，显示所有系列（包括 0 值）
                  // 否则只显示有值的系列
                  if (!fillMissingData && value === 0) return null;
                  return (
                    <div key={s.key} className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: s.color }}
                      />
                      <span style={{ color: s.color }}>
                        {s.label}: {formatValue(value, s.key)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </AutoResizer>
          )}
        </div>
      )}
    </div>
  );
}

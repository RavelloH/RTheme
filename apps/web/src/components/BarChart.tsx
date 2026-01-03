"use client";

import { useEffect, useState, useRef } from "react";
import { scaleLinear, scaleBand } from "@visx/scale";
import { Bar } from "@visx/shape";
import { Group } from "@visx/group";
import { AutoResizer } from "@/ui/AutoResizer";
import { motion, AnimatePresence } from "framer-motion";

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

  // 检查数据是否跨年
  const isDataCrossYear = () => {
    if (data.length === 0) return false;
    const dates = data.map((d) => getDate(d));
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

  if (data.length === 0) {
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
    domain: data.map((d) => d.time),
    range: [0, innerWidth],
    padding: 0.2,
  });

  // 计算每个系列需要的宽度
  const barGroupWidth = xScale.bandwidth();
  const barWidth = barGroupWidth / series.length;

  // Y轴比例尺 - 找出所有系列的最大值
  const maxValue = Math.max(
    ...data.flatMap((d) => series.map((s) => getValue(d, s.key))),
    1,
  );

  const yScale = scaleLinear({
    domain: [0, maxValue * 1.1],
    range: [innerHeight, 0],
  });

  // 处理交互
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

    // 查找最近的数据点
    const timeValue = xScale.domain().find((time) => {
      const barX = xScale(time) || 0;
      return x >= barX && x <= barX + barGroupWidth;
    });

    if (timeValue) {
      const dataPoint = data.find((d) => d.time === timeValue);
      if (dataPoint) {
        const barX = (xScale(timeValue) || 0) + barGroupWidth / 2;
        const screenY = y + rect.top;
        setHoveredPoint({ x: barX, y, screenY, data: dataPoint });
        onHover?.(dataPoint);
      }
    } else {
      setHoveredPoint(null);
      onHover?.(null);
    }
  };

  const handleMouseMove = (event: React.MouseEvent<SVGSVGElement>) => {
    handleInteraction(event.clientX, event.clientY, event.currentTarget);
  };

  const handleTouchMove = (event: React.TouchEvent<SVGSVGElement>) => {
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

  return (
    <div ref={containerRef} className={`${className} relative`}>
      <svg
        width={dimensions.width}
        height={dimensions.height}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onMouseLeave={handleMouseLeave}
        onTouchEnd={handleMouseLeave}
        style={{ cursor: "crosshair" }}
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
          {data.map((d) => {
            const timeValue = d.time;
            const barX = xScale(timeValue) || 0;

            return (
              <Group key={timeValue}>
                {series.map((s, index) => {
                  const value = getValue(d, s.key);
                  const barHeight = innerHeight - yScale(value);
                  const x = barX + index * barWidth;
                  const y = yScale(value);

                  return (
                    <Bar
                      key={`${timeValue}-${s.key}`}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill={s.color}
                      opacity={0.8}
                    />
                  );
                })}
              </Group>
            );
          })}

          {/* hover 指示线 */}
          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              x2={hoveredPoint.x}
              y1={0}
              y2={innerHeight}
              stroke="currentColor"
              strokeWidth={1}
              strokeDasharray="4 4"
              opacity={0.5}
              pointerEvents="none"
            />
          )}
        </Group>
      </svg>

      {/* Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute pointer-events-none z-50"
          style={{
            left: `${hoveredPoint.x + margin.left}px`,
            top:
              hoveredPoint.screenY > window.innerHeight / 2
                ? `${hoveredPoint.y - 20}px`
                : `${hoveredPoint.y + 20}px`,
            transform:
              hoveredPoint.x > innerWidth / 2
                ? "translate(-100%, -100%)"
                : "translateY(-100%)",
          }}
        >
          <div className="bg-base-100 border border-base-300 rounded-lg shadow-lg p-3 min-w-[150px]">
            <div className="text-sm font-medium mb-2">
              {timeFormatter(hoveredPoint.data.time)}
            </div>
            {showLegend && (
              <AutoResizer duration={0.2}>
                <div className="space-y-1">
                  {series.map((s) => (
                    <div
                      key={s.key}
                      className="flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="text-xs text-base-content/70">
                          {s.label}
                        </span>
                      </div>
                      <span className="text-xs font-medium">
                        {formatValue(getValue(hoveredPoint.data, s.key), s.key)}
                      </span>
                    </div>
                  ))}
                </div>
              </AutoResizer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

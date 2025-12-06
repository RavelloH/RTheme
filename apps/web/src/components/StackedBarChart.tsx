"use client";

import { useEffect, useState, useRef } from "react";
import { scaleLinear, scaleBand } from "@visx/scale";
import { BarStack } from "@visx/shape";
import { Group } from "@visx/group";

export interface StackedBarChartDataPoint {
  time: string;
  [key: string]: string | number;
}

export interface SeriesConfig {
  key: string;
  label: string;
  color: string; // 可以是 CSS 变量或颜色值，如 "oklch(var(--p))" 或 "#3b82f6"
}

interface StackedBarChartProps {
  data: StackedBarChartDataPoint[];
  series: SeriesConfig[]; // 要显示的数据系列配置
  className?: string;
  onHover?: (point: StackedBarChartDataPoint | null) => void;
  showLegend?: boolean; // 是否在 tooltip 中显示图例
  formatValue?: (value: number, key: string) => string; // 自定义值格式化函数
  formatTime?: (time: string) => string; // 自定义时间格式化函数
}

export default function StackedBarChart({
  data,
  series,
  className = "",
  onHover,
  showLegend = true,
  formatValue = (value: number) => value.toString(),
  formatTime,
}: StackedBarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    screenY: number; // 屏幕 Y 坐标用于判断方向
    data: StackedBarChartDataPoint;
  } | null>(null);

  // 默认时间格式化函数
  const defaultFormatTime = (time: string) => {
    const date = new Date(time);
    if (isNaN(date.getTime())) {
      return time; // 如果无法解析，返回原始字符串
    }

    // 检查是否包含时间部分（小时不为0或者时间戳精确到小时）
    const hasTime = time.includes("T") || time.includes(":");

    if (hasTime) {
      return date.toLocaleDateString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
      });
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

  // 如果没有数据，显示提示
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

  // 如果容器尺寸还没有获取到，显示空容器等待 ResizeObserver
  if (dimensions.width === 0 || dimensions.height === 0) {
    return <div ref={containerRef} className={`${className}`} />;
  }

  const margin = { top: 0, right: 0, bottom: 0, left: 0 };
  const innerWidth = dimensions.width - margin.left - margin.right;
  const innerHeight = dimensions.height - margin.top - margin.bottom;

  // 数据访问器
  const getValue = (d: StackedBarChartDataPoint, key: string) => {
    const value = d[key];
    return typeof value === "number" ? value : 0;
  };

  // 创建 X 轴比例尺（使用 scaleBand 用于柱状图）
  const xScale = scaleBand<string>({
    domain: data.map((d) => d.time),
    range: [0, innerWidth],
    padding: 0.3, // 柱子之间的间距
  });

  // 计算堆叠后的最大值
  const maxStackedValue = Math.max(
    ...data.map((d) => series.reduce((sum, s) => sum + getValue(d, s.key), 0)),
    1, // 至少为 1，避免空图表
  );

  const yScale = scaleLinear({
    domain: [0, maxStackedValue * 1.1],
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

    // 找到对应的柱子
    const bandwidth = xScale.bandwidth();
    const hoveredTime = data.find((d) => {
      const barX = xScale(d.time) ?? 0;
      return x >= barX && x <= barX + bandwidth;
    });

    if (hoveredTime) {
      setHoveredPoint({
        x: clientX - rect.left,
        y: y,
        screenY: clientY, // 保存屏幕 Y 坐标用于判断方向
        data: hoveredTime,
      });
      onHover?.(hoveredTime);
    } else {
      setHoveredPoint(null);
      onHover?.(null);
    }
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

  // 准备堆叠数据的键
  const keys = series.map((s) => s.key);

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
          <BarStack<StackedBarChartDataPoint, string>
            data={data}
            keys={keys}
            x={(d) => d.time}
            xScale={xScale}
            yScale={yScale}
            value={(d, key) => getValue(d, key)}
            color={(key) => {
              const seriesConfig = series.find((s) => s.key === key);
              return seriesConfig?.color || "var(--color-primary)";
            }}
          >
            {(barStacks) =>
              barStacks.map((barStack) =>
                barStack.bars.map((bar) => (
                  <rect
                    key={`bar-stack-${barStack.index}-${bar.index}`}
                    x={bar.x}
                    y={bar.y}
                    height={bar.height}
                    width={bar.width}
                    fill={bar.color}
                    className="transition-opacity duration-200 hover:opacity-80"
                  />
                )),
              )
            }
          </BarStack>
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
            <div className="space-y-1 text-xs">
              {series.map((s) => {
                const value = getValue(hoveredPoint.data, s.key);
                // 只显示有值的系列
                if (value === 0) return null;
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
          )}
        </div>
      )}
    </div>
  );
}

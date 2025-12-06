"use client";

import { useEffect, useState, useRef } from "react";
import { scaleTime, scaleLinear } from "@visx/scale";
import { AreaClosed, LinePath } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import { LinearGradient } from "@visx/gradient";
import { Group } from "@visx/group";
import { motion } from "framer-motion";

export interface AreaChartDataPoint {
  time: string;
  [key: string]: string | number;
}

export interface SeriesConfig {
  key: string;
  label: string;
  color: string; // 可以是 CSS 变量或颜色值，如 "oklch(var(--p))" 或 "#3b82f6"
  gradientId?: string; // 可选的自定义渐变 ID
}

interface AreaChartProps {
  data: AreaChartDataPoint[];
  series: SeriesConfig[]; // 要显示的数据系列配置
  className?: string;
  onHover?: (point: AreaChartDataPoint | null) => void;
  showLegend?: boolean; // 是否在 tooltip 中显示图例
  formatValue?: (value: number, key: string) => string; // 自定义值格式化函数
  formatTime?: (time: string) => string; // 自定义时间格式化函数
}

export default function AreaChart({
  data,
  series,
  className = "",
  onHover,
  showLegend = true,
  formatValue = (value: number) => value.toString(),
  formatTime,
}: AreaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    screenY: number; // 屏幕 Y 坐标用于判断方向
    data: AreaChartDataPoint;
  } | null>(null);

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

  const margin = { top: 0, right: 0, bottom: 0, left: 0 };
  const innerWidth = dimensions.width - margin.left - margin.right;
  const innerHeight = dimensions.height - margin.top - margin.bottom;

  // 数据访问器
  const getDate = (d: AreaChartDataPoint) => new Date(d.time);
  const getValue = (d: AreaChartDataPoint, key: string) => {
    const value = d[key];
    return typeof value === "number" ? value : 0;
  };

  // 创建比例尺
  const xScale = scaleTime({
    domain:
      data.length > 0
        ? [
            Math.min(...data.map((d) => getDate(d).getTime())),
            Math.max(...data.map((d) => getDate(d).getTime())),
          ]
        : [0, 1],
    range: [0, innerWidth],
  });

  // 计算所有系列的最大值
  const maxValue = Math.max(
    ...data.flatMap((d) => series.map((s) => getValue(d, s.key))),
    1, // 至少为 1，避免空图表
  );

  const yScale = scaleLinear({
    domain: [0, maxValue * 1.1],
    range: [innerHeight, 0],
  });

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

    // 找到最接近的数据点
    const xValue = xScale.invert(x);
    const closestPoint = data.reduce((prev, curr) => {
      const prevDiff = Math.abs(getDate(prev).getTime() - xValue.getTime());
      const currDiff = Math.abs(getDate(curr).getTime() - xValue.getTime());
      return currDiff < prevDiff ? curr : prev;
    });

    setHoveredPoint({
      x: clientX - rect.left,
      y: y,
      screenY: clientY, // 保存屏幕 Y 坐标用于判断方向
      data: closestPoint,
    });
    onHover?.(closestPoint);
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
        <defs>
          {/* 为每个系列生成渐变 */}
          {series.map((s) => {
            const gradientId = s.gradientId || `gradient-${s.key}`;
            return (
              <LinearGradient
                key={gradientId}
                id={gradientId}
                from={s.color}
                to={s.color}
                fromOpacity={0.4}
                toOpacity={0.05}
                vertical
              />
            );
          })}
        </defs>

        <Group left={margin.left} top={margin.top}>
          {/* 为每个系列渲染区域和线 */}
          {series.map((s) => {
            const gradientId = s.gradientId || `gradient-${s.key}`;
            return (
              <g key={s.key}>
                {/* 区域 */}
                <AreaClosed
                  data={data}
                  x={(d) => xScale(getDate(d)) ?? 0}
                  y={(d) => yScale(getValue(d, s.key)) ?? 0}
                  y0={innerHeight}
                  yScale={yScale}
                  fill={`url(#${gradientId})`}
                  curve={curveMonotoneX}
                />
                {/* 线 */}
                <LinePath
                  data={data}
                  x={(d) => xScale(getDate(d)) ?? 0}
                  y={(d) => yScale(getValue(d, s.key)) ?? 0}
                  stroke={s.color}
                  strokeWidth={2}
                  curve={curveMonotoneX}
                />
              </g>
            );
          })}

          {/* 悬浮时的竖线指示器 */}
          <motion.line
            y1={0}
            y2={innerHeight}
            stroke={series[0]?.color || "currentColor"}
            strokeWidth={2}
            strokeDasharray="4 4"
            initial={{ opacity: 0, x1: 0, x2: 0 }}
            animate={{
              x1: hoveredPoint ? (xScale(getDate(hoveredPoint.data)) ?? 0) : 0,
              x2: hoveredPoint ? (xScale(getDate(hoveredPoint.data)) ?? 0) : 0,
              opacity: hoveredPoint ? 0.6 : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            pointerEvents="none"
          />
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
              {series.map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span style={{ color: s.color }}>
                    {s.label}:{" "}
                    {formatValue(getValue(hoveredPoint.data, s.key), s.key)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

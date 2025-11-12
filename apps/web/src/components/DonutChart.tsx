"use client";

import { useEffect, useState, useRef } from "react";
import { Pie } from "@visx/shape";
import { Group } from "@visx/group";
import { scaleOrdinal } from "@visx/scale";
import { motion, AnimatePresence } from "framer-motion";
import generateGradient from "@/lib/shared/gradient";
import generateComplementary from "@/lib/shared/complementary";

export interface DonutChartDataPoint {
  name: string;
  value: number;
  percentage?: number;
}

interface DonutChartProps {
  data: DonutChartDataPoint[];
  className?: string;
  innerRadius?: number; // 内圆半径比例（0-1），默认 0.6
  colors?: string[]; // 颜色数组
  showLegend?: boolean; // 是否显示图例
  showLabels?: boolean; // 是否在图表上显示标签
  formatValue?: (value: number) => string; // 自定义值格式化函数
}

export default function DonutChart({
  data,
  className = "",
  innerRadius = 0.6,
  colors,
  showLegend = true,
  showLabels = false,
  formatValue = (value: number) => value.toString(),
}: DonutChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [hoveredSlice, setHoveredSlice] = useState<{
    x: number;
    y: number;
    screenY: number;
    data: DonutChartDataPoint;
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

  // 默认颜色方案
  const defaultColors = generateGradient(
    "#2dd4bf",
    generateComplementary("#2dd4bf"),
    10,
  );

  const colorScale = scaleOrdinal({
    domain: data.map((d) => d.name),
    range: colors || defaultColors,
  });

  const width = dimensions.width;
  const height = dimensions.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 20; // 留出边距

  // 数据访问器
  const getValue = (d: DonutChartDataPoint) => d.value;

  // 计算总和
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (!data || data.length === 0 || total === 0) {
    return (
      <div
        ref={containerRef}
        className={`relative w-full h-full flex items-center justify-center ${className}`}
      >
        <div className="text-muted-foreground">暂无数据</div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      <svg width={width} height={height}>
        <Group top={centerY} left={centerX}>
          <Pie
            data={data}
            pieValue={getValue}
            outerRadius={radius}
            innerRadius={radius * innerRadius}
            cornerRadius={3}
            padAngle={0.01}
          >
            {(pie) => {
              return pie.arcs.map((arc, index) => {
                const [centroidX, centroidY] = pie.path.centroid(arc);
                const hasSpaceForLabel = arc.endAngle - arc.startAngle >= 0.1;
                const arcPath = pie.path(arc) || "";
                const arcFill = colorScale(arc.data.name);
                const isHovered = hoveredSlice?.data.name === arc.data.name;

                // 处理鼠标移动
                const handleMouseMove = (
                  event: React.MouseEvent<SVGGElement>,
                ) => {
                  const svgElement = event.currentTarget.closest("svg");
                  if (!svgElement) return;

                  const rect = svgElement.getBoundingClientRect();
                  setHoveredSlice({
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top,
                    screenY: event.clientY,
                    data: arc.data,
                  });
                };

                return (
                  <g
                    key={`arc-${arc.data.name}-${index}`}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoveredSlice(null)}
                    style={{ cursor: "pointer" }}
                  >
                    <motion.path
                      d={arcPath}
                      fill={arcFill}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: isHovered ? 0.8 : 1,
                        scale: isHovered ? 1.05 : 1,
                      }}
                      transition={{
                        duration: 0.2,
                        delay: index * 0.05,
                      }}
                      style={{
                        transformOrigin: "center",
                      }}
                    />
                    {showLabels && hasSpaceForLabel && (
                      <text
                        x={centroidX}
                        y={centroidY}
                        dy=".33em"
                        fontSize={12}
                        textAnchor="middle"
                        fill="white"
                        style={{ pointerEvents: "none" }}
                      >
                        {arc.data.percentage !== undefined
                          ? `${arc.data.percentage.toFixed(1)}%`
                          : `${((arc.data.value / total) * 100).toFixed(1)}%`}
                      </text>
                    )}
                  </g>
                );
              });
            }}
          </Pie>

          {/* 中心文本 */}
          <text
            textAnchor="middle"
            fill="currentColor"
            fontSize={16}
            fontWeight="bold"
            dy="-0.5em"
          >
            {hoveredSlice ? hoveredSlice.data.name : "总计"}
          </text>
          <text
            textAnchor="middle"
            fill="currentColor"
            fontSize={24}
            fontWeight="bold"
            dy="1em"
          >
            {hoveredSlice
              ? formatValue(hoveredSlice.data.value)
              : formatValue(total)}
          </text>
        </Group>
      </svg>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredSlice && (
          <div
            className="absolute pointer-events-none bg-background/95 backdrop-blur-sm border border-foreground/10 rounded-lg px-4 py-3 shadow-lg z-10"
            style={{
              left: `${Math.min(hoveredSlice.x + 10, dimensions.width - 150)}px`,
              // 根据鼠标在屏幕中的位置决定菜单方向：上半部分向下，下半部分向上
              ...(hoveredSlice.screenY < window.innerHeight / 2
                ? { top: `${hoveredSlice.y + 10}px` }
                : { bottom: `${dimensions.height - hoveredSlice.y + 10}px` }),
              transform: "translateZ(0)", // 强制 GPU 加速
            }}
          >
            <div className="text-sm font-medium">{hoveredSlice.data.name}</div>
            <div className="text-lg font-bold mt-1">
              {formatValue(hoveredSlice.data.value)}
            </div>
            {hoveredSlice.data.percentage !== undefined && (
              <div className="text-xs text-muted-foreground mt-1">
                占比: {hoveredSlice.data.percentage.toFixed(2)}%
              </div>
            )}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { Pie } from "@visx/shape";
import { Group } from "@visx/group";
import { scaleOrdinal } from "@visx/scale";
import { motion, AnimatePresence } from "framer-motion";

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
  const [hoveredSlice, setHoveredSlice] = useState<DonutChartDataPoint | null>(
    null,
  );

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
  const defaultColors = [
    "oklch(var(--p))",
    "oklch(var(--s))",
    "oklch(var(--a))",
    "oklch(var(--in))",
    "oklch(var(--su))",
    "oklch(var(--wa))",
    "oklch(var(--er))",
    "#8B5CF6",
    "#EC4899",
    "#F59E0B",
  ];

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
                const isHovered = hoveredSlice?.name === arc.data.name;

                return (
                  <g
                    key={`arc-${arc.data.name}-${index}`}
                    onMouseEnter={() => setHoveredSlice(arc.data)}
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
            {hoveredSlice ? hoveredSlice.name : "总计"}
          </text>
          <text
            textAnchor="middle"
            fill="currentColor"
            fontSize={24}
            fontWeight="bold"
            dy="1em"
          >
            {hoveredSlice
              ? formatValue(hoveredSlice.value)
              : formatValue(total)}
          </text>
          {hoveredSlice && hoveredSlice.percentage !== undefined && (
            <text
              textAnchor="middle"
              fill="currentColor"
              opacity={0.7}
              fontSize={14}
              dy="2.5em"
            >
              {hoveredSlice.percentage.toFixed(1)}%
            </text>
          )}
        </Group>
      </svg>

      {/* 图例 */}
      {showLegend && (
        <div className="absolute bottom-0 left-0 right-0 flex flex-wrap justify-center gap-3 px-4 pb-4">
          {data.map((item, index) => (
            <motion.div
              key={`legend-${item.name}`}
              className="flex items-center gap-2 text-xs cursor-pointer"
              onMouseEnter={() => setHoveredSlice(item)}
              onMouseLeave={() => setHoveredSlice(null)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: colorScale(item.name),
                  opacity: hoveredSlice?.name === item.name ? 0.8 : 1,
                }}
              />
              <span
                className={`${hoveredSlice?.name === item.name ? "font-semibold" : ""}`}
              >
                {item.name}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredSlice && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-4 left-4 bg-background/95 backdrop-blur-sm border border-foreground/10 rounded-lg px-4 py-3 shadow-lg"
          >
            <div className="text-sm font-medium">{hoveredSlice.name}</div>
            <div className="text-lg font-bold mt-1">
              {formatValue(hoveredSlice.value)}
            </div>
            {hoveredSlice.percentage !== undefined && (
              <div className="text-xs text-muted-foreground mt-1">
                占比: {hoveredSlice.percentage.toFixed(2)}%
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

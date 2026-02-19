"use client";

import { useMemo, useRef, useState } from "react";

import DonutChart, {
  type DonutChartDataPoint,
} from "@/components/client/charts/DonutChart";
import Clickable from "@/ui/Clickable";

export interface DimensionStatsItem {
  name: string;
  count: number;
  percentage: number;
}

interface DimensionStatsChartProps {
  title: string;
  items: DimensionStatsItem[];
  colors: string[];
  className?: string;
  enableFilter?: boolean;
  onItemClick?: (name: string) => void;
  activeItemName?: string;
}

export default function DimensionStatsChart({
  title,
  items,
  colors,
  className = "",
  enableFilter = false,
  onItemClick,
  activeItemName,
}: DimensionStatsChartProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showTopGradient, setShowTopGradient] = useState(false);
  const [showBottomGradient, setShowBottomGradient] = useState(true);
  const isFilterEnabled = enableFilter && !!onItemClick;

  // 转换为 DonutChart 数据格式
  const chartData: DonutChartDataPoint[] = useMemo(
    () =>
      items.map((item) => ({
        name: item.name,
        value: item.count,
        percentage: item.percentage,
      })),
    [items],
  );

  // 监听滚动事件更新渐变遮罩
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = container;

    // 顶部渐变：距离顶部超过 10px 时显示
    setShowTopGradient(scrollTop > 10);

    // 底部渐变：距离底部超过 10px 时显示
    const isNearBottom = scrollTop >= scrollHeight - clientHeight;
    setShowBottomGradient(!isNearBottom);
  };

  if (items.length === 0) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="text-2xl mb-4">{title}</div>
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <span>暂无数据</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex-1 flex gap-6 min-h-0 ${className}`}>
      {/* 列表容器 */}
      <div className="flex-1 relative">
        {/* 顶部渐变遮罩 */}
        <div
          className={`absolute top-0 left-0 right-2 h-6 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${
            showTopGradient ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* 底部渐变遮罩 */}
        <div
          className={`absolute bottom-0 left-0 right-2 h-6 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${
            showBottomGradient ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* 滚动内容 */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="overflow-y-auto scrollbar-hide pr-2 h-full"
        >
          <div className="text-2xl mb-4">{title}</div>
          <div className="space-y-1">
            {items.map((item, index) => (
              <div key={item.name}>
                {isFilterEnabled ? (
                  <Clickable
                    hoverScale={1}
                    onClick={() => onItemClick(item.name)}
                    className={`flex items-center justify-between rounded px-1 py-0.5 transition-colors ${
                      activeItemName === item.name
                        ? "text-primary bg-primary/20"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colors[index] }}
                      />
                      <div className="text-sm truncate" title={item.name}>
                        {item.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-sm font-medium">
                        {item.count.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground w-16 text-right">
                        {item.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </Clickable>
                ) : (
                  <div className="flex items-center justify-between rounded transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: colors[index] }}
                      />
                      <div className="text-sm truncate" title={item.name}>
                        {item.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-sm font-medium">
                        {item.count.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground w-16 text-right">
                        {item.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* 环形图 */}
      <div className="flex-shrink-0 w-48 h-48 flex items-center justify-center">
        <DonutChart data={chartData} colors={colors} showLabels={false} />
      </div>
    </div>
  );
}

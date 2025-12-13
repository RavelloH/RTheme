"use client";

import { GridItem } from "@/components/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import type { StatItem } from "@repo/shared-types";
import DonutChart, { type DonutChartDataPoint } from "@/components/DonutChart";
import generateGradient from "@/lib/shared/gradient";
import generateComplementary from "@/lib/shared/complementary";

interface DimensionStatsProps {
  title: string;
  items: StatItem[] | null;
  mainColor: string;
  position: "up" | "middle" | "down";
}

export default function DimensionStats({
  title,
  items,
  mainColor,
  position,
}: DimensionStatsProps) {
  // 取前10项显示
  const displayItems = items ? items.slice(0, 10) : null;

  // 转换为 DonutChart 数据格式
  const chartData: DonutChartDataPoint[] | null = displayItems
    ? displayItems.map((item) => ({
        name: item.name,
        value: item.count,
        percentage: item.percentage,
      }))
    : null;

  // 生成颜色 - 确保至少有 2 步
  const colors = displayItems
    ? generateGradient(
        mainColor,
        generateComplementary(mainColor),
        Math.max(displayItems.length, 2),
      )
    : [];

  return (
    <GridItem
      areas={
        position === "up"
          ? [1, 2, 3, 4]
          : position === "middle"
            ? [5, 6, 7, 8]
            : [9, 10, 11, 12]
      }
      width={3}
      height={0.5}
    >
      <AutoTransition type="slideUp" className="h-full">
        {displayItems && chartData ? (
          <div key="content" className="flex flex-col h-full p-10">
            {displayItems.length === 0 ? (
              <div className="flex flex-col h-full">
                <div className="text-2xl mb-4">{title}</div>
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <span>暂无数据</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex gap-6 min-h-0">
                {/* 列表 */}
                <div className="flex-1 overflow-y-auto pr-2">
                  <div className="text-2xl mb-4">{title}</div>
                  <div className="space-y-1">
                    {displayItems.map((item, index) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between rounded transition-colors"
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
                      </div>
                    ))}
                  </div>
                </div>
                {/* 环形图 */}
                <div className="flex-shrink-0 w-48 h-48 flex items-center justify-center">
                  <DonutChart
                    data={chartData}
                    colors={colors}
                    showLabels={false}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <LoadingIndicator key="loading" size="md" />
        )}
      </AutoTransition>
    </GridItem>
  );
}

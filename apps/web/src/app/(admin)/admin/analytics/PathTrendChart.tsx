"use client";

import { GridItem } from "@/components/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import type { DailyTrend } from "@repo/shared-types";
import StackedBarChart, {
  type StackedBarChartDataPoint,
  type SeriesConfig,
} from "@/components/StackedBarChart";
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PathTrendChartProps {
  dailyTrend: DailyTrend[] | null;
  mainColor: string;
  isLoading?: boolean;
}

export default function PathTrendChart({
  dailyTrend,
  isLoading = false,
}: PathTrendChartProps) {
  // 转换数据格式为柱状图需要的格式
  const { chartData, series } = useMemo(() => {
    if (!dailyTrend) {
      return { chartData: null, series: [] };
    }

    // 转换数据格式
    const chartData: StackedBarChartDataPoint[] = dailyTrend.map((item) => ({
      time: item.date,
      views: item.views,
      visitors: item.uniqueVisitors,
    }));

    // 配置系列
    const series: SeriesConfig[] = [
      {
        key: "visitors",
        label: "独立访客",
        color: "var(--color-primary)",
      },
      {
        key: "views",
        label: "访问量",
        color: "color-mix(in srgb, var(--color-primary) 40%, transparent)",
      },
    ];

    return { chartData, series };
  }, [dailyTrend]);

  return (
    <GridItem
      areas={[5, 6, 7, 8]}
      width={3}
      height={0.5}
      className="pt-10"
      fixedHeight
    >
      <AutoTransition type="slideUp" className="h-full">
        {chartData && !isLoading ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={chartData.length > 0 ? chartData[0]?.time : "empty"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full flex flex-col"
            >
              <div className="flex items-center justify-between mb-2 px-10">
                <div className="text-2xl">访问统计</div>
              </div>
              <div className="w-full h-full">
                <StackedBarChart
                  data={chartData}
                  series={series}
                  className="w-full h-full"
                  timeGranularity="day"
                  showYear="auto"
                />
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <LoadingIndicator key="loading" size="md" />
        )}
      </AutoTransition>
    </GridItem>
  );
}

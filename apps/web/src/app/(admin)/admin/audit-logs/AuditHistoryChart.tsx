"use client";

import { GridItem } from "@/components/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import { getAuditTrends } from "@/actions/audit";
import { useEffect, useState, useCallback } from "react";
import type { AuditTrendItem } from "@repo/shared-types/api/audit";
import StackedBarChart, {
  type StackedBarChartDataPoint,
  type SeriesConfig as StackedBarSeriesConfig,
} from "@/components/StackedBarChart";
import AreaChart, {
  type AreaChartDataPoint,
  type SeriesConfig as AreaSeriesConfig,
} from "@/components/AreaChart";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import ErrorPage from "@/components/ui/Error";
import { useBroadcast } from "@/hooks/use-broadcast";
import generateGradient from "@/lib/shared/gradient";
import generateComplementary from "@/lib/shared/complementary";

export default function AuditHistoryChart({
  mainColor,
}: {
  mainColor: string;
}) {
  const [data, setData] = useState<AuditTrendItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [groupBy, setGroupBy] = useState<"action" | "resource">("action");

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getAuditTrends({ days: 30, count: 30, groupBy });
      if (!res.success) {
        setError(new Error(res.message || "获取趋势数据失败"));
        return;
      }
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("获取趋势数据失败"));
    } finally {
      setIsLoading(false);
    }
  }, [groupBy]);

  // 监听广播刷新消息
  useBroadcast<{ type: string }>(async (message) => {
    if (message.type === "audit-refresh") {
      setRefreshTrigger((prev) => prev + 1); // 触发刷新
    }
  });

  useEffect(() => {
    fetchData();
  }, [refreshTrigger, fetchData]);

  // 转换数据格式并动态提取系列
  const { chartData, series } = (() => {
    // 收集所有唯一的键
    const allKeys = new Set<string>();
    data.forEach((item) => {
      Object.keys(item.data).forEach((key) => allKeys.add(key));
    });

    // 转换数据格式
    const chartData: StackedBarChartDataPoint[] = data.map((item) => ({
      time: item.time,
      ...item.data,
    }));

    // 为每个键生成一个颜色
    let colors = generateGradient(
      mainColor,
      generateComplementary(mainColor),
      10,
    );

    colors = colors.flatMap((_, i, a) =>
      i < a.length / 2 ? [a[i], a[i + a.length / 2]] : [],
    ) as string[];

    // 配置系列
    const series: StackedBarSeriesConfig[] = Array.from(allKeys).map(
      (key, index) => ({
        key,
        label: key,
        color: colors[index % colors.length] || "var(--color-primary)",
      }),
    );

    return { chartData, series };
  })();

  // 转换数据为总数量趋势（用于 AreaChart）
  const { areaChartData, areaSeries } = (() => {
    const areaChartData: AreaChartDataPoint[] = data.map((item) => {
      // 计算每天的总数量
      const total = Object.values(item.data).reduce(
        (sum, val) => sum + (val as number),
        0,
      );
      return {
        time: item.time,
        total,
      };
    });

    const areaSeries: AreaSeriesConfig[] = [
      {
        key: "total",
        label: "总操作数",
        color: "var(--color-primary)",
      },
    ];

    return { areaChartData, areaSeries };
  })();

  return (
    <>
      <GridItem
        areas={[5, 6, 7, 8]}
        width={3}
        height={0.5}
        className="py-10"
        fixedHeight
      >
        <AutoTransition type="slideUp" className="h-full">
          {isLoading ? (
            <LoadingIndicator key="loading" />
          ) : error ? (
            <div key="error" className="px-10 h-full">
              <ErrorPage reason={error} reset={() => fetchData()} />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2 px-10">
                <div className="text-2xl">审计日志统计</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setGroupBy("action")}
                    className={`px-3 py-1 text-sm rounded ${
                      groupBy === "action"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    按操作类型
                  </button>
                  <button
                    onClick={() => setGroupBy("resource")}
                    className={`px-3 py-1 text-sm rounded ${
                      groupBy === "resource"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    按资源类型
                  </button>
                </div>
              </div>
              <div className="w-full h-full" key="content">
                <StackedBarChart
                  data={chartData}
                  series={series}
                  className="w-full h-full"
                  timeGranularity="day"
                  showYear="auto"
                />
              </div>
            </>
          )}
        </AutoTransition>
      </GridItem>
      <GridItem
        areas={[9, 10, 11, 12]}
        width={3}
        height={0.5}
        className="py-10"
        fixedHeight
      >
        <AutoTransition type="slideUp" className="h-full">
          {isLoading ? (
            <LoadingIndicator key="loading" />
          ) : error ? (
            <div key="error" className="px-10 h-full">
              <ErrorPage reason={error} reset={() => fetchData()} />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2 px-10">
                <div className="text-2xl">审计操作总量趋势</div>
              </div>
              <div className="w-full h-full" key="content">
                <AreaChart
                  data={areaChartData}
                  series={areaSeries}
                  className="w-full h-full"
                  timeGranularity="day"
                  showYear="auto"
                />
              </div>
            </>
          )}
        </AutoTransition>
      </GridItem>
    </>
  );
}

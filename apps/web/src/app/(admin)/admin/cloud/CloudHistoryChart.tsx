"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CloudTrendItem } from "@repo/shared-types/api/cloud";

import { getCloudTrends } from "@/actions/cloud";
import BarChart, {
  type BarChartDataPoint,
  type SeriesConfig,
} from "@/components/client/charts/BarChart";
import { GridItem } from "@/components/client/layout/RowGrid";
import { useMainColor } from "@/components/client/layout/ThemeProvider";
import ErrorPage from "@/components/ui/Error";
import { useBroadcast } from "@/hooks/use-broadcast";
import generateComplementary from "@/lib/shared/complementary";
import generateGradient from "@/lib/shared/gradient";
import { AutoTransition } from "@/ui/AutoTransition";
import { LoadingIndicator } from "@/ui/LoadingIndicator";

export default function CloudHistoryChart() {
  const mainColor = useMainColor().primary;
  const [data, setData] = useState<CloudTrendItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getCloudTrends({ days: 30, count: 60 });
      if (!result.success) {
        setError(new Error(result.message || "获取云投递趋势失败"));
        return;
      }
      if (result.data) {
        setData(result.data);
      }
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError
          : new Error("获取云投递趋势失败"),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useBroadcast<{ type: string }>((message) => {
    if (message.type === "cloud-refresh") {
      setRefreshTrigger((prev) => prev + 1);
    }
  });

  useEffect(() => {
    void fetchData();
  }, [fetchData, refreshTrigger]);

  const chartData: BarChartDataPoint[] = data.map((item) => ({
    time: item.time,
    accepted: item.data.acceptedCount,
    rejected: item.data.rejectedCount,
    dedup: item.data.dedupCount,
    error: item.data.errorCount,
  }));

  const colors = useMemo(() => {
    try {
      return generateGradient(mainColor, generateComplementary(mainColor), 4);
    } catch (colorError) {
      console.error("[CloudHistoryChart] 生成图表配色失败:", colorError);
      return [
        "var(--color-success)",
        "var(--color-warning)",
        "var(--color-foreground)",
        "var(--color-error)",
      ];
    }
  }, [mainColor]);

  const series: SeriesConfig[] = [
    {
      key: "accepted",
      label: "接收",
      color: colors[0] || "var(--color-success)",
    },
    {
      key: "rejected",
      label: "拒绝",
      color: colors[1] || "var(--color-warning)",
    },
    {
      key: "dedup",
      label: "去重",
      color: colors[2] || "var(--color-foreground)",
    },
    {
      key: "error",
      label: "错误",
      color: colors[3] || "var(--color-error)",
    },
  ];

  return (
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
            <ErrorPage reason={error} reset={() => void fetchData()} />
          </div>
        ) : (
          <>
            <div className="text-2xl mb-2 px-10">云触发事件趋势</div>
            <div className="w-full h-full" key="content">
              <BarChart
                data={chartData}
                series={series}
                className="w-full h-full"
                timeGranularity="day"
                showYear="auto"
                formatValue={(value) => `${Math.round(value)} 次`}
              />
            </div>
          </>
        )}
      </AutoTransition>
    </GridItem>
  );
}

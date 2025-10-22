"use client";

import { GridItem } from "@/components/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import { getDoctorTrends } from "@/actions/doctor";
import { useEffect, useState } from "react";
import type { DoctorTrendItem } from "@repo/shared-types/api/doctor";
import AreaChart, {
  type AreaChartDataPoint,
  type SeriesConfig,
} from "@/components/AreaChart";
import { LoadingIndicator } from "@/ui/LoadingIndicator";

export default function DoctorHistoryChart() {
  const [data, setData] = useState<DoctorTrendItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const res = await getDoctorTrends({ days: 30, count: 30 });
        if (res.data) {
          setData(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch doctor trends:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // 转换数据格式
  const chartData: AreaChartDataPoint[] = data.map((item) => ({
    time: item.time,
    info: item.data.info,
    warning: item.data.warning,
    error: item.data.error,
  }));

  // 配置系列
  const series: SeriesConfig[] = [
    {
      key: "info",
      label: "正常",
      color: "var(--color-primary)",
    },
    {
      key: "warning",
      label: "警告",
      color: "var(--color-warning)",
    },
    {
      key: "error",
      label: "错误",
      color: "var(--color-error)",
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
      <div className="text-2xl mb-2 px-10">运行状况历史趋势</div>
      <AutoTransition type="slideUp" className="h-full">
        {isLoading ? (
          <LoadingIndicator key="loading" />
        ) : (
          <div className="w-full h-full" key="content">
            <AreaChart
              data={chartData}
              series={series}
              className="w-full h-full"
            />
          </div>
        )}
      </AutoTransition>
    </GridItem>
  );
}

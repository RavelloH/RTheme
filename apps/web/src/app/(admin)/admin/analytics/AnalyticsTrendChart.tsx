"use client";

import { useEffect, useState } from "react";

import { getRealTimeStats } from "@/actions/analytics";
import AreaChart, {
  type AreaChartDataPoint,
  type SeriesConfig,
} from "@/components/client/charts/AreaChart";
import { GridItem } from "@/components/client/layout/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import { LoadingIndicator } from "@/ui/LoadingIndicator";

interface AnalyticsTrendChartProps {
  mainColor: string;
}

export default function AnalyticsTrendChart({
  mainColor,
}: AnalyticsTrendChartProps) {
  const [chartData, setChartData] = useState<AreaChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  // 获取实时访问数据
  const fetchRealTimeData = async () => {
    try {
      const res = await getRealTimeStats({ minutes: 60 });
      if (res.success && res.data) {
        const data: AreaChartDataPoint[] = res.data.dataPoints.map((point) => ({
          time: point.time,
          views: point.views,
          visitors: point.visitors,
        }));
        setChartData(data);
        setLoading(false);
      }
    } catch (error) {
      console.error("获取实时访问数据失败:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    // 立即获取一次数据
    fetchRealTimeData();

    // 每分钟更新一次数据
    const interval = setInterval(() => {
      fetchRealTimeData();
    }, 60000); // 60秒

    return () => clearInterval(interval);
  }, []);

  const series: SeriesConfig[] = [
    {
      key: "views",
      label: "实时访问",
      color: mainColor,
    },
    {
      key: "visitors",
      label: "访问人数",
      color: "var(--color-success)",
    },
  ];

  return (
    <GridItem areas={[9, 10, 11, 12]} width={3} height={0.5}>
      <AutoTransition type="slideUp" className="h-full">
        {!loading && chartData.length > 0 ? (
          <div key="content" className="flex flex-col h-full pt-10">
            <div className="text-2xl mb-4 px-10">
              实时访问趋势
              <span className="text-sm text-base-content/60 ml-2">
                (最近1小时)
              </span>
            </div>
            <div className="flex-1 min-h-0 w-full">
              <AreaChart
                data={chartData}
                series={series}
                className="w-full h-full"
                timeGranularity="minute"
                showYear="never"
              />
            </div>
          </div>
        ) : (
          <LoadingIndicator key="loading" size="md" />
        )}
      </AutoTransition>
    </GridItem>
  );
}

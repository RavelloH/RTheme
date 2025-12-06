"use client";

import { GridItem } from "@/components/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import AreaChart, {
  type AreaChartDataPoint,
  type SeriesConfig,
} from "@/components/AreaChart";
import { useState, useEffect } from "react";
import { getRealTimeStats } from "@/actions/analytics";

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

  // 自定义时间格式化，显示时分
  const formatTime = (time: string) => {
    const date = new Date(time);
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <GridItem areas={[9, 10, 11, 12]} width={3} height={0.8}>
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
                formatTime={formatTime}
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

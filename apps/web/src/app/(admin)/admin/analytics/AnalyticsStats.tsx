"use client";

import { useState, useEffect } from "react";
import RowGrid from "@/components/RowGrid";
import AnalyticsOverview from "./AnalyticsOverview";
import AnalyticsTrendChart from "./AnalyticsTrendChart";
import PathStatsChart from "./PathStatsChart";
import PathTrendChart from "./PathTrendChart";
import DimensionStats from "./DimensionStats";
import PageViewTable from "./PageViewTable";
import { TimeRangeValue } from "./TimeRangeSelector";
import { getAnalyticsStats } from "@/actions/analytics";
import type { AnalyticsStatsData } from "@repo/shared-types";
import generateGradient from "@/lib/shared/gradient";
import generateComplementary from "@/lib/shared/complementary";

interface AnalyticsStatsProps {
  mainColor: string;
}

export default function AnalyticsStats({ mainColor }: AnalyticsStatsProps) {
  const [data, setData] = useState<AnalyticsStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 从 localStorage 读取上次选择的时间段
  const [timeRange, setTimeRange] = useState<TimeRangeValue>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("analytics_timeRange");
      if (saved) {
        try {
          return JSON.parse(saved) as TimeRangeValue;
        } catch {
          // 如果解析失败，使用默认值
        }
      }
    }
    return { type: "preset", days: 30 };
  });

  // 保存时间段选择到 localStorage
  const handleTimeRangeChange = (newTimeRange: TimeRangeValue) => {
    setTimeRange(newTimeRange);
    if (typeof window !== "undefined") {
      localStorage.setItem("analytics_timeRange", JSON.stringify(newTimeRange));
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      let params: {
        days?: number;
        hours?: number;
        startDate?: string;
        endDate?: string;
      };
      if (timeRange.type === "preset") {
        params = { days: timeRange.days };
      } else if (timeRange.type === "hours") {
        params = { hours: timeRange.hours };
      } else {
        params = {
          startDate: timeRange.startDate,
          endDate: timeRange.endDate,
        };
      }

      const res = await getAnalyticsStats(params);
      if (!res.success) {
        setIsLoading(false);
        return;
      }
      if (res.data) {
        setData(res.data);
      }
      setIsLoading(false);
    } catch {
      // 静默处理错误，各个子组件会显示loading状态
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  // 为不同维度生成不同的颜色
  const generateColorForDimension = (index: number): string => {
    const baseGradient = generateGradient(
      mainColor,
      generateComplementary(mainColor),
      9,
    );
    return baseGradient[index % baseGradient.length] || mainColor;
  };

  return (
    <>
      <RowGrid>
        <AnalyticsOverview
          overview={data?.overview || null}
          timeRange={timeRange}
          onTimeRangeChange={handleTimeRangeChange}
        />
        <PathTrendChart
          dailyTrend={data?.dailyTrend || null}
          mainColor={mainColor}
          isLoading={isLoading}
        />
        <AnalyticsTrendChart mainColor={mainColor} />
      </RowGrid>
      <RowGrid>
        <PathStatsChart paths={data?.topPaths || null} mainColor={mainColor} />
      </RowGrid>
      <RowGrid>
        <DimensionStats
          position="up"
          title="流量来源"
          items={data?.referers || null}
          mainColor={generateColorForDimension(0)}
        />
        <DimensionStats
          position="middle"
          title="浏览器"
          items={data?.browsers || null}
          mainColor={generateColorForDimension(1)}
        />
        <DimensionStats
          position="down"
          title="操作系统"
          items={data?.os || null}
          mainColor={generateColorForDimension(2)}
        />
        <DimensionStats
          position="up"
          title="设备类型"
          items={data?.devices || null}
          mainColor={generateColorForDimension(3)}
        />
        <DimensionStats
          position="middle"
          title="屏幕尺寸"
          items={data?.screenSizes || null}
          mainColor={generateColorForDimension(4)}
        />
        <DimensionStats
          position="down"
          title="语言"
          items={data?.languages || null}
          mainColor={generateColorForDimension(5)}
        />
        <DimensionStats
          position="up"
          title="国家分布"
          items={data?.countries || null}
          mainColor={generateColorForDimension(6)}
        />
        <DimensionStats
          position="middle"
          title="地区分布"
          items={data?.regions || null}
          mainColor={generateColorForDimension(7)}
        />
        <DimensionStats
          position="down"
          title="城市分布"
          items={data?.cities || null}
          mainColor={generateColorForDimension(8)}
        />
      </RowGrid>
      <RowGrid>
        <PageViewTable />
      </RowGrid>
    </>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnalyticsStatsData } from "@repo/shared-types";

import { getAnalyticsStats } from "@/actions/analytics";
import AnalyticsOverview from "@/app/(admin)/admin/analytics/AnalyticsOverview";
import AnalyticsTrendChart from "@/app/(admin)/admin/analytics/AnalyticsTrendChart";
import DimensionStats from "@/app/(admin)/admin/analytics/DimensionStats";
import PageViewTable from "@/app/(admin)/admin/analytics/PageViewTable";
import PathStatsChart from "@/app/(admin)/admin/analytics/PathStatsChart";
import type { TimeRangeValue } from "@/app/(admin)/admin/analytics/TimeRangeSelector";
import PathTrendChart from "@/app/(admin)/admin/analytics/VisitTrendChart";
import RowGrid from "@/components/client/layout/RowGrid";
import { useMainColor } from "@/components/client/layout/ThemeProvider";
import generateComplementary from "@/lib/shared/complementary";
import generateGradient from "@/lib/shared/gradient";

export default function AnalyticsStats() {
  const [data, setData] = useState<AnalyticsStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const themeColor = useMainColor(); // 从 ThemeProvider 获取主题颜色

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

  const fetchData = useCallback(async () => {
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
  }, [timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 为不同维度生成不同的颜色
  const generateColorForDimension = (index: number): string => {
    const primaryColor = themeColor.primary;
    const baseGradient = generateGradient(
      primaryColor,
      generateComplementary(primaryColor),
      9,
    );
    return baseGradient[index % baseGradient.length] || primaryColor;
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
          mainColor={themeColor.primary}
          isLoading={isLoading}
          timeRange={timeRange}
        />
        <AnalyticsTrendChart mainColor={themeColor.primary} />
      </RowGrid>
      <RowGrid>
        <PathStatsChart
          paths={data?.topPaths || null}
          mainColor={themeColor.primary}
        />
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

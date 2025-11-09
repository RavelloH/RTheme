"use client";

import { GridItem } from "@/components/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import { getPostsTrends } from "@/actions/post";
import { useEffect, useState, useCallback } from "react";
import type { PostTrendItem } from "@repo/shared-types/api/post";
import AreaChart, {
  type AreaChartDataPoint,
  type SeriesConfig,
} from "@/components/AreaChart";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import ErrorPage from "@/components/ui/Error";
import { useBroadcast } from "@/hooks/useBroadcast";

export default function PostsHistoryChart() {
  const [data, setData] = useState<PostTrendItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getPostsTrends({ days: 365, count: 30 });
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
  }, []);

  // 监听广播刷新消息
  useBroadcast<{ type: string }>(async (message) => {
    if (message.type === "posts-refresh") {
      setRefreshTrigger((prev) => prev + 1); // 触发刷新
    }
  });

  useEffect(() => {
    fetchData();
  }, [refreshTrigger, fetchData]);

  // 转换数据格式 - 扩展数据以填补日期间隙
  const expandedData: AreaChartDataPoint[] = [];

  if (data.length > 0) {
    for (let i = 0; i < data.length - 1; i++) {
      const current = data[i];
      const next = data[i + 1];

      if (current && next) {
        expandedData.push({
          time: current.time,
          total: current.data.total,
          new: current.data.new,
          personal: current.data.personal,
        });

        // 在两个数据点之间插入中间点（保持当前值）
        const currentTime = new Date(current.time).getTime();
        const nextTime = new Date(next.time).getTime();
        const interval = (nextTime - currentTime) / 2;

        if (interval > 24 * 60 * 60 * 1000) {
          // 如果间隔大于1天，添加中间点
          expandedData.push({
            time: new Date(currentTime + interval).toISOString(),
            total: current.data.total,
            new: 0,
            personal: current.data.personal,
          });
        }
      }
    }

    // 添加最后一个数据点
    const lastItem = data[data.length - 1];
    if (lastItem) {
      expandedData.push({
        time: lastItem.time,
        total: lastItem.data.total,
        new: lastItem.data.new,
        personal: lastItem.data.personal,
      });
    }
  }

  const series: SeriesConfig[] = [
    {
      key: "total",
      label: "总文章数",
      color: "var(--color-primary)",
    },
    {
      key: "new",
      label: "新增文章",
      color: "var(--color-success)",
    },
    {
      key: "personal",
      label: "我的文章",
      color: "var(--color-warning)",
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
            <ErrorPage reason={error} reset={() => fetchData()} />
          </div>
        ) : (
          <>
            <div className="text-2xl mb-2 px-10">文章增长趋势</div>
            <div className="w-full h-full" key="content">
              <AreaChart
                data={expandedData}
                series={series}
                className="w-full h-full"
              />
            </div>
          </>
        )}
      </AutoTransition>
    </GridItem>
  );
}

"use client";

import { GridItem } from "@/components/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import { getCategoriesDistribution } from "@/actions/category";
import { useEffect, useState, useCallback } from "react";
import type { CategoryDistributionItem } from "@repo/shared-types/api/category";
import DonutChart, { type DonutChartDataPoint } from "@/components/DonutChart";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import ErrorPage from "@/components/ui/Error";
import { useBroadcast } from "@/hooks/useBroadcast";
import generateGradient from "@/lib/shared/gradient";
import generateComplementary from "@/lib/shared/complementary";

type Props = {
  mainColor: string;
  parentId: number | null;
};

export default function CategoriesDistributionChart({
  mainColor,
  parentId,
}: Props) {
  const [data, setData] = useState<CategoryDistributionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getCategoriesDistribution({
        parentId: parentId,
        limit: 10,
      });
      if (!res.success) {
        setError(new Error(res.message || "获取分类分布数据失败"));
        return;
      }
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("获取分类分布数据失败"));
    } finally {
      setIsLoading(false);
    }
  }, [parentId]);

  // 监听广播刷新消息
  useBroadcast<{ type: string }>(async (message) => {
    if (message.type === "categories-refresh") {
      setRefreshTrigger((prev) => prev + 1); // 触发刷新
    }
  });

  useEffect(() => {
    fetchData();
  }, [refreshTrigger, fetchData]);

  // 转换数据格式为 DonutChart 需要的格式
  const chartData: DonutChartDataPoint[] = data.map((item) => ({
    name: item.name,
    value: item.totalPostCount,
    percentage: item.percentage,
  }));

  return (
    <GridItem
      areas={[7, 8, 9, 10, 11, 12]}
      width={2}
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
            <div className="text-2xl mb-2 px-10">
              {parentId !== null ? "子分类文章分布" : "分类文章分布"}
            </div>
            <div className="w-full h-full" key="content">
              <DonutChart
                data={chartData}
                className="w-full h-full"
                showLegend={true}
                showLabels={false}
                formatValue={(value) => `${value} 篇`}
                colors={generateGradient(
                  mainColor,
                  generateComplementary(mainColor),
                  10,
                )}
              />
            </div>
          </>
        )}
      </AutoTransition>
    </GridItem>
  );
}

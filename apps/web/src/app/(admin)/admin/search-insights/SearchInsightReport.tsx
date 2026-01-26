"use client";

import React, { useState, useEffect } from "react";
import { getSearchLogStats } from "@/actions/search";
import type { SearchLogStatsResult } from "@repo/shared-types/api/search";
import { AutoTransition } from "@/ui/AutoTransition";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { GridItem } from "@/components/RowGrid";
import Clickable from "@/ui/Clickable";
import { RiRefreshLine } from "@remixicon/react";
import ErrorPage from "@/components/ui/Error";

/**
 * 生成自然语言描述
 */
function generateDescription(
  stats: SearchLogStatsResult,
  days: number,
): React.ReactElement[] {
  const elements: React.ReactElement[] = [];

  // 1. 总体概览
  elements.push(
    <div key="overview">
      过去 {days} 天共处理了 {stats.totalSearches} 次搜索，其中包含{" "}
      {stats.uniqueQueries} 个不同的搜索词。
    </div>,
  );

  // 2. 搜索效果
  elements.push(
    <div key="effectiveness">
      平均每次搜索返回 {stats.avgResultCount} 个结果
      {stats.zeroResultRate > 0 && (
        <>， {stats.zeroResultRate.toFixed(1)}% 的搜索没有找到任何结果</>
      )}
      。
    </div>,
  );

  // 3. 搜索性能
  if (stats.avgDuration > 0) {
    elements.push(
      <div key="performance">
        平均搜索耗时为 {stats.avgDuration} 毫秒
        {stats.avgDuration > 500 && "，建议优化搜索性能"}。
      </div>,
    );
  }

  // 4. 热门分词
  if (stats.topTokens && stats.topTokens.length > 0) {
    elements.push(
      <div key="topTokens">
        最热门的分词是 &ldquo;{stats.topTokens[0]?.token}&rdquo;，共出现了{" "}
        {stats.topTokens[0]?.count} 次。
      </div>,
    );
  }
  return elements;
}

export default function SearchInsightReport() {
  const [stats, setStats] = useState<SearchLogStatsResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [days, setDays] = useState<number>(30);

  const fetchStats = async (daysParam = 30) => {
    setStats(null);
    setError(null);
    setDays(daysParam);

    try {
      const result = await getSearchLogStats({ days: daysParam });

      if (result.success && result.data) {
        setStats(result.data);
      } else {
        setError(new Error(result.message || "获取统计数据失败"));
      }
    } catch (err) {
      console.error("获取搜索日志统计失败:", err);
      setError(new Error("获取统计数据失败"));
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <GridItem areas={[1, 2, 3, 4]} width={3} height={0.8}>
      <AutoTransition type="scale" className="h-full">
        {stats ? (
          <div
            className="flex flex-col justify-between p-10 h-full gap-4"
            key="content"
          >
            <div className="text-2xl">搜索洞察报告</div>
            <div className="flex-1 space-y-1">
              {generateDescription(stats, days)}
            </div>
            <div>
              <div className="inline-flex items-center gap-2">
                统计刷新于:{" "}
                {new Date(stats.generatedAt).toLocaleString("zh-CN")}
                <Clickable onClick={() => fetchStats(days)}>
                  <RiRefreshLine size={"1em"} />
                </Clickable>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="px-10 h-full" key="error">
            <ErrorPage reason={error} reset={() => fetchStats(days)} />
          </div>
        ) : (
          <div className="h-full" key="loading">
            <LoadingIndicator />
          </div>
        )}
      </AutoTransition>
    </GridItem>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { getSearchIndexStats } from "@/actions/search";
import type { SearchIndexStatsResult } from "@repo/shared-types/api/search";
import { AutoTransition } from "@/ui/AutoTransition";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { GridItem } from "@/components/RowGrid";
import Clickable from "@/ui/Clickable";
import { RiRefreshLine } from "@remixicon/react";
import ErrorPage from "@/components/ui/Error";

export default function WordCloudPanel() {
  const [stats, setStats] = useState<SearchIndexStatsResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = async (forceRefresh = false) => {
    if (forceRefresh) {
      setStats(null);
    }
    setError(null);

    try {
      const result = await getSearchIndexStats({ force: forceRefresh });

      if (result.success && result.data) {
        setStats(result.data);
      } else {
        setError(new Error(result.message || "获取统计数据失败"));
      }
    } catch (err) {
      console.error("获取词云数据失败:", err);
      setError(new Error("获取词云数据失败"));
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <GridItem
      areas={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
      width={1}
      height={2}
    >
      <AutoTransition type="scale" className="h-full">
        {stats ? (
          <div
            className="flex flex-col justify-between p-10 h-full gap-4"
            key="content"
          >
            <div className="flex items-center justify-between">
              <div className="text-2xl">全站词云</div>
              <Clickable onClick={() => fetchStats(true)}>
                <RiRefreshLine size={"1em"} />
              </Clickable>
            </div>

            {stats.topWords && stats.topWords.length > 0 ? (
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {stats.topWords.map(({ word, count }, index) => {
                    // 计算归一化大小（0-1之间）
                    const maxCount = Math.max(
                      ...stats.topWords.map((w) => w.count),
                    );
                    const minCount = Math.min(
                      ...stats.topWords.map((w) => w.count),
                    );
                    const normalizedSize =
                      minCount === maxCount
                        ? 0.5
                        : (count - minCount) / (maxCount - minCount);

                    // 根据频率计算字体大小和透明度
                    const fontSize = 0.75 + normalizedSize * 1.25; // 0.75rem - 2rem
                    const opacity = 0.4 + normalizedSize * 0.6; // 0.4 - 1.0

                    return (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-xs"
                        style={{
                          fontSize: `${fontSize}rem`,
                          opacity,
                        }}
                        title={`出现 ${count} 次`}
                      >
                        {word}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                暂无词云数据
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              {stats.topWords && stats.topWords.length > 0 ? (
                <>
                  显示前 {stats.topWords.length} 个高频词 · 最高频率:{" "}
                  {Math.max(...stats.topWords.map((w) => w.count))} 次
                </>
              ) : (
                "请重建文章索引以生成词云数据"
              )}
            </div>
          </div>
        ) : error ? (
          <div className="px-10 h-full" key="error">
            <ErrorPage reason={error} reset={() => fetchStats(true)} />
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

"use client";

import { RiFilterLine } from "@remixicon/react";
import type { AnalyticsOverview as AnalyticsOverviewType } from "@repo/shared-types";
import { AnimatePresence, motion } from "framer-motion";

import type { TimeRangeValue } from "@/app/(admin)/admin/analytics/TimeRangeSelector";
import TimeRangeSelector from "@/app/(admin)/admin/analytics/TimeRangeSelector";
import { GridItem } from "@/components/client/layout/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import Clickable from "@/ui/Clickable";
import { LoadingIndicator } from "@/ui/LoadingIndicator";

interface AnalyticsOverviewProps {
  overview: AnalyticsOverviewType | null;
  timeRange: TimeRangeValue;
  onTimeRangeChange: (value: TimeRangeValue) => void;
  filterSummaryText?: string;
  activeFilterCount?: number;
  onOpenFilterDialog?: () => void;
}

export default function AnalyticsOverview({
  overview,
  timeRange,
  onTimeRangeChange,
  filterSummaryText = "筛选",
  activeFilterCount = 0,
  onOpenFilterDialog,
}: AnalyticsOverviewProps) {
  const averageViewsLabel =
    timeRange.type === "hours" ? "时均访问" : "日均访问";

  return (
    <GridItem areas={[1, 2, 3, 4]} width={3} height={0.8}>
      <AutoTransition type="scale" className="h-full">
        {overview ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={JSON.stringify(timeRange)}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col justify-between p-10 h-full"
            >
              <div className="flex items-center justify-between">
                <div className="text-2xl py-2">访问分析</div>
                <div className="flex items-center gap-2">
                  <Clickable
                    hoverScale={1}
                    onClick={() => onOpenFilterDialog?.()}
                    className={`flex min-w-0 max-w-[20rem] items-center gap-2 px-4 py-2 rounded-sm border transition-colors ${
                      activeFilterCount > 0
                        ? "text-primary bg-primary/30 border-primary/40"
                        : "text-foreground bg-background border-foreground/10 hover:border-foreground/20"
                    }`}
                  >
                    <RiFilterLine
                      className={
                        activeFilterCount > 0 ? "" : "text-muted-foreground"
                      }
                      size="1em"
                    />
                    <span
                      className="max-w-[14rem] truncate text-sm font-medium sm:max-w-[16rem]"
                      title={filterSummaryText}
                    >
                      {filterSummaryText}
                    </span>
                  </Clickable>
                  <TimeRangeSelector
                    value={timeRange}
                    onChange={onTimeRangeChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                <div className="flex flex-col">
                  <div className="text-sm text-muted-foreground">总访问量</div>
                  <div className="text-3xl font-bold">
                    {overview.totalViews.toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm text-muted-foreground">独立访客</div>
                  <div className="text-3xl font-bold">
                    {overview.uniqueVisitors.toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm text-muted-foreground">今日访问</div>
                  <div className="text-3xl font-bold">
                    {overview.todayViews.toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm text-muted-foreground">
                    {averageViewsLabel}
                  </div>
                  <div className="text-3xl font-bold">
                    {overview.averageViews.toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm text-muted-foreground">总会话数</div>
                  <div className="text-3xl font-bold">
                    {overview.totalSessions.toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm text-muted-foreground">平均停留</div>
                  <div className="text-3xl font-bold">
                    {Math.floor(overview.averageDuration / 60)}:
                    {String(overview.averageDuration % 60).padStart(2, "0")}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm text-muted-foreground">跳出率</div>
                  <div className="text-3xl font-bold">
                    {overview.bounceRate.toFixed(1)}%
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="text-sm text-muted-foreground">
                    每会话页面数
                  </div>
                  <div className="text-3xl font-bold">
                    {overview.pageViewsPerSession.toFixed(1)}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <LoadingIndicator key="loading" size="md" />
        )}
      </AutoTransition>
    </GridItem>
  );
}

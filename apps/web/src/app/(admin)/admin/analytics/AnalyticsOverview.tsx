"use client";

import { GridItem } from "@/components/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import type { AnalyticsOverview as AnalyticsOverviewType } from "@repo/shared-types";
import TimeRangeSelector, { TimeRangeValue } from "./TimeRangeSelector";
import { motion, AnimatePresence } from "framer-motion";

interface AnalyticsOverviewProps {
  overview: AnalyticsOverviewType | null;
  timeRange: TimeRangeValue;
  onTimeRangeChange: (value: TimeRangeValue) => void;
}

export default function AnalyticsOverview({
  overview,
  timeRange,
  onTimeRangeChange,
}: AnalyticsOverviewProps) {
  return (
    <GridItem areas={[1, 2, 3, 4]} width={3} height={0.6}>
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
                <TimeRangeSelector
                  value={timeRange}
                  onChange={onTimeRangeChange}
                />
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
                  <div className="text-sm text-muted-foreground">日均访问</div>
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

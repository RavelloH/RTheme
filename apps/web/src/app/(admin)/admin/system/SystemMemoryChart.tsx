"use client";

import { GridItem } from "@/components/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { RiDatabase2Line } from "@remixicon/react";
import ErrorPage from "@/components/ui/Error";
import { useSystemInfo } from "./use-system-info";
import { useBroadcast } from "@/hooks/use-broadcast";
import { useState } from "react";
import AreaChart, {
  type AreaChartDataPoint,
  type SeriesConfig,
} from "@/components/AreaChart";

// 格式化字节大小
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function SystemMemoryChart() {
  const { data: systemInfo, history, error, refresh } = useSystemInfo();
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);

  // 监听广播刷新消息
  useBroadcast<{ type: string }>((message) => {
    if (message.type === "system-refresh") {
      setLocalRefreshTrigger((prev) => prev + 1);
    }
  });

  // 转换历史数据为图表格式
  const chartData: AreaChartDataPoint[] = history.map((item) => ({
    time: item.time,
    memoryUsage: item.memoryUsage,
  }));

  // 配置系列
  const series: SeriesConfig[] = [
    {
      key: "memoryUsage",
      label: "内存使用率",
      color: "var(--color-primary)",
    },
  ];

  // 获取状态颜色类名
  const getStatusColor = (usage: number) => {
    if (usage > 90) return "text-error";
    if (usage > 70) return "text-warning";
    return "text-success";
  };

  return (
    <GridItem areas={[1, 2, 3, 4, 5, 6]} width={1.5} height={0.8}>
      <AutoTransition type="scale" className="h-full" key={localRefreshTrigger}>
        {systemInfo ? (
          <div className="flex flex-col p-10 h-full" key="content">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xl">
                <RiDatabase2Line size="1em" />
                内存使用
              </div>
              <span
                className={`text-2xl font-bold ${getStatusColor(systemInfo.memory.usagePercent)}`}
              >
                {systemInfo.memory.usagePercent}%
              </span>
            </div>

            {/* 内存信息摘要 */}
            <div className="flex gap-6 mb-4 text-sm">
              <div>
                <span className="text-muted-foreground">总内存: </span>
                <span className="font-mono">
                  {formatBytes(systemInfo.memory.total)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">已使用: </span>
                <span className="font-mono">
                  {formatBytes(systemInfo.memory.used)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">可用: </span>
                <span className="font-mono">
                  {formatBytes(systemInfo.memory.free)}
                </span>
              </div>
            </div>

            {/* 内存使用历史图表 */}
            <div className="flex-1 min-h-0">
              {chartData.length > 1 ? (
                <AreaChart
                  data={chartData}
                  series={series}
                  className="w-full h-full"
                  formatValue={(value) => `${value.toFixed(1)}%`}
                  formatTime={(time) =>
                    new Date(time).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  }
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  收集数据中...
                </div>
              )}
            </div>
          </div>
        ) : error ? (
          <div className="px-10 h-full" key="error">
            <ErrorPage reason={error} reset={refresh} />
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

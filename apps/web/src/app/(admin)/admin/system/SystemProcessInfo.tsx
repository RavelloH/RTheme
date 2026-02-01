"use client";

import { useState } from "react";
import { RiTerminalBoxLine } from "@remixicon/react";

import { useSystemInfo } from "@/app/(admin)/admin/system/use-system-info";
import AreaChart, {
  type AreaChartDataPoint,
  type SeriesConfig,
} from "@/components/AreaChart";
import { GridItem } from "@/components/RowGrid";
import ErrorPage from "@/components/ui/Error";
import { useBroadcast } from "@/hooks/use-broadcast";
import { AutoTransition } from "@/ui/AutoTransition";
import { LoadingIndicator } from "@/ui/LoadingIndicator";

// 格式化字节大小
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// 格式化运行时间
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);
  if (secs > 0 && days === 0) parts.push(`${secs}秒`);

  return parts.length > 0 ? parts.join(" ") : "刚刚启动";
}

export default function SystemProcessInfo() {
  const { data: systemInfo, history, error, refresh } = useSystemInfo();
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);

  // 监听广播刷新消息
  useBroadcast<{ type: string }>((message) => {
    if (message.type === "system-refresh") {
      setLocalRefreshTrigger((prev) => prev + 1);
    }
  });

  // 转换历史数据为图表格式（堆内存使用量，转换为 MB）
  const chartData: AreaChartDataPoint[] = history.map((item) => ({
    time: item.time,
    heapUsed: item.heapUsed / (1024 * 1024), // 转换为 MB
  }));

  // 配置系列
  const series: SeriesConfig[] = [
    {
      key: "heapUsed",
      label: "堆内存",
      color: "var(--color-primary)",
    },
  ];

  return (
    <GridItem areas={[7, 8, 9, 10, 11, 12]} width={1.5} height={0.8}>
      <AutoTransition type="scale" className="h-full" key={localRefreshTrigger}>
        {systemInfo ? (
          <div className="flex flex-col p-10 h-full" key="content">
            <div className="flex items-center gap-2 text-xl mb-2">
              <RiTerminalBoxLine size="1em" />
              Node.js 进程
            </div>

            {/* 进程基本信息 */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Node.js 版本</span>
                <span className="font-mono">
                  {systemInfo.process.nodeVersion}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">进程 ID</span>
                <span className="font-mono">{systemInfo.process.pid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">运行时间</span>
                <span className="font-mono">
                  {formatUptime(systemInfo.process.uptime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">环境</span>
                <span className="font-mono">
                  {systemInfo.env.nodeEnv || "未设置"}
                </span>
              </div>
            </div>

            {/* 内存使用详情 */}
            <div className="flex mb-4">
              <div className="flex-1 text-center py-2">
                <div className="text-lg font-mono">
                  {formatBytes(systemInfo.process.memoryUsage.rss)}
                </div>
                <div className="text-xs text-muted-foreground">常驻内存</div>
              </div>
              <div className="w-px bg-muted" />
              <div className="flex-1 text-center py-2">
                <div className="text-lg font-mono">
                  {formatBytes(systemInfo.process.memoryUsage.heapUsed)}
                </div>
                <div className="text-xs text-muted-foreground">堆内存使用</div>
              </div>
              <div className="w-px bg-muted" />
              <div className="flex-1 text-center py-2">
                <div className="text-lg font-mono">
                  {systemInfo.process.eventLoopLag?.toFixed(2) ?? "-"} ms
                </div>
                <div className="text-xs text-muted-foreground">
                  事件循环延迟
                </div>
              </div>
            </div>

            {/* 活跃资源与事件循环 */}
            <div className="flex mb-4 text-sm">
              <div className="flex-1 text-center py-1">
                <span className="text-muted-foreground">活跃句柄: </span>
                <span className="font-mono">
                  {systemInfo.process.activeHandles ?? 0}
                </span>
              </div>
              <div className="w-px bg-muted" />
              <div className="flex-1 text-center py-1">
                <span className="text-muted-foreground">事件循环利用率: </span>
                <span className="font-mono">
                  {systemInfo.process.eventLoopUtilization
                    ? `${(systemInfo.process.eventLoopUtilization.utilization * 100).toFixed(2)}%`
                    : "-"}
                </span>
              </div>
            </div>

            {/* 堆内存历史图表 */}
            <div className="flex-1 min-h-0">
              {chartData.length > 1 ? (
                <AreaChart
                  data={chartData}
                  series={series}
                  className="w-full h-full"
                  formatValue={(value) => `${value.toFixed(1)} MB`}
                  timeGranularity="minute"
                  showYear="never"
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

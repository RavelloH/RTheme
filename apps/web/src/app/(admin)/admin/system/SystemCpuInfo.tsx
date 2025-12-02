"use client";

import { GridItem } from "@/components/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { RiCpuLine } from "@remixicon/react";
import ErrorPage from "@/components/ui/Error";
import { useSystemInfo } from "./useSystemInfo";
import { useBroadcast } from "@/hooks/useBroadcast";
import { useState } from "react";
import AreaChart, {
  type AreaChartDataPoint,
  type SeriesConfig,
} from "@/components/AreaChart";

export default function SystemCpuInfo() {
  const { data: systemInfo, history, error, refresh } = useSystemInfo();
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);

  // 监听广播刷新消息
  useBroadcast<{ type: string }>((message) => {
    if (message.type === "system-refresh") {
      setLocalRefreshTrigger((prev) => prev + 1);
    }
  });

  // 转换历史数据为图表格式（CPU 使用率）
  const chartData: AreaChartDataPoint[] = history.map((item) => ({
    time: item.time,
    usage: item.cpuUsageTotal, // CPU 使用率百分比
  }));

  // 配置系列
  const series: SeriesConfig[] = [
    {
      key: "usage",
      label: "CPU 使用率",
      color: "var(--color-primary)",
    },
  ];

  // 获取使用率状态描述
  const getUsageStatus = (usage: number) => {
    if (usage > 90) return { text: "过载", color: "text-error" };
    if (usage > 70) return { text: "高负载", color: "text-warning" };
    if (usage > 30) return { text: "正常", color: "text-success" };
    return { text: "空闲", color: "text-muted-foreground" };
  };

  return (
    <GridItem areas={[7, 8, 9, 10, 11, 12]} width={1.5} height={0.8}>
      <AutoTransition type="scale" className="h-full" key={localRefreshTrigger}>
        {systemInfo ? (
          <div className="flex flex-col p-10 h-full" key="content">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xl">
                <RiCpuLine size="1em" />
                CPU 信息
              </div>
              <span
                className={`text-sm ${getUsageStatus(systemInfo.cpu.usage?.total ?? 0).color}`}
              >
                {getUsageStatus(systemInfo.cpu.usage?.total ?? 0).text}
              </span>
            </div>

            {/* CPU 基本信息 */}
            <div className="space-y-2 mb-4">
              <div className="text-sm text-muted-foreground truncate">
                {systemInfo.cpu.model}
              </div>
              <div className="flex gap-4 text-sm">
                <span>
                  <span className="text-muted-foreground">核心数:</span>{" "}
                  <span className="font-mono">{systemInfo.cpu.cores}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">频率:</span>{" "}
                  <span className="font-mono">{systemInfo.cpu.speed} MHz</span>
                </span>
                {systemInfo.cpu.usage && (
                  <span>
                    <span className="text-muted-foreground">使用率:</span>{" "}
                    <span className="font-mono">
                      {systemInfo.cpu.usage.total}%
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* 负载信息 */}
            <div className="flex mb-4">
              <div className="flex-1 text-center py-2">
                <div className="text-lg font-mono">
                  {(systemInfo.cpu.loadAvg[0] ?? 0).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">1 分钟</div>
              </div>
              <div className="w-px bg-muted" />
              <div className="flex-1 text-center py-2">
                <div className="text-lg font-mono">
                  {(systemInfo.cpu.loadAvg[1] ?? 0).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">5 分钟</div>
              </div>
              <div className="w-px bg-muted" />
              <div className="flex-1 text-center py-2">
                <div className="text-lg font-mono">
                  {(systemInfo.cpu.loadAvg[2] ?? 0).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">15 分钟</div>
              </div>
            </div>

            {/* 负载历史图表 */}
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

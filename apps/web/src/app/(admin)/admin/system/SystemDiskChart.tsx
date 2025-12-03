"use client";

import { GridItem } from "@/components/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { RiHardDriveLine } from "@remixicon/react";
import ErrorPage from "@/components/ui/Error";
import { useSystemInfo } from "./useSystemInfo";
import { useBroadcast } from "@/hooks/useBroadcast";
import { useState } from "react";
import DonutChart, { type DonutChartDataPoint } from "@/components/DonutChart";

// 格式化字节大小
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function SystemDiskChart() {
  const { data: systemInfo, error, refresh } = useSystemInfo();
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);

  // 监听广播刷新消息
  useBroadcast<{ type: string }>((message) => {
    if (message.type === "system-refresh") {
      setLocalRefreshTrigger((prev) => prev + 1);
    }
  });

  // 准备饼图数据
  const getDiskChartData = (): DonutChartDataPoint[] => {
    if (!systemInfo?.disk) return [];
    return [
      {
        name: "已使用",
        value: systemInfo.disk.used,
        percentage: systemInfo.disk.usagePercent,
      },
      {
        name: "可用",
        value: systemInfo.disk.free,
        percentage: 100 - systemInfo.disk.usagePercent,
      },
    ];
  };

  // 获取状态颜色
  const getStatusColors = () => {
    if (!systemInfo?.disk)
      return ["var(--color-primary)", "var(--color-muted)"];
    const usage = systemInfo.disk.usagePercent;
    if (usage > 90) return ["var(--color-error)", "var(--color-muted)"]; // 错误
    if (usage > 70) return ["var(--color-warning)", "var(--color-muted)"]; // 警告
    return ["var(--color-primary)", "var(--color-muted)"]; // 正常
  };

  return (
    <GridItem areas={[1, 2, 3, 4, 5, 6]} width={1.5} height={0.8}>
      <AutoTransition type="scale" className="h-full" key={localRefreshTrigger}>
        {systemInfo ? (
          <div className="flex flex-col p-10 h-full" key="content">
            <div className="flex items-center gap-2 text-xl mb-2">
              <RiHardDriveLine size="1em" />
              磁盘使用
            </div>

            {systemInfo.disk ? (
              <div className="flex-1 flex items-center gap-6">
                {/* 左侧：饼图 */}
                <div className="w-1/2 h-full">
                  <DonutChart
                    data={getDiskChartData()}
                    colors={["var(--color-primary)", "var(--color-muted)"]}
                    innerRadius={0.65}
                    formatValue={(value) => formatBytes(value)}
                    className="w-full h-full"
                  />
                </div>

                {/* 右侧：详细信息 */}
                <div className="w-1/2 space-y-3">
                  <div className="text-center mb-4">
                    <div
                      className="text-4xl font-bold"
                      style={{
                        color: getStatusColors()[0],
                      }}
                    >
                      {systemInfo.disk.usagePercent}%
                    </div>
                    <div className="text-muted-foreground text-sm">使用率</div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">总容量</span>
                      <span className="font-mono">
                        {formatBytes(systemInfo.disk.total)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">已使用</span>
                      <span className="font-mono">
                        {formatBytes(systemInfo.disk.used)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">可用</span>
                      <span className="font-mono">
                        {formatBytes(systemInfo.disk.free)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                磁盘信息不可用
              </div>
            )}
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

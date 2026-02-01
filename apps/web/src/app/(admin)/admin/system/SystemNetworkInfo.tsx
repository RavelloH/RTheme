"use client";

import { useState } from "react";
import { RiGlobalLine, RiServerLine } from "@remixicon/react";

import { useSystemInfo } from "@/app/(admin)/admin/system/use-system-info";
import { GridItem } from "@/components/RowGrid";
import ErrorPage from "@/components/ui/Error";
import { useBroadcast } from "@/hooks/use-broadcast";
import { AutoTransition } from "@/ui/AutoTransition";
import { LoadingIndicator } from "@/ui/LoadingIndicator";

export default function SystemNetworkInfo() {
  const { data: systemInfo, error, refresh, lastFetchTime } = useSystemInfo();
  const [localRefreshTrigger, setLocalRefreshTrigger] = useState(0);

  // 监听广播刷新消息
  useBroadcast<{ type: string }>((message) => {
    if (message.type === "system-refresh") {
      setLocalRefreshTrigger((prev) => prev + 1);
    }
  });

  return (
    <GridItem
      areas={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
      width={1}
      height={0.8}
    >
      <AutoTransition type="scale" className="h-full" key={localRefreshTrigger}>
        {systemInfo ? (
          <div className="flex flex-col p-10 h-full" key="content">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xl">
                <RiGlobalLine size="1em" />
                网络接口
              </div>
              <span className="text-sm text-muted-foreground">
                共 {systemInfo.network.length} 个
              </span>
            </div>

            {/* 网络接口列表 */}
            <div className="flex-1 overflow-y-auto divide-y divide-muted">
              {systemInfo.network.length > 0 ? (
                systemInfo.network.map((iface) => (
                  <div
                    key={`${iface.name}-${iface.address}`}
                    className="py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <RiServerLine size="1em" className="text-primary" />
                        <span className="font-semibold">{iface.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {iface.family}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IP 地址</span>
                        <span className="font-mono text-xs">
                          {iface.address}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">子网掩码</span>
                        <span className="font-mono text-xs">
                          {iface.netmask}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">MAC 地址</span>
                        <span className="font-mono text-xs">{iface.mac}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  无外部网络接口
                </div>
              )}
            </div>

            {/* 底部时间戳 */}
            <div className="mt-4 text-xs text-muted-foreground text-right">
              最后更新: {new Date(lastFetchTime).toLocaleTimeString()}
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

"use client";

import { GridItem } from "@/components/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import Clickable from "@/ui/Clickable";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { RiRefreshLine } from "@remixicon/react";
import ErrorPage from "@/components/ui/Error";
import { useSystemInfo } from "./use-system-info";
import { useState, useEffect } from "react";

// 自动刷新间隔（秒）
const AUTO_REFRESH_INTERVAL = 15;

// 格式化时间为 yyyy/M/d HH:mm:ss 格式
function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

// 格式化运行时间
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}天`);
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分钟`);

  return parts.length > 0 ? parts.join(" ") : "刚刚启动";
}

// 获取操作系统友好名称
function getOSName(platform: string, type: string): string {
  switch (platform) {
    case "win32":
      return "Windows";
    case "darwin":
      return "macOS";
    case "linux":
      return "Linux";
    default:
      return type;
  }
}

export default function SystemOverview() {
  const {
    data: systemInfo,
    error,
    refresh,
    lastFetchTime,
    isLoading,
    refreshTrigger,
  } = useSystemInfo();

  // 倒计时状态
  const [countdown, setCountdown] = useState(AUTO_REFRESH_INTERVAL);

  // 倒计时逻辑
  useEffect(() => {
    if (lastFetchTime === 0) return;

    // 计算距离上次刷新的秒数
    const elapsed = Math.floor((Date.now() - lastFetchTime) / 1000);
    const remaining = Math.max(0, AUTO_REFRESH_INTERVAL - elapsed);
    setCountdown(remaining);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return AUTO_REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lastFetchTime]);

  return (
    <>
      <GridItem areas={[1, 2, 3, 4, 5, 6, 7, 8]} width={9 / 8} height={0.8}>
        <AutoTransition type="scale" className="h-full" key={refreshTrigger}>
          {systemInfo ? (
            <div
              className="flex flex-col justify-between p-10 h-full"
              key="content"
            >
              <div>
                <div className="text-2xl py-2 flex items-center gap-2">
                  系统信息
                </div>
                <div className="text-muted-foreground">每 15 秒自动刷新</div>
              </div>

              {/* 系统基本信息 */}
              <div className="space-y-3 my-4">
                {/* 操作系统 */}
                <div className="flex items-center justify-between border-b border-muted pb-2">
                  <span className="text-muted-foreground">操作系统</span>
                  <span className="font-mono">
                    {getOSName(systemInfo.os.platform, systemInfo.os.type)}{" "}
                    {systemInfo.os.release}
                  </span>
                </div>

                {/* 架构 */}
                <div className="flex items-center justify-between border-b border-muted pb-2">
                  <span className="text-muted-foreground">系统架构</span>
                  <span className="font-mono">{systemInfo.os.arch}</span>
                </div>

                {/* 主机名 */}
                <div className="flex items-center justify-between border-b border-muted pb-2">
                  <span className="text-muted-foreground">主机名</span>
                  <span className="font-mono">{systemInfo.os.hostname}</span>
                </div>

                {/* 系统运行时间 */}
                <div className="flex items-center justify-between border-b border-muted pb-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    系统运行时间
                  </span>
                  <span className="font-mono">
                    {formatUptime(systemInfo.os.uptime)}
                  </span>
                </div>

                {/* 服务器时区 */}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">服务器时区</span>
                  <span className="font-mono">{systemInfo.time.timezone}</span>
                </div>
              </div>

              {/* 底部信息 */}
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                {lastFetchTime > 0 && (
                  <div className="inline-flex items-center gap-2">
                    上次更新于: {formatDateTime(lastFetchTime)}
                    <span className="text-primary">({countdown}s)</span>
                    <Clickable
                      onClick={refresh}
                      disabled={isLoading}
                      className={isLoading ? "animate-spin" : ""}
                    >
                      <RiRefreshLine size={"1em"} />
                    </Clickable>
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
      <GridItem areas={[9, 10, 11, 12]} width={9 / 4} height={0.5}>
        <div className="h-full w-full flex flex-col justify-center p-10 gap-2">
          <p>此处的系统信息检测将每15s刷新一次。</p>
          <p>
            注意，在Serverless环境下此处数据无参考意义。请查看云平台监控以了解真实数据。
          </p>
        </div>
      </GridItem>
    </>
  );
}

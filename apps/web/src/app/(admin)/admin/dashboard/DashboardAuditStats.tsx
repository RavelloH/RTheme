"use client";

import { getAuditStats } from "@/actions/stat";
import { AutoTransition } from "@/ui/AutoTransition";
import Clickable from "@/ui/Clickable";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { RiRefreshLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import ErrorPage from "@/components/ui/Error";
import { useBroadcastSender } from "@/hooks/useBroadcast";
import Link from "@/components/Link";

type StatsData = {
  updatedAt: string;
  cache: boolean;
  total: {
    logs: number;
    activeUsers: number;
  };
  recent: {
    lastDay: number;
    last7Days: number;
    last30Days: number;
  };
};

export default function DashboardAuditStats() {
  const [result, setResult] = useState<StatsData | null>(null);
  const [refreshTime, setRefreshTime] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const { broadcast } = useBroadcastSender<{ type: "audit-refresh" }>();

  const fetchData = async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setResult(null);
    }
    setError(null);
    const res = await getAuditStats({ force: forceRefresh });
    if (!res.success) {
      setError(new Error(res.message || "获取审计日志统计失败"));
      return;
    }
    if (!res.data) return;
    setResult(res.data);
    setRefreshTime(new Date(res.data.updatedAt));

    // 刷新成功后广播消息，通知其他组件更新
    if (forceRefresh) {
      await broadcast({ type: "audit-refresh" });
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AutoTransition type="scale" className="h-full">
      {result ? (
        <div
          className="flex flex-col justify-between p-10 h-full"
          key="content"
        >
          <div>
            <div className="text-2xl py-2">
              <Link href="/admin/audit-logs" presets={["hover-underline"]}>
                审计日志
              </Link>
            </div>
            <div>
              共 {result.total.logs} 条审计日志，涉及 {result.total.activeUsers}{" "}
              名用户的操作记录。
            </div>
          </div>
          <div>
            <div>
              <span>
                最近24小时有 {result.recent.lastDay} 条记录，最近7天有{" "}
                {result.recent.last7Days} 条记录， 最近30天有{" "}
                {result.recent.last30Days} 条记录。
              </span>
            </div>
          </div>
          <div>
            {refreshTime && (
              <div className="inline-flex items-center gap-2">
                {result.cache ? "统计缓存于" : "数据刷新于"}:{" "}
                {new Date(refreshTime).toLocaleString()}
                <Clickable onClick={() => fetchData(true)}>
                  <RiRefreshLine size={"1em"} />
                </Clickable>
              </div>
            )}
          </div>
        </div>
      ) : error ? (
        <div className="px-10 h-full" key="error">
          <ErrorPage reason={error} reset={() => fetchData(true)} />
        </div>
      ) : (
        <div className="h-full">
          <LoadingIndicator key="loading" />
        </div>
      )}
    </AutoTransition>
  );
}

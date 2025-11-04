"use client";

import { getUsersStats } from "@/actions/stat";
import { GridItem } from "@/components/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import Clickable from "@/ui/Clickable";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { RiRefreshLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import ErrorPage from "@/components/ui/Error";
import { useBroadcastSender } from "@/hooks/useBroadcast";

type StatsData = {
  updatedAt: string;
  cache: boolean;
  total: {
    total: number;
    user: number;
    admin: number;
    editor: number;
    author: number;
  };
  active: {
    lastDay: number;
    last7Days: number;
    last30Days: number;
  };
  new: {
    lastDay: number;
    last7Days: number;
    last30Days: number;
  };
};

export default function UsersReport() {
  const [result, setResult] = useState<StatsData | null>(null);
  const [refreshTime, setRefreshTime] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const { broadcast } = useBroadcastSender<{ type: "users-refresh" }>();

  const fetchData = async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setResult(null);
    }
    setError(null);
    const res = await getUsersStats({ force: forceRefresh });
    if (!res.success) {
      setError(new Error(res.message || "获取用户统计失败"));
      return;
    }
    if (!res.data) return;
    setResult(res.data);
    setRefreshTime(new Date(res.data.updatedAt));

    // 刷新成功后广播消息,通知其他组件更新
    if (forceRefresh) {
      await broadcast({ type: "users-refresh" });
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GridItem areas={[1, 2, 3, 4, 5, 6, 7, 8]} width={1.5} height={0.5}>
      <AutoTransition type="scale" className="h-full">
        {result ? (
          <div
            className="flex flex-col justify-between p-10 h-full"
            key="content"
          >
            <div>
              <div className="text-2xl py-2">用户统计</div>
              <div>
                共 {result.total.total} 名用户，包括 {result.total.user}{" "}
                名普通用户、
                {result.total.admin} 名管理员、{result.total.editor} 名编辑、
                {result.total.author} 名作者。
              </div>
            </div>
            <div>
              <div className="grid grid-cols-[auto_auto] gap-x-4 gap-y-2 w-fit">
                <span className="text-right font-semibold">活跃用户：</span>
                <span>
                  24小时 {result.active.lastDay} / 7天 {result.active.last7Days}{" "}
                  / 30天 {result.active.last30Days}
                </span>

                <span className="text-right font-semibold">新增用户：</span>
                <span>
                  24小时 {result.new.lastDay} / 7天 {result.new.last7Days} /
                  30天 {result.new.last30Days}
                </span>

                <span className="text-right font-semibold">角色分布：</span>
                <span>
                  USER {result.total.user} / ADMIN {result.total.admin} / EDITOR{" "}
                  {result.total.editor} / AUTHOR {result.total.author}
                </span>
              </div>
            </div>
            <div>
              {refreshTime && (
                <div className="inline-flex items-center gap-2">
                  最近更新于: {new Date(refreshTime).toLocaleString()}
                  {result.cache && " (缓存)"}
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
    </GridItem>
  );
}

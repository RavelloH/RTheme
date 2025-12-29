"use client";

import { getPagesStats } from "@/actions/stat";
import runWithAuth from "@/lib/client/run-with-auth";
import { GridItem } from "@/components/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import Clickable from "@/ui/Clickable";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { RiRefreshLine, RiFileAddLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import ErrorPage from "@/components/ui/Error";
import { useBroadcastSender } from "@/hooks/use-broadcast";
import Link from "@/components/Link";

type StatsData = {
  updatedAt: string;
  cache: boolean;
  total: {
    total: number;
    active: number;
    suspended: number;
    system: number;
    custom: number;
  };
};

export default function PagesReport() {
  const [result, setResult] = useState<StatsData | null>(null);
  const [refreshTime, setRefreshTime] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const { broadcast } = useBroadcastSender<{ type: "pages-refresh" }>();

  const fetchData = async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setResult(null);
    }
    setError(null);
    const res = await runWithAuth(getPagesStats, { force: forceRefresh });
    if (!res || !("data" in res) || !res.data) {
      setError(new Error("获取页面统计失败"));
      return;
    }
    setResult(res.data);
    setRefreshTime(new Date(res.data.updatedAt));

    // 刷新成功后广播消息,通知其他组件更新
    if (forceRefresh) {
      await broadcast({ type: "pages-refresh" });
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <GridItem areas={[1, 2, 3, 4, 5, 6]} width={2} height={0.8}>
        <AutoTransition type="scale" className="h-full">
          {result ? (
            <div
              className="flex flex-col justify-between p-10 h-full"
              key="content"
            >
              <div>
                <div className="text-2xl py-2">页面统计</div>
                <div>
                  当前共有 {result.total.total} 个页面
                  {result.total.total > 0 &&
                    (() => {
                      const parts = [
                        result.total.active > 0 &&
                          `${result.total.active} 个已激活`,
                        result.total.suspended > 0 &&
                          `${result.total.suspended} 个已暂停`,
                      ].filter(Boolean);
                      return parts.length > 0
                        ? `，其中 ${parts.join("、")}`
                        : "";
                    })()}
                  。
                </div>
              </div>
              <div>
                <div className="space-y-2">
                  <div>
                    {result.total.system > 0 || result.total.custom > 0 ? (
                      <>
                        包含 {result.total.system} 个系统页面
                        {result.total.custom > 0 &&
                          ` 和 ${result.total.custom} 个自定义页面`}
                        。
                      </>
                    ) : result.total.total > 0 ? (
                      "暂无页面数据。"
                    ) : (
                      "暂无页面数据。"
                    )}
                  </div>

                  {result.total.total > 0 && (
                    <>
                      <div>
                        系统页面占比：
                        {result.total.total > 0
                          ? `${((result.total.system / result.total.total) * 100).toFixed(1)}%`
                          : "0%"}
                        ，自定义页面占比：
                        {result.total.total > 0
                          ? `${((result.total.custom / result.total.total) * 100).toFixed(1)}%`
                          : "0%"}
                        。
                      </div>

                      {result.total.active > 0 && (
                        <div>
                          当前有 {result.total.active}{" "}
                          个页面处于激活状态，占活跃页面总数的{" "}
                          {result.total.total > 0
                            ? `${((result.total.active / result.total.total) * 100).toFixed(1)}%`
                            : "0%"}
                          。
                        </div>
                      )}

                      {result.total.suspended > 0 && (
                        <div>
                          有 {result.total.suspended} 个页面处于暂停状态。
                        </div>
                      )}
                    </>
                  )}
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
      <GridItem areas={[7, 8]} width={6} height={0.2}>
        <AutoTransition type="scale" className="h-full">
          <Link
            href="/admin/pages/new"
            className="h-full flex gap-2 items-center justify-center text-2xl hover:bg-primary hover:text-primary-foreground transition-all"
          >
            <RiFileAddLine size="1.1em" /> 新建页面
          </Link>
        </AutoTransition>
      </GridItem>
    </>
  );
}

"use client";

import { getStorageStats } from "@/actions/stat";
import runWithAuth from "@/lib/client/runWithAuth";
import { GridItem } from "@/components/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import Clickable from "@/ui/Clickable";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { RiRefreshLine } from "@remixicon/react";
import { useEffect, useState } from "react";
import ErrorPage from "@/components/ui/Error";
import { useBroadcastSender } from "@/hooks/useBroadcast";
import { Dialog } from "@/ui/Dialog";

type StatsData = {
  updatedAt: string;
  cache: boolean;
  total: {
    total: number;
    active: number;
    inactive: number;
    default: number;
  };
  byType: Array<{
    type: "LOCAL" | "AWS_S3" | "GITHUB_PAGES" | "VERCEL_BLOB";
    count: number;
    active: number;
    mediaCount: number;
  }>;
  storage: {
    totalProviders: number;
    activeProviders: number;
    totalMediaFiles: number;
    averageFileSize: number;
  };
};

export default function StoragesInfo() {
  const [result, setResult] = useState<StatsData | null>(null);
  const [refreshTime, setRefreshTime] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const { broadcast } = useBroadcastSender<{ type: "storages-refresh" }>();

  const fetchData = async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setResult(null);
    }
    setError(null);
    const res = await runWithAuth(getStorageStats, { force: forceRefresh });
    if (!res || !("data" in res) || !res.data) {
      setError(new Error("获取存储统计失败"));
      return;
    }
    const data = res.data;
    setResult(data);
    setRefreshTime(new Date(data.updatedAt));

    // 刷新成功后广播消息,通知其他组件更新
    if (forceRefresh) {
      await broadcast({ type: "storages-refresh" });
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      LOCAL: "本地存储",
      AWS_S3: "AWS S3",
      GITHUB_PAGES: "GitHub Pages",
      VERCEL_BLOB: "Vercel Blob",
    };
    return labels[type] || type;
  };

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
                <div className="text-2xl py-2">存储统计</div>
                <div>
                  当前共有 {result.total.total} 个存储提供商
                  {result.total.total > 0 &&
                    (() => {
                      const parts = [
                        result.total.active > 0 &&
                          `${result.total.active} 个已激活`,
                        result.total.inactive > 0 &&
                          `${result.total.inactive} 个已停用`,
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
                    {result.total.default > 0 ? (
                      <>当前有 {result.total.default} 个默认存储提供商。</>
                    ) : (
                      "暂未设置默认存储提供商。"
                    )}
                  </div>

                  {result.byType.length > 0 && (
                    <div>
                      <div>按类型分布：</div>
                      <div className="ml-4">
                        {result.byType.map((type) => (
                          <div key={type.type} className="text-sm">
                            {getTypeLabel(type.type)}: {type.count} 个
                            {type.mediaCount > 0 && (
                              <>，{type.mediaCount} 个文件</>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.storage.totalMediaFiles > 0 && (
                    <div>
                      总共存储了 {result.storage.totalMediaFiles} 个媒体文件，
                      平均文件大小{" "}
                      {formatFileSize(result.storage.averageFileSize)}。
                    </div>
                  )}
                </div>
              </div>
              <div>
                {refreshTime && (
                  <div className="inline-flex items-center gap-2">
                    最近更新于: {new Date(refreshTime).toLocaleString()}
                    {result?.cache && " (缓存)"}
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
          <Dialog open={false} onClose={() => {}} title="新建存储提供商">
            <div className="py-4">
              <p className="text-muted-foreground">
                在这里配置新的存储提供商。支持本地存储、云存储等多种类型。
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                详细配置指南，请参阅文档。
              </p>
            </div>
            {/* TODO: 添加创建存储的表单 */}
          </Dialog>
        </AutoTransition>
      </GridItem>
    </>
  );
}

"use client";

import { doctor } from "@/actions/doctor";
import { GridItem } from "@/components/RowGrid";
import { AutoTransition } from "@/ui/AutoTransition";
import Clickable from "@/ui/Clickable";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { RiRefreshLine } from "@remixicon/react";
import { useEffect, useState, Fragment } from "react";
import ErrorPage from "@/components/ui/Error";
import { useBroadcastSender } from "@/hooks/useBroadcast";

type issue = {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  details?: string;
}[];

export default function DoctorReport() {
  const [result, setResult] = useState<issue>([]);
  const [refreshTime, setRefreshTime] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const { broadcast } = useBroadcastSender<{ type: "doctor-refresh" }>();

  // 统计不同严重级别的问题数量
  const errorCount = result.filter((item) => item.severity === "error").length;
  const warningCount = result.filter(
    (item) => item.severity === "warning",
  ).length;

  // 生成问题描述
  const getIssueDescription = () => {
    if (errorCount === 0 && warningCount === 0) {
      return "未发现问题。";
    }
    const parts = [];
    if (errorCount > 0) {
      parts.push(`${errorCount}项错误`);
    }
    if (warningCount > 0) {
      parts.push(`${warningCount}项警告`);
    }
    return parts.join("、") + "。";
  };

  // 按严重程度排序
  const getSortedResult = () => {
    const severityOrder = { error: 0, warning: 1, info: 2 };
    return [...result].sort(
      (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
    );
  };

  const fetchData = async (forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setResult([]);
    }
    setError(null);
    const res = await doctor({ force: forceRefresh });
    if (!res.success) {
      setError(new Error(res.message || "获取运行状况失败"));
      return;
    }
    if (!res.data.issues) return;
    setResult(res.data.issues);
    setRefreshTime(new Date(res.data.createdAt));

    // 刷新成功后广播消息,通知其他组件更新
    if (forceRefresh) {
      await broadcast({ type: "doctor-refresh" });
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GridItem areas={[1, 2, 3, 4, 5, 6, 7, 8]} width={1.5} height={0.5}>
      <AutoTransition type="scale" className="h-full">
        {result.length > 0 ? (
          <div
            className="flex flex-col justify-between p-10 h-full"
            key="content"
          >
            <div>
              <div className="text-2xl py-2">运行状况检查</div>
              <div>
                共检查 {result.length} 项，{getIssueDescription()}
              </div>
            </div>
            <div>
              <div className="grid grid-cols-[auto_auto_auto] gap-x-4 gap-y-1 w-fit">
                {getSortedResult().map((issue, index) => {
                  const colorClass =
                    issue.severity === "error"
                      ? "text-error"
                      : issue.severity === "warning"
                        ? "text-warning"
                        : "";
                  return (
                    <Fragment key={`issue-${index}`}>
                      <span className={`text-right ${colorClass}`}>
                        {issue.severity.toUpperCase()}:
                      </span>
                      <span className={colorClass}>{issue.message}：</span>
                      <span className={colorClass}>
                        {issue.details ? `${issue.details}` : ""}
                      </span>
                    </Fragment>
                  );
                })}
              </div>
            </div>
            <div>
              {refreshTime && (
                <div className="inline-flex items-center gap-2">
                  最近检查于: {new Date(refreshTime).toLocaleString()}
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

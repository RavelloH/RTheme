"use client";

import { useEffect, useState } from "react";
import { RiRefreshLine } from "@remixicon/react";

import { doctor } from "@/actions/doctor";
import ErrorPage from "@/components/ui/Error";
import Link from "@/components/ui/Link";
import { AutoTransition } from "@/ui/AutoTransition";
import Clickable from "@/ui/Clickable";
import { LoadingIndicator } from "@/ui/LoadingIndicator";

type issue = {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  details?: string;
}[];

interface DashboardDoctorProps {
  initialData?: {
    issues: issue;
    createdAt: string;
  } | null;
}

export default function DashboardDoctor({
  initialData = null,
}: DashboardDoctorProps) {
  const [result, setResult] = useState<issue>(initialData?.issues ?? []);
  const [refreshTime, setRefreshTime] = useState<Date | null>(
    initialData ? new Date(initialData.createdAt) : null,
  );
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async (manualRefresh: boolean = false) => {
    if (manualRefresh) {
      setResult([]);
    }
    setError(null);
    const res = await doctor({ force: manualRefresh });
    if (!res.success || !res.data) {
      setError(new Error(res.message || "获取运行状况失败"));
      return;
    }
    setResult(res.data.issues);
    setRefreshTime(new Date(res.data.createdAt));
  };

  useEffect(() => {
    if (initialData) return;
    fetchData();
  }, [initialData]);
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

  const renderIssues = () => {
    // 只显示错误和警告
    const errors = result.filter((item) => item.severity === "error");
    const warnings = result.filter((item) => item.severity === "warning");

    if (errors.length === 0 && warnings.length === 0) {
      return <div className="text-success">系统全部组件运行正常。</div>;
    }

    // 将每个问题转换为自然语言文本
    const formatIssue = (issue: { message: string; details?: string }) => {
      return issue.details
        ? `${issue.message}：${issue.details}`
        : issue.message;
    };

    return (
      <div className="space-y-1">
        {errors.length > 0 && (
          <div className="text-error">{errors.map(formatIssue).join("，")}</div>
        )}
        {warnings.length > 0 && (
          <div className="text-warning">
            {warnings.map(formatIssue).join("，")}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-10 h-full">
      <AutoTransition className="h-full" type="scale">
        {result.length > 0 ? (
          <div key="content" className="flex flex-col justify-between h-full">
            <div>
              <div className="text-2xl py-2">
                <Link href="/admin/doctor" presets={["hover-underline"]}>
                  运行状况检查
                </Link>
              </div>
              <div>
                共检测{result.length}项，{getIssueDescription()}
              </div>
            </div>
            <div>{renderIssues()}</div>
            <div className="flex justify-between items-center">
              {refreshTime && (
                <div className="inline-flex items-center gap-x-2">
                  最近检查于: {new Date(refreshTime).toLocaleString()}
                  <Clickable onClick={() => fetchData(true)}>
                    <RiRefreshLine size={"1em"} />
                  </Clickable>
                </div>
              )}
              <Link
                href="/admin/doctor"
                className="text-primary ml-auto"
                presets={["hover-underline", "arrow"]}
              >
                查看完整报告
              </Link>
            </div>
          </div>
        ) : error ? (
          <ErrorPage reason={error} reset={() => fetchData(true)} />
        ) : (
          <LoadingIndicator key="loading" size="md" />
        )}
      </AutoTransition>
    </div>
  );
}

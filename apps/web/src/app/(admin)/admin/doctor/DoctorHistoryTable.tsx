"use client";

import { getDoctorHistory } from "@/actions/doctor";
import GridTable from "@/components/GridTable";
import { TableColumn } from "@/ui/Table";
import { useEffect, useState } from "react";
import type { DoctorHistoryItem } from "@repo/shared-types/api/doctor";

type HealthCheckIssue = {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  details?: string;
};

export default function DoctorHistoryTable() {
  const [data, setData] = useState<DoctorHistoryItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [dynamicColumns, setDynamicColumns] = useState<
    TableColumn<DoctorHistoryItem>[]
  >([]);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);

  // 处理排序变化
  const handleSortChange = (key: string, order: "asc" | "desc" | null) => {
    setSortKey(order ? key : null);
    setSortOrder(order);
    setPage(1); // 排序变化时重置到第一页
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // 构建请求参数
        const params: {
          page: number;
          pageSize: number;
          sortBy?: "id" | "createdAt" | "errorCount" | "warningCount";
          sortOrder?: "asc" | "desc";
        } = {
          page,
          pageSize,
        };

        // 只在有有效的排序参数时才添加
        if (sortKey && sortOrder) {
          params.sortBy = sortKey as
            | "id"
            | "createdAt"
            | "errorCount"
            | "warningCount";
          params.sortOrder = sortOrder;
        }

        const result = await getDoctorHistory(params);

        if (result.success && result.data) {
          setData(result.data);
          console.log(result.data);
          setTotalRecords(result.meta?.total || 0);
          if (result.meta) {
            setTotalPages(result.meta.totalPages);
          }

          // 动态生成检测项列
          if (result.data.length > 0) {
            const allIssues = result.data.flatMap(
              (item) => item.issues as HealthCheckIssue[],
            );
            // 提取所有唯一的检测项
            const uniqueIssues = Array.from(
              new Map(allIssues.map((issue) => [issue.code, issue])).values(),
            );

            // 为每个检测项创建一列
            const issueColumns: TableColumn<DoctorHistoryItem>[] =
              uniqueIssues.map((issue) => ({
                key: issue.code,
                title: issue.message,
                dataIndex: "issues",
                align: "left" as const,
                mono: true,
                render: (value: unknown) => {
                  if (Array.isArray(value)) {
                    const issues = value as HealthCheckIssue[];
                    const targetIssue = issues.find(
                      (i) => i.code === issue.code,
                    );
                    if (targetIssue) {
                      const colorClass =
                        targetIssue.severity === "error"
                          ? "text-error"
                          : targetIssue.severity === "warning"
                            ? "text-warning"
                            : "text-muted-foreground";
                      return (
                        <span className={`text-sm ${colorClass}`}>
                          {targetIssue.details || "-"}
                        </span>
                      );
                    }
                  }
                  return <span className="text-muted-foreground">-</span>;
                },
              }));

            setDynamicColumns(issueColumns);
          }
        }
      } catch (error) {
        console.error("Failed to fetch doctor history:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [page, pageSize, sortKey, sortOrder]);

  const baseColumns: TableColumn<DoctorHistoryItem>[] = [
    {
      key: "id",
      title: "ID",
      dataIndex: "id",
      align: "left",
      sortable: true,
      mono: true,
    },
    {
      key: "createdAt",
      title: "检查时间",
      dataIndex: "createdAt",
      sortable: true,
      mono: true,
      render: (value: unknown) => {
        if (typeof value === "string") {
          return new Date(value).toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
        }
        return "-";
      },
    },
    {
      key: "errorCount",
      title: "错误数",
      dataIndex: "issues",
      align: "left",
      mono: true,
      sortable: true,
      render: (value: unknown) => {
        if (Array.isArray(value)) {
          const issues = value as HealthCheckIssue[];
          const errorCount = issues.filter(
            (item) => item.severity === "error",
          ).length;
          return (
            <span
              className={
                errorCount > 0
                  ? "text-error font-semibold"
                  : "text-muted-foreground"
              }
            >
              {errorCount}
            </span>
          );
        }
        return "0";
      },
    },
    {
      key: "warningCount",
      title: "警告数",
      dataIndex: "issues",
      align: "left",
      mono: true,
      sortable: true,
      render: (value: unknown) => {
        if (Array.isArray(value)) {
          const issues = value as HealthCheckIssue[];
          const warningCount = issues.filter(
            (item) => item.severity === "warning",
          ).length;
          return (
            <span
              className={
                warningCount > 0
                  ? "text-warning font-semibold"
                  : "text-muted-foreground"
              }
            >
              {warningCount}
            </span>
          );
        }
        return "0";
      },
    },
  ];

  // 合并基础列和动态列
  const columns = [...baseColumns, ...dynamicColumns];

  return (
    <GridTable
      title="运行状况历史记录"
      columns={columns}
      data={data}
      loading={loading}
      rowKey="id"
      page={page}
      totalPages={totalPages}
      totalRecords={totalRecords}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      onSortChange={handleSortChange}
      striped
      hoverable
      bordered={false}
      size="sm"
      emptyText="暂无历史记录"
      stickyHeader
      maxHeight="100%"
      padding={2.5}
    />
  );
}

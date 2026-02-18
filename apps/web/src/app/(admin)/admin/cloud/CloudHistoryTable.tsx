"use client";

import { useEffect, useState } from "react";
import { RiEyeLine } from "@remixicon/react";
import type { CloudHistoryItem } from "@repo/shared-types/api/cloud";
import { codeToHtml } from "shiki";

import { getCloudHistory } from "@/actions/cloud";
import type { FilterConfig } from "@/components/ui/GridTable";
import GridTable from "@/components/ui/GridTable";
import { useBroadcast } from "@/hooks/use-broadcast";
import Clickable from "@/ui/Clickable";
import { Dialog } from "@/ui/Dialog";
import type { TableColumn } from "@/ui/Table";

type SortKey =
  | "id"
  | "receivedAt"
  | "status"
  | "verifySource"
  | "accepted"
  | "dedupHit"
  | "createdAt";

const STATUS_LABELS: Record<CloudHistoryItem["status"], string> = {
  RECEIVED: "已接收",
  DONE: "已完成",
  ERROR: "执行失败",
  REJECTED: "已拒绝",
};

const VERIFY_SOURCE_LABELS: Record<
  NonNullable<CloudHistoryItem["verifySource"]>,
  string
> = {
  DOH: "DoH",
  JWKS: "JWKS",
  NONE: "NONE",
};

const TRIGGER_TYPE_LABELS: Record<CloudHistoryItem["triggerType"], string> = {
  MANUAL: "手动触发",
  CLOUD: "云端触发",
  AUTO: "自动触发",
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getStatusClass(status: CloudHistoryItem["status"]): string {
  if (status === "ERROR" || status === "REJECTED") return "text-error";
  if (status === "RECEIVED") return "text-warning";
  return "text-success";
}

function JSONHighlight({ json }: { json: unknown }) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    let disposed = false;

    const run = async () => {
      const jsonString = JSON.stringify(json ?? null, null, 2);
      try {
        const highlighted = await codeToHtml(jsonString, {
          lang: "json",
          themes: {
            light: "github-light",
            dark: "github-dark",
          },
        });

        if (!disposed) {
          setHtml(highlighted);
        }
      } catch (error) {
        console.error("[CloudHistoryTable] Shiki 高亮失败:", error);
        if (!disposed) {
          const escaped = jsonString
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
          setHtml(`<pre class="shiki"><code>${escaped}</code></pre>`);
        }
      }
    };

    void run();
    return () => {
      disposed = true;
    };
  }, [json]);

  return (
    <div
      className="
        rounded-sm
        border border-foreground/10
        overflow-auto
        max-h-[40vh]
        [&_pre]:!m-0
        [&_pre]:!rounded-none
      "
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function buildTelemetryJson(record: CloudHistoryItem): unknown {
  if (!record.telemetry) return null;
  if (record.telemetry.raw !== undefined) {
    return record.telemetry.raw;
  }

  return {
    schemaVer: record.telemetry.schemaVer ?? null,
    collectedAt: record.telemetry.collectedAt ?? null,
    latestStatus: record.telemetry.latestStatus ?? null,
    latestDurationMs: record.telemetry.latestDurationMs ?? null,
    doctorDurationMs: record.telemetry.doctorDurationMs ?? null,
    projectsDurationMs: record.telemetry.projectsDurationMs ?? null,
    friendsDurationMs: record.telemetry.friendsDurationMs ?? null,
    healthStatus: record.telemetry.healthStatus ?? null,
    appVersion: record.telemetry.appVersion ?? null,
    verifyMs: record.telemetry.verifyMs ?? null,
    tokenAgeMs: record.telemetry.tokenAgeMs ?? null,
  };
}

function formatTelemetrySummary(item: CloudHistoryItem): string {
  const telemetry = item.telemetry;
  if (!telemetry) {
    return item.message || "暂无遥测数据。";
  }

  const parts: string[] = [];
  if (telemetry.latestStatus && telemetry.latestDurationMs !== null) {
    parts.push(
      `最新 Cron 为 ${telemetry.latestStatus}，耗时 ${telemetry.latestDurationMs}ms`,
    );
  }
  if (
    telemetry.doctorDurationMs !== null &&
    telemetry.projectsDurationMs !== null &&
    telemetry.friendsDurationMs !== null
  ) {
    parts.push(
      `分项耗时：doctor ${telemetry.doctorDurationMs}ms、projects ${telemetry.projectsDurationMs}ms、friends ${telemetry.friendsDurationMs}ms`,
    );
  }
  if (telemetry.healthStatus) {
    parts.push(`健康状态 ${telemetry.healthStatus}`);
  }
  if (telemetry.verifyMs !== null) {
    parts.push(`验签耗时 ${telemetry.verifyMs}ms`);
  }
  if (telemetry.appVersion) {
    parts.push(`版本 ${telemetry.appVersion}`);
  }

  if (parts.length === 0) {
    return item.message || "已接收，暂无可读摘要。";
  }
  return `${parts.join("；")}。`;
}

function parseBooleanFilter(value: string): boolean | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  return undefined;
}

export default function CloudHistoryTable() {
  const [data, setData] = useState<CloudHistoryItem[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [filterValues, setFilterValues] = useState<
    Record<string, string | string[] | { start?: string; end?: string }>
  >({});
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CloudHistoryItem | null>(
    null,
  );

  const handleSortChange = (key: string, order: "asc" | "desc" | null) => {
    setSortKey(order ? (key as SortKey) : null);
    setSortOrder(order);
    setPage(1);
  };

  const handleFilterChange = (
    filters: Record<
      string,
      string | string[] | { start?: string; end?: string }
    >,
  ) => {
    setFilterValues(filters);
    setPage(1);
  };

  const filterConfig: FilterConfig[] = [
    {
      key: "id",
      label: "记录 ID",
      type: "input",
      inputType: "number",
      placeholder: "输入记录 ID",
    },
    {
      key: "deliveryId",
      label: "Delivery ID",
      type: "input",
      inputType: "text",
      placeholder: "输入 deliveryId",
    },
    {
      key: "status",
      label: "状态",
      type: "input",
      inputType: "text",
      placeholder: "RECEIVED / DONE / ERROR / REJECTED",
    },
    {
      key: "verifySource",
      label: "验签来源",
      type: "input",
      inputType: "text",
      placeholder: "DOH / JWKS / NONE",
    },
    {
      key: "accepted",
      label: "已接收",
      type: "input",
      inputType: "text",
      placeholder: "true / false",
    },
    {
      key: "dedupHit",
      label: "命中去重",
      type: "input",
      inputType: "text",
      placeholder: "true / false",
    },
    {
      key: "createdAt",
      label: "创建时间",
      type: "dateRange",
      dateFields: { start: "createdAtStart", end: "createdAtEnd" },
    },
  ];

  useBroadcast<{ type: string }>((message) => {
    if (message.type === "cloud-refresh") {
      setRefreshTrigger((prev) => prev + 1);
    }
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const params: {
          page: number;
          pageSize: number;
          sortBy?: SortKey;
          sortOrder?: "asc" | "desc";
          id?: number;
          deliveryId?: string;
          status?: "RECEIVED" | "DONE" | "ERROR" | "REJECTED";
          verifySource?: "DOH" | "JWKS" | "NONE";
          accepted?: boolean;
          dedupHit?: boolean;
          createdAtStart?: string;
          createdAtEnd?: string;
        } = {
          page,
          pageSize,
        };

        if (sortKey && sortOrder) {
          params.sortBy = sortKey;
          params.sortOrder = sortOrder;
        }

        if (filterValues.id && typeof filterValues.id === "string") {
          params.id = parseInt(filterValues.id, 10);
        }

        if (
          filterValues.deliveryId &&
          typeof filterValues.deliveryId === "string" &&
          filterValues.deliveryId.trim().length > 0
        ) {
          params.deliveryId = filterValues.deliveryId.trim();
        }

        if (filterValues.status && typeof filterValues.status === "string") {
          const normalized = filterValues.status.trim().toUpperCase();
          if (
            normalized === "RECEIVED" ||
            normalized === "DONE" ||
            normalized === "ERROR" ||
            normalized === "REJECTED"
          ) {
            params.status = normalized;
          }
        }

        if (
          filterValues.verifySource &&
          typeof filterValues.verifySource === "string"
        ) {
          const normalized = filterValues.verifySource.trim().toUpperCase();
          if (
            normalized === "DOH" ||
            normalized === "JWKS" ||
            normalized === "NONE"
          ) {
            params.verifySource = normalized;
          }
        }

        if (
          filterValues.accepted &&
          typeof filterValues.accepted === "string"
        ) {
          params.accepted = parseBooleanFilter(filterValues.accepted);
        }

        if (
          filterValues.dedupHit &&
          typeof filterValues.dedupHit === "string"
        ) {
          params.dedupHit = parseBooleanFilter(filterValues.dedupHit);
        }

        if (
          filterValues.createdAt &&
          typeof filterValues.createdAt === "object"
        ) {
          const dateRange = filterValues.createdAt as {
            start?: string;
            end?: string;
          };
          if (dateRange.start) {
            params.createdAtStart = dateRange.start;
          }
          if (dateRange.end) {
            params.createdAtEnd = dateRange.end;
          }
        }

        const result = await getCloudHistory(params);
        if (result.success && result.data) {
          setData(result.data);
          setTotalRecords(result.meta?.total || 0);
          if (result.meta) {
            setTotalPages(result.meta.totalPages);
          }
        }
      } catch (fetchError) {
        console.error("[CloudHistoryTable] 获取历史失败:", fetchError);
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [filterValues, page, pageSize, refreshTrigger, sortKey, sortOrder]);

  const columns: TableColumn<CloudHistoryItem>[] = [
    {
      key: "id",
      title: "ID",
      dataIndex: "id",
      align: "left",
      sortable: true,
      mono: true,
    },
    {
      key: "status",
      title: "状态",
      dataIndex: "status",
      align: "center",
      sortable: true,
      mono: true,
      render: (value: unknown) => {
        if (
          value === "RECEIVED" ||
          value === "DONE" ||
          value === "ERROR" ||
          value === "REJECTED"
        ) {
          return (
            <span className={getStatusClass(value)}>
              {STATUS_LABELS[value]}
            </span>
          );
        }
        return "-";
      },
    },
    {
      key: "verifySource",
      title: "验签来源",
      dataIndex: "verifySource",
      align: "center",
      sortable: true,
      mono: true,
      render: (value: unknown) => {
        if (value === "DOH" || value === "JWKS" || value === "NONE") {
          return VERIFY_SOURCE_LABELS[value];
        }
        return <span className="text-muted-foreground">-</span>;
      },
    },
    {
      key: "accepted",
      title: "接收",
      dataIndex: "accepted",
      align: "center",
      sortable: true,
      mono: true,
      render: (value: unknown) => {
        if (typeof value === "boolean") {
          return value ? (
            <span className="text-success">是</span>
          ) : (
            <span className="text-error">否</span>
          );
        }
        return "-";
      },
    },
    {
      key: "dedupHit",
      title: "去重",
      dataIndex: "dedupHit",
      align: "center",
      sortable: true,
      mono: true,
      render: (value: unknown) => {
        if (typeof value === "boolean") {
          return value ? "是" : "否";
        }
        return "-";
      },
    },
    {
      key: "deliveryId",
      title: "Delivery ID",
      width: "25%",
      dataIndex: "deliveryId",
      align: "left",
      render: (value: unknown) =>
        typeof value === "string" && value.trim().length > 0 ? (
          <span className="font-mono text-xs break-all line-clamp-2">
            {value}
          </span>
        ) : (
          "-"
        ),
    },
    {
      key: "summary",
      title: "摘要",
      width: "30%",
      dataIndex: "id",
      align: "left",
      render: (_: unknown, record) => (
        <span className="text-sm line-clamp-2">
          {formatTelemetrySummary(record)}
        </span>
      ),
    },
    {
      key: "receivedAt",
      title: "接收时间",
      dataIndex: "receivedAt",
      align: "left",
      sortable: true,
      mono: true,
      render: (value: unknown) =>
        typeof value === "string" ? formatDateTime(value) : "-",
    },
    {
      key: "createdAt",
      title: "记录时间",
      dataIndex: "createdAt",
      align: "left",
      sortable: true,
      mono: true,
      render: (value: unknown) =>
        typeof value === "string" ? formatDateTime(value) : "-",
    },
    {
      key: "detail",
      title: "详情",
      dataIndex: "id",
      align: "center",
      render: () => (
        <Clickable className="text-primary hover:text-primary/80 text-sm flex items-center justify-center gap-1">
          <RiEyeLine size="1em" />
        </Clickable>
      ),
    },
  ];

  return (
    <>
      <GridTable
        title="云触发历史"
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
        onRowClick={(record) => {
          setSelectedRecord(record);
          setDetailDialogOpen(true);
        }}
        filterConfig={filterConfig}
        onFilterChange={handleFilterChange}
        striped
        hoverable
        bordered={false}
        size="sm"
        emptyText="暂无云触发历史"
        stickyHeader
        maxHeight="100%"
        padding={2.5}
      />

      <Dialog
        open={detailDialogOpen}
        onClose={() => {
          setDetailDialogOpen(false);
          setSelectedRecord(null);
        }}
        title={`云触发详情 - ID: ${selectedRecord?.id || ""}`}
        size="lg"
      >
        {selectedRecord && (
          <div className="px-6 py-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
                记录概览
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">
                    记录 ID
                  </label>
                  <p className="text-sm font-mono">{selectedRecord.id}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">状态</label>
                  <p
                    className={`text-sm ${getStatusClass(selectedRecord.status)}`}
                  >
                    {STATUS_LABELS[selectedRecord.status]}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    触发类型
                  </label>
                  <p className="text-sm">
                    {TRIGGER_TYPE_LABELS[selectedRecord.triggerType]}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    验签来源
                  </label>
                  <p className="text-sm">
                    {selectedRecord.verifySource
                      ? VERIFY_SOURCE_LABELS[selectedRecord.verifySource]
                      : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    验签结果
                  </label>
                  <p className="text-sm">
                    {selectedRecord.verifyOk ? "通过" : "未通过"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    接收时间
                  </label>
                  <p className="text-sm font-mono">
                    {formatDateTime(selectedRecord.receivedAt)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    请求时间
                  </label>
                  <p className="text-sm font-mono">
                    {selectedRecord.requestedAt
                      ? formatDateTime(selectedRecord.requestedAt)
                      : "-"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    创建时间
                  </label>
                  <p className="text-sm font-mono">
                    {formatDateTime(selectedRecord.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    更新时间
                  </label>
                  <p className="text-sm font-mono">
                    {formatDateTime(selectedRecord.updatedAt)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Delivery ID
                  </label>
                  <p className="text-xs font-mono break-all">
                    {selectedRecord.deliveryId}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    已接收
                  </label>
                  <p className="text-sm">
                    {selectedRecord.accepted ? "是" : "否"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    去重命中
                  </label>
                  <p className="text-sm">
                    {selectedRecord.dedupHit ? "是" : "否"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Cron 记录 ID
                  </label>
                  <p className="text-sm font-mono">
                    {selectedRecord.cronHistoryId ?? "-"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground">
                    附加信息
                  </label>
                  <p className="text-sm">{selectedRecord.message || "-"}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
                自然语言摘要
              </h3>
              <p className="text-sm leading-7">
                {formatTelemetrySummary(selectedRecord)}
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground border-b border-foreground/10 pb-2">
                遥测 JSON（Shiki 高亮）
              </h3>
              <JSONHighlight json={buildTelemetryJson(selectedRecord)} />
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

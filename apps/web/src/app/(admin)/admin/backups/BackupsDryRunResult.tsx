"use client";

import { useCallback, useState } from "react";

import { importBackup } from "@/actions/backup";
import { resolveApiResponse } from "@/lib/client/run-with-auth";
import runWithAuth from "@/lib/client/run-with-auth";
import { formatBytes } from "@/lib/shared/format";
import { useBackupStore } from "@/store/backup-store";
import { AlertDialog } from "@/ui/AlertDialog";
import { AutoTransition } from "@/ui/AutoTransition";
import { Button } from "@/ui/Button";
import { useToast } from "@/ui/Toast";

export default function BackupsDryRunResult() {
  const toast = useToast();
  const dryRunResult = useBackupStore((state) => state.dryRunResult);
  const importSource = useBackupStore((state) => state.importSource);
  const clearDryRunResult = useBackupStore((state) => state.clearDryRunResult);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleImport = useCallback(async () => {
    if (!dryRunResult || !importSource) {
      toast.warning("请先在导入窗口重新执行 dry-run");
      return;
    }

    setImporting(true);
    try {
      const result = await runWithAuth(importBackup, {
        access_token: undefined,
        source: importSource,
        scope: dryRunResult.scope,
        mode: "REPLACE",
        expectedChecksum: dryRunResult.checksum,
        confirmText: dryRunResult.confirmText,
      });
      const apiResponse = await resolveApiResponse(result);
      if (!apiResponse?.success || !apiResponse.data) {
        toast.error(apiResponse?.message || "导入失败");
        return;
      }

      clearDryRunResult();
      setImportConfirmOpen(false);
      toast.success(
        "导入成功",
        `删除 ${apiResponse.data.summary.deletedRows} 行，写入 ${apiResponse.data.summary.insertedRows} 行`,
      );
    } catch (error) {
      console.error("[BackupsDryRunResult] 导入失败:", error);
      toast.error("导入失败");
    } finally {
      setImporting(false);
    }
  }, [clearDryRunResult, dryRunResult, importSource, toast]);

  return (
    <>
      <AutoTransition type="scale" className="h-full">
        {!dryRunResult ? (
          <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
            暂无预检结果。请先在“导入还原”面板执行预检。
          </div>
        ) : (
          <div className="flex h-full flex-col gap-4 p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="text-2xl">预检结果</div>
              <div className="text-sm text-muted-foreground">
                {dryRunResult.scope} · {formatBytes(dryRunResult.sizeBytes)}
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              checksum: {dryRunResult.checksum}
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              {dryRunResult.ready ? (
                <span className="text-success">状态：可导入</span>
              ) : (
                <span className="text-warning">状态：存在风险，请先处理</span>
              )}
              <Button
                label={importing ? "导入中..." : "执行导入"}
                size="sm"
                variant="danger"
                disabled={!dryRunResult.ready || !importSource}
                loading={importing}
                onClick={() => setImportConfirmOpen(true)}
              />
            </div>
            {!importSource && (
              <div className="text-sm text-warning">
                当前导入源不可用，请重新打开导入窗口执行 dry-run。
              </div>
            )}

            {dryRunResult.issues.length > 0 && (
              <div className="space-y-2">
                {dryRunResult.issues.map((issue, index) => (
                  <div
                    key={`${issue.code}-${index}`}
                    className={`px-3 py-2 text-sm ${
                      issue.level === "error"
                        ? "bg-error/20 text-error"
                        : "bg-warning/20 text-warning"
                    }`}
                  >
                    [{issue.level.toUpperCase()}] {issue.message}
                  </div>
                ))}
              </div>
            )}

            <div className="overflow-auto border border-border">
              <table className="w-full min-w-[780px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 text-left">表/关系</th>
                    <th className="px-3 py-2 text-right">当前</th>
                    <th className="px-3 py-2 text-right">导入文件</th>
                    <th className="px-3 py-2 text-right">将删除</th>
                    <th className="px-3 py-2 text-right">将写入</th>
                  </tr>
                </thead>
                <tbody>
                  {dryRunResult.tablePlans.map((plan) => (
                    <tr key={plan.table} className="border-b border-border">
                      <td className="px-3 py-2">{plan.table}</td>
                      <td className="px-3 py-2 text-right">{plan.current}</td>
                      <td className="px-3 py-2 text-right">{plan.incoming}</td>
                      <td className="px-3 py-2 text-right">{plan.toDelete}</td>
                      <td className="px-3 py-2 text-right">{plan.toInsert}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-sm text-muted-foreground">
              汇总：当前 {dryRunResult.summary.currentRows} 行，导入{" "}
              {dryRunResult.summary.incomingRows} 行，将删除{" "}
              {dryRunResult.summary.toDelete} 行，将写入{" "}
              {dryRunResult.summary.toInsert} 行。
            </div>
          </div>
        )}
      </AutoTransition>

      <AlertDialog
        open={importConfirmOpen}
        onClose={() => setImportConfirmOpen(false)}
        onConfirm={() => void handleImport()}
        title="确认执行导入"
        description="该操作将按分组执行替换还原，且不可撤销。确认继续后将立即执行。"
        confirmText="确认导入"
        cancelText="取消"
        variant="danger"
        loading={importing}
      />
    </>
  );
}

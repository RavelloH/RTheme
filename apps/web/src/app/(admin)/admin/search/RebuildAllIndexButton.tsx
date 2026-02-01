"use client";

import { useState } from "react";
import { RiDatabase2Line } from "@remixicon/react";

import { indexPosts } from "@/actions/search";
import { GridItem } from "@/components/RowGrid";
import { AlertDialog } from "@/ui/AlertDialog";
import { useToast } from "@/ui/Toast";

export default function RebuildAllIndexButton() {
  const toast = useToast();
  const [alertOpen, setAlertOpen] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);

  const handleConfirm = async () => {
    setIsRebuilding(true);
    try {
      // 不传 slugs 参数，表示重建所有文章的索引
      const result = await indexPosts({ slugs: [] });

      if (result.success && result.data) {
        toast.success(
          `全站索引重建完成：${result.data.indexed} 篇成功，${result.data.failed} 篇失败`,
        );
        setAlertOpen(false);

        // 如果有失败的文章，显示详细信息
        if (
          result.data.failed > 0 &&
          result.data.errors &&
          result.data.errors.length > 0
        ) {
          const errorMessages = result.data.errors
            .slice(0, 3)
            .map((err) => `${err.slug}: ${err.error}`)
            .join("\n");
          toast.error(
            `部分文章索引失败：\n${errorMessages}${result.data.errors.length > 3 ? "\n..." : ""}`,
          );
        }
      } else {
        toast.error(result.message || "重建索引失败");
      }
    } catch (error) {
      console.error("重建全站索引失败:", error);
      toast.error("重建索引失败，请稍后重试");
    } finally {
      setIsRebuilding(false);
    }
  };

  return (
    <>
      <GridItem areas={[11, 12]} width={6} height={0.2}>
        <button
          onClick={() => setAlertOpen(true)}
          className="h-full w-full flex gap-2 items-center justify-center text-2xl hover:bg-error hover:text-primary-foreground transition-all cursor-pointer"
        >
          <RiDatabase2Line size="1.1em" /> 重建全站索引
        </button>
      </GridItem>

      <AlertDialog
        open={alertOpen}
        onClose={() => setAlertOpen(false)}
        onConfirm={handleConfirm}
        title="确认重建全站索引"
        description="此操作将重新为所有文章建立搜索索引。这可能需要一些时间，确认继续吗？"
        confirmText="确认重建"
        cancelText="取消"
        variant="warning"
        loading={isRebuilding}
      />
    </>
  );
}

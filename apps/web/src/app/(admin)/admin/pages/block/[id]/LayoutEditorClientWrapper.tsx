"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { updatePage } from "@/actions/page";
import type { ResolvedBlock } from "@/blocks/core/definition";
import type { AllBlockConfigs } from "@/blocks/core/types/base";
import VisualPageEditor from "@/components/server/features/page-editor/VisualPageEditor";
import runWithAuth from "@/lib/client/run-with-auth";
import type { PageItem } from "@/lib/server/page-cache";
import { useToast } from "@/ui/Toast";

export default function LayoutEditorClientWrapper({
  page,
}: {
  page: PageItem;
}) {
  const router = useRouter();
  const toast = useToast();

  const handleSave = async (blocks: AllBlockConfigs[]) => {
    if (page.contentType !== "BLOCK") {
      toast.error("仅 BLOCK 类型页面可保存布局");
      return;
    }

    try {
      // 只更新 config.blocks，保留其他配置字段
      const currentConfig = (page.config as Record<string, unknown>) || {};
      const newConfig = {
        ...currentConfig,
        blocks,
      };

      const result = await runWithAuth(updatePage, {
        slug: page.slug,
        config: newConfig,
      });

      if (result && "data" in result && result.data) {
        toast.success("页面布局已保存");
        router.refresh();
      } else {
        toast.error("保存失败");
      }
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("保存出错");
    }
  };

  const initialBlocks =
    ((page.config as { blocks?: ResolvedBlock[] })
      ?.blocks as ResolvedBlock[]) || [];

  return (
    <VisualPageEditor
      pageId={page.id}
      initialBlocks={initialBlocks}
      onSave={handleSave}
      onBack={() => router.back()}
      pageTitle={page.title}
    />
  );
}

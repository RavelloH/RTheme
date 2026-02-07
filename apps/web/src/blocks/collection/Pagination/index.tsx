"use client";

import type { PaginationData } from "@/blocks/collection/Pagination/types";
import type { BlockComponentProps } from "@/blocks/core/definition";
import { getBlockRuntimeData } from "@/blocks/core/runtime/envelope";
import PaginationNav from "@/components/ui/PaginationNav";

/**
 * PaginationBlock - 分页导航组件
 * 单独渲染分页导航
 */
export default function PaginationBlock({ block }: BlockComponentProps) {
  const data = getBlockRuntimeData<PaginationData>(block.runtime);
  const { currentPage = 1, totalPages = 1, basePath = "" } = data;

  return (
    <PaginationNav
      currentPage={currentPage}
      totalPages={totalPages}
      basePath={basePath}
    />
  );
}

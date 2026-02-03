"use client";

import type {
  PaginationBlockConfig,
  PaginationData,
} from "@/blocks/collection/Pagination/types";
import PaginationNav from "@/components/ui/PaginationNav";

/**
 * PaginationBlock - 分页导航组件
 * 单独渲染分页导航
 */
export default function PaginationBlock({
  config,
}: {
  config: PaginationBlockConfig;
}) {
  const data = (config.data as PaginationData) || {};
  const { currentPage = 1, totalPages = 1, basePath = "" } = data;

  return (
    <PaginationNav
      currentPage={currentPage}
      totalPages={totalPages}
      basePath={basePath}
    />
  );
}

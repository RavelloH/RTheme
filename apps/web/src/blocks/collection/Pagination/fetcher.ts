import type { PaginationData } from "@/blocks/collection/Pagination/types";
import type { BlockConfig, BlockFetcher } from "@/blocks/core/types";

/**
 * PaginationBlock Fetcher
 * 从 config.data 中获取分页信息并计算 basePath
 */
export const paginationFetcher: BlockFetcher = async function (
  config: BlockConfig,
): Promise<PaginationData> {
  const data = (config.data || {}) as Record<string, unknown>;
  const content = config.content as
    | { filterBy?: "tag" | "category" }
    | undefined;

  // 计算 basePath
  const filterBy = content?.filterBy || "tag";
  const slug = (data.slug as string) || "";
  const basePath = `/${filterBy === "tag" ? "tags" : "categories"}/${slug}`;

  return {
    currentPage: (data.page as number) || 1,
    totalPages: (data.totalPage as number) || 1,
    basePath,
  };
};

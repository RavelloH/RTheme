import type { PaginationData } from "@/blocks/collection/Pagination/types";
import { interpolatorMap } from "@/blocks/core/placeholders";
import type { BlockConfig, BlockFetcher } from "@/blocks/core/types";

/**
 * PaginationBlock Fetcher
 * 从 config.data 中获取分页信息并计算 basePath
 * 对于 "all" 筛选类型，调用 postsList 插值器获取分页数据
 */
export const paginationFetcher: BlockFetcher = async function (
  config: BlockConfig,
): Promise<PaginationData> {
  const data = (config.data || {}) as Record<string, unknown>;
  const content = config.content as
    | { filterBy?: "all" | "tag" | "category" }
    | undefined;

  // 计算 basePath
  const filterBy = content?.filterBy || "all";
  const slug = (data.slug as string) || "";

  let basePath: string;
  if (filterBy === "all") {
    basePath = "/posts";
  } else {
    basePath = `/${filterBy === "tag" ? "tags" : "categories"}/${slug}`;
  }

  // 对于 "all" 筛选类型，需要调用 postsList 插值器获取 totalPage
  let totalPages = 1;
  if (filterBy === "all") {
    try {
      const interpolatorLoader = interpolatorMap.postsList;
      if (interpolatorLoader) {
        const interpolatorModule = await interpolatorLoader();
        const interpolator = Object.values(interpolatorModule)[0] as (
          params?: Record<string, string>,
        ) => Promise<Record<string, unknown>>;

        if (typeof interpolator === "function") {
          const params: Record<string, string> = {
            page: String(data.page || 1),
            pageSize: String(data.pageSize || 20),
          };
          const result = await interpolator(params);
          totalPages = (result.postsListTotalPage as number) || 1;
        }
      }
    } catch (error) {
      console.error(
        "[PaginationBlock Fetcher] Failed to load postsList interpolator:",
        error,
      );
    }
  } else {
    if (filterBy === "tag") {
      totalPages =
        (data.tagTotalPage as number) || (data.totalPage as number) || 1;
    } else {
      totalPages =
        (data.categoryTotalPage as number) || (data.totalPage as number) || 1;
    }
  }

  return {
    currentPage: (data.page as number) || 1,
    totalPages,
    basePath,
  };
};

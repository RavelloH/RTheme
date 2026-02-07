import type { BlockConfig } from "@/blocks/core/types";

/**
 * RecentProjects Block Fetcher
 * 当前区块暂无额外业务数据查询，V2 中由 pipeline 统一处理占位符。
 */
export async function projectsFetcher(
  _config: BlockConfig,
): Promise<Record<string, unknown>> {
  return {};
}

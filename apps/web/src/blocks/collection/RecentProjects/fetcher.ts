import type { RuntimeBlockInput } from "@/blocks/core/definition";

/**
 * RecentProjects Block Fetcher
 * 当前区块暂无额外业务数据查询，由 pipeline 统一处理占位符。
 */
export async function projectsFetcher(
  _config: RuntimeBlockInput,
): Promise<Record<string, unknown>> {
  return {};
}

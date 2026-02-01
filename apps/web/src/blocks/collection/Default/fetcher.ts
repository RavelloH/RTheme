import { fetchBlockInterpolatedData } from "@/blocks/core/lib/server";
import type { BlockConfig } from "@/blocks/core/types";

/**
 * Default Block Fetcher
 * 分析配置中的占位符，动态加载对应的插值器，并发获取数据
 */
export async function defaultBlockFetcher(
  config: BlockConfig,
): Promise<Record<string, unknown>> {
  return await fetchBlockInterpolatedData(config.content);
}

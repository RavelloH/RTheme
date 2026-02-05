import { fetchBlockInterpolatedData } from "@/blocks/core/lib/server";
import type { BlockConfig } from "@/blocks/core/types";

/**
 * Quote Block Fetcher
 * 简单区块，主要处理占位符替换
 */
export async function quoteBlockFetcher(
  config: BlockConfig,
): Promise<Record<string, unknown>> {
  const contextData = (config.data as Record<string, unknown>) || {};
  const content = config.content;

  // 基础插值数据
  const interpolatedData = await fetchBlockInterpolatedData(
    content,
    contextData,
  );

  return interpolatedData;
}

import { fetchBlockInterpolatedData } from "@/blocks/core/lib/server";
import type { BlockConfig } from "@/blocks/core/types";

/**
 * Tabs Block Fetcher
 * 解析占位符
 */
export async function tabsBlockFetcher(
  config: BlockConfig,
): Promise<Record<string, unknown>> {
  const content = config.content;
  const contextData = (config.data as Record<string, unknown>) || {};

  const interpolatedData = await fetchBlockInterpolatedData(
    content,
    contextData,
  );

  return {
    ...contextData,
    ...interpolatedData,
  };
}

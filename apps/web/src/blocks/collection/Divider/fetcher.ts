import { fetchBlockInterpolatedData } from "@/blocks/core/lib/server";
import type { BlockConfig } from "@/blocks/core/types";

/**
 * Divider Block Fetcher
 * 解析占位符（用于 text 字段）
 */
export async function dividerBlockFetcher(
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

import { fetchBlockInterpolatedData } from "@/blocks/core/lib/server";
import type { BlockConfig } from "@/blocks/core/types";

/**
 * SocialLinks Block Fetcher
 * 解析占位符
 */
export async function socialLinksBlockFetcher(
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

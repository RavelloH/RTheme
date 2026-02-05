import type { BlockConfig } from "@/blocks/core/types";

/**
 * Divider Block Fetcher
 * 简单装饰性区块，不需要数据获取
 */
export async function dividerBlockFetcher(
  _config: BlockConfig,
): Promise<Record<string, unknown>> {
  return {};
}

import type { BlockConfig } from "@/blocks/core/types";

/**
 * Divider Block Fetcher
 * V2 中占位符处理由 runtime pipeline 统一执行。
 */
export async function dividerBlockFetcher(
  _config: BlockConfig,
): Promise<Record<string, unknown>> {
  return {};
}

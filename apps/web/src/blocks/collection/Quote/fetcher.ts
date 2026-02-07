import type { BlockConfig } from "@/blocks/core/types";

/**
 * Quote Block Fetcher
 * V2 中占位符处理由 runtime pipeline 统一执行。
 */
export async function quoteBlockFetcher(
  _config: BlockConfig,
): Promise<Record<string, unknown>> {
  return {};
}

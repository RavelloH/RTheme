import type { BlockConfig } from "@/blocks/core/types";

/**
 * Cards Block Fetcher
 * V2 中占位符和媒体处理由 runtime pipeline 统一执行。
 */
export async function cardsBlockFetcher(
  _config: BlockConfig,
): Promise<Record<string, unknown>> {
  return {};
}

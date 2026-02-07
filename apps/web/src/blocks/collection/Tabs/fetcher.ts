import type { BlockConfig } from "@/blocks/core/types";

/**
 * Tabs Block Fetcher
 * V2 中占位符处理由 runtime pipeline 统一执行。
 */
export async function tabsBlockFetcher(
  _config: BlockConfig,
): Promise<Record<string, unknown>> {
  return {};
}

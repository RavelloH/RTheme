import type { BlockConfig } from "@/blocks/core/types";

/**
 * Gallery Block Fetcher
 * V2 中占位符和媒体处理由 runtime pipeline 统一执行。
 */
export async function galleryBlockFetcher(
  _config: BlockConfig,
): Promise<Record<string, unknown>> {
  return {};
}

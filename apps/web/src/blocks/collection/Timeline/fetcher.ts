import type { RuntimeBlockInput } from "@/blocks/core/definition";

/**
 * Timeline Item Block Fetcher
 * V2 中占位符和媒体处理由 runtime pipeline 统一执行。
 */
export async function timelineItemBlockFetcher(
  _config: RuntimeBlockInput,
): Promise<Record<string, unknown>> {
  return {};
}

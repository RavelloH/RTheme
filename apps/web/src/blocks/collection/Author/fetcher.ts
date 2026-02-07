import type { RuntimeBlockInput } from "@/blocks/core/definition";

/**
 * Author Block Fetcher
 * V2 中占位符和媒体处理由 runtime pipeline 统一执行。
 */
export async function authorBlockFetcher(
  _config: RuntimeBlockInput,
): Promise<Record<string, unknown>> {
  return {};
}

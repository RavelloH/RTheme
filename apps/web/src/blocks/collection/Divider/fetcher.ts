import type { RuntimeBlockInput } from "@/blocks/core/definition";

/**
 * Divider Block Fetcher
 * V2 中占位符处理由 runtime pipeline 统一执行。
 */
export async function dividerBlockFetcher(
  _config: RuntimeBlockInput,
): Promise<Record<string, unknown>> {
  return {};
}

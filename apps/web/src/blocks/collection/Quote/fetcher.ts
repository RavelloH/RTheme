import type { RuntimeBlockInput } from "@/blocks/core/definition";

/**
 * Quote Block Fetcher
 * 占位符处理由 runtime pipeline 统一执行。
 */
export async function quoteBlockFetcher(
  _config: RuntimeBlockInput,
): Promise<Record<string, unknown>> {
  return {};
}

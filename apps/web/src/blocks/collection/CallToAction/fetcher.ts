import type { RuntimeBlockInput } from "@/blocks/core/definition";

/**
 * CallToAction Block Fetcher
 * 占位符和媒体处理由 runtime pipeline 统一执行。
 */
export async function ctaBlockFetcher(
  _config: RuntimeBlockInput,
): Promise<Record<string, unknown>> {
  return {};
}

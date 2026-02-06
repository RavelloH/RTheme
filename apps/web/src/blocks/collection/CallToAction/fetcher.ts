import {
  fetchBlockInterpolatedData,
  processImageField,
} from "@/blocks/core/lib/server";
import type { BlockConfig } from "@/blocks/core/types";

/**
 * CallToAction Block Fetcher
 * 1. 处理背景图片元数据
 * 2. 解析占位符
 */
export async function ctaBlockFetcher(
  config: BlockConfig,
): Promise<Record<string, unknown>> {
  const content = (config.content || {}) as Record<string, unknown>;
  const contextData = (config.data as Record<string, unknown>) || {};

  const [processedBgImage, interpolatedData] = await Promise.all([
    processImageField(content.backgroundImage as string | undefined),
    fetchBlockInterpolatedData(content, contextData),
  ]);

  return {
    ...contextData,
    ...interpolatedData,
    backgroundImage: processedBgImage,
  };
}

import {
  fetchBlockInterpolatedData,
  processImageField,
} from "@/blocks/core/lib/server";
import type { BlockConfig } from "@/blocks/core/types";

/**
 * Timeline Item Block Fetcher
 * 1. 处理图片元数据
 * 2. 解析占位符
 */
export async function timelineItemBlockFetcher(
  config: BlockConfig,
): Promise<Record<string, unknown>> {
  const content = (config.content || {}) as Record<string, unknown>;
  const contextData = (config.data as Record<string, unknown>) || {};
  const imageUrl = (content.image as string) || "";

  const [imageData, interpolatedData] = await Promise.all([
    imageUrl ? processImageField(imageUrl) : Promise.resolve(undefined),
    fetchBlockInterpolatedData(content, contextData),
  ]);

  return {
    ...contextData,
    ...interpolatedData,
    imageData,
  };
}

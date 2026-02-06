import {
  fetchBlockInterpolatedData,
  processImageField,
} from "@/blocks/core/lib/server";
import type { BlockConfig } from "@/blocks/core/types";

/**
 * Cards Block Fetcher
 * 1. 处理卡片图片，获取图片元数据（width、height、blur）
 * 2. 解析内容中的占位符，获取插值数据
 */
export async function cardsBlockFetcher(
  config: BlockConfig,
): Promise<Record<string, unknown>> {
  const content = (config.content || {}) as Record<string, unknown>;
  const contextData = (config.data as Record<string, unknown>) || {};

  // 并行处理图片和占位符插值
  const [processedImage, interpolatedData] = await Promise.all([
    // 处理图片字段
    processImageField(content.image as string | undefined),
    // 获取占位符插值数据
    fetchBlockInterpolatedData(content, contextData),
  ]);

  return {
    ...contextData,
    ...interpolatedData,
    image: processedImage,
  };
}

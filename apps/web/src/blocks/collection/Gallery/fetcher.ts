import { processImageArrayField } from "@/blocks/core/lib/server";
import type { BlockConfig } from "@/blocks/core/types";

/**
 * Gallery Block Fetcher
 * 处理图片数组的元数据
 */
export async function galleryBlockFetcher(
  config: BlockConfig,
): Promise<Record<string, unknown>> {
  const content = (config.content || {}) as Record<string, unknown>;
  const contextData = (config.data as Record<string, unknown>) || {};

  const processedImages = await processImageArrayField(
    content.images as string[] | undefined,
  );

  return {
    ...contextData,
    images: processedImages,
  };
}

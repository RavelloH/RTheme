import {
  fetchBlockInterpolatedData,
  processImageField,
} from "@/blocks/core/lib/server";
import type { BlockConfig } from "@/blocks/core/types";

/**
 * Author Block Fetcher
 * 1. 处理头像图片元数据
 * 2. 解析占位符
 */
export async function authorBlockFetcher(
  config: BlockConfig,
): Promise<Record<string, unknown>> {
  const content = (config.content || {}) as Record<string, unknown>;
  const contextData = (config.data as Record<string, unknown>) || {};

  const [processedAvatar, interpolatedData] = await Promise.all([
    processImageField(content.avatar as string | undefined),
    fetchBlockInterpolatedData(content, contextData),
  ]);

  return {
    ...contextData,
    ...interpolatedData,
    avatar: processedAvatar,
  };
}

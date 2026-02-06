import {
  fetchBlockInterpolatedData,
  processImageField,
} from "@/blocks/core/lib/server";
import type { BlockConfig } from "@/blocks/core/types";

/**
 * Testimonial Block Fetcher
 * 1. 处理头像元数据（支持双行模式的两个头像）
 * 2. 解析占位符
 */
export async function testimonialBlockFetcher(
  config: BlockConfig,
): Promise<Record<string, unknown>> {
  const content = (config.content || {}) as Record<string, unknown>;
  const contextData = (config.data as Record<string, unknown>) || {};

  const avatarUrl = (content.avatar as string) || "";
  const avatar2Url = (content.avatar2 as string) || "";
  const enableDualRow = (content.layout as Record<string, unknown> | undefined)
    ?.enableDualRow as boolean | undefined;

  const [avatarData, avatar2Data, interpolatedData] = await Promise.all([
    avatarUrl ? processImageField(avatarUrl) : Promise.resolve(undefined),
    enableDualRow && avatar2Url
      ? processImageField(avatar2Url)
      : Promise.resolve(undefined),
    fetchBlockInterpolatedData(content, contextData),
  ]);

  return {
    ...contextData,
    ...interpolatedData,
    avatarData,
    avatar2Data,
  };
}

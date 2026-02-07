import type { MultiRowLayoutData } from "@/blocks/collection/MultiRowLayout/types";
import type { BlockConfig } from "@/blocks/core/types";

/**
 * 多行布局数据获取器
 * V2 中占位符和媒体处理由 runtime pipeline 统一执行。
 */
export const multiRowLayoutFetcher = async (
  _config: BlockConfig,
): Promise<MultiRowLayoutData> => {
  return {};
};

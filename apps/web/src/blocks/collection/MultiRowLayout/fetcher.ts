import type { MultiRowLayoutData } from "@/blocks/collection/MultiRowLayout/types";
import type { RuntimeBlockInput } from "@/blocks/core/definition";

/**
 * 多行布局数据获取器
 * 占位符和媒体处理由 runtime pipeline 统一执行。
 */
export const multiRowLayoutFetcher = async (
  _config: RuntimeBlockInput,
): Promise<MultiRowLayoutData> => {
  return {};
};

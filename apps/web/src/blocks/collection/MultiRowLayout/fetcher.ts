import type { MultiRowLayoutData } from "@/blocks/collection/MultiRowLayout/types";
import {
  fetchBlockInterpolatedData,
  processImageArrayField,
} from "@/blocks/core/lib/server";
import type { BlockConfig } from "@/blocks/core/types";

/**
 * 多行布局数据获取器
 * 1. 处理每行的背景图片数组，获取图片元数据（width、height、blur）
 * 2. 解析内容中的占位符，获取插值数据
 */
export const multiRowLayoutFetcher = async (
  config: BlockConfig,
): Promise<MultiRowLayoutData> => {
  const content = (config.content || {}) as Record<string, unknown>;
  const contextData = (config.data as Record<string, unknown>) || {};

  // 收集所有行的图片数组
  const rowKeys = [
    "row1",
    "row2",
    "row3",
    "row4",
    "row5",
    "row6",
    "row7",
    "row8",
    "row9",
    "row10",
    "row11",
    "row12",
  ] as const;

  const imageProcessingPromises = rowKeys.map(async (rowKey) => {
    const rowData = content[rowKey] as Record<string, unknown> | undefined;
    if (!rowData) return null;

    const images = rowData.images as string[] | undefined;
    if (!images || images.length === 0) return null;

    const processedImages = await processImageArrayField(images);
    return { rowKey, processedImages };
  });

  // 并行处理所有图片和占位符插值
  const [processedImagesArray, interpolatedData] = await Promise.all([
    Promise.all(imageProcessingPromises),
    fetchBlockInterpolatedData(content, contextData),
  ]);

  // 构建处理后的图片数据映射
  const processedImagesMap: Record<
    string,
    Awaited<ReturnType<typeof processImageArrayField>>
  > = {};
  for (const result of processedImagesArray) {
    if (result) {
      processedImagesMap[result.rowKey] = result.processedImages;
    }
  }

  return {
    ...contextData,
    ...interpolatedData,
    ...processedImagesMap,
  };
};

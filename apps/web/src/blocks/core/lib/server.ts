import { extractPlaceholdersFromValue } from "@/blocks/core/lib/shared";
import { interpolatorMap } from "@/blocks/core/placeholders";
import type {
  ImageArrayFieldConfig,
  ImageFieldConfig,
} from "@/blocks/core/types/field-config";
import { batchQueryMediaFiles } from "@/lib/server/image-query";
import type { ProcessedImageData } from "@/lib/shared/image-common";
import { processImageUrl } from "@/lib/shared/image-common";

/**
 * 通用 Block Fetcher 逻辑
 * 分析内容中的占位符，动态加载对应的插值器，并发获取数据
 */
export async function fetchBlockInterpolatedData(
  content: unknown,
): Promise<Record<string, unknown>> {
  if (!content) return {};

  const allPlaceholders = extractPlaceholdersFromValue(content);
  const supportedPlaceholders = allPlaceholders.filter(
    (placeholder) => placeholder in interpolatorMap,
  );

  if (supportedPlaceholders.length === 0) {
    return {};
  }

  const interpolatorPromises = supportedPlaceholders.map(
    async (placeholder) => {
      const interpolatorLoader = interpolatorMap[placeholder];
      if (!interpolatorLoader) return {};

      try {
        const interpolatorModule = await interpolatorLoader();
        // 获取模块中的第一个导出函数（插值器）
        const interpolator = Object.values(
          interpolatorModule,
        )[0] as () => Promise<Record<string, unknown>>;

        if (typeof interpolator !== "function") return {};
        return await interpolator();
      } catch (error) {
        console.error(
          `[Interpolator Error] Placeholder: {${placeholder}}`,
          error,
        );
        return {};
      }
    },
  );

  const results = await Promise.all(interpolatorPromises);
  return Object.assign({}, ...results);
}

/**
 * 处理图片类型字段（单个图片）
 * @param imageUrl 图片 URL
 * @returns 处理后的图片数据（包含 url、width、height、blur）
 */
export async function processImageField(
  imageUrl: string | undefined,
): Promise<ProcessedImageData | undefined> {
  if (!imageUrl) return undefined;

  const mediaFileMap = await batchQueryMediaFiles([imageUrl]);
  const processed = processImageUrl(imageUrl, mediaFileMap);
  return processed?.[0];
}

/**
 * 处理图片数组类型字段（多个图片）
 * @param imageUrls 图片 URL 数组
 * @returns 处理后的图片数据数组（每个包含 url、width、height、blur）
 */
export async function processImageArrayField(
  imageUrls: (string | undefined)[] | undefined,
): Promise<ProcessedImageData[]> {
  if (!imageUrls || imageUrls.length === 0) return [];

  // 过滤掉 undefined，并转换为 string[]
  const validUrls = imageUrls.filter((url): url is string => !!url);

  if (validUrls.length === 0) return [];

  const mediaFileMap = await batchQueryMediaFiles(validUrls);

  const results: ProcessedImageData[] = [];
  for (const url of validUrls) {
    const processed = processImageUrl(url, mediaFileMap);
    if (processed && processed.length > 0) {
      results.push(...processed);
    }
  }

  return results;
}

/**
 * 从 block content 中提取并处理所有图片字段
 * @param content block content 对象
 * @param fields 字段配置数组
 * @returns 处理后的图片字段数据映射
 */
export async function processImageFields(
  content: Record<string, unknown> | undefined,
  fields: Array<ImageFieldConfig | ImageArrayFieldConfig>,
): Promise<Record<string, ProcessedImageData | ProcessedImageData[]>> {
  if (!content) return {};

  const result: Record<string, ProcessedImageData | ProcessedImageData[]> = {};

  // 分离单个图片和图片数组字段
  const imageFields = fields.filter(
    (f) => f.type === "image",
  ) as ImageFieldConfig[];
  const imageArrayFields = fields.filter(
    (f) => f.type === "imageArray",
  ) as ImageArrayFieldConfig[];

  // 处理单个图片字段
  for (const field of imageFields) {
    const fieldValue = content[field.path] as string | undefined;
    if (fieldValue) {
      const processed = await processImageField(fieldValue);
      if (processed) {
        result[field.path] = processed;
      }
    }
  }

  // 处理图片数组字段
  for (const field of imageArrayFields) {
    const fieldValue = content[field.path] as string[] | undefined;
    if (fieldValue && fieldValue.length > 0) {
      const processed = await processImageArrayField(fieldValue);
      if (processed.length > 0) {
        result[field.path] = processed;
      }
    }
  }

  return result;
}

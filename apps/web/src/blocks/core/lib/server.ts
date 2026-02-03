import { extractParsedPlaceholdersFromValue } from "@/blocks/core/lib/shared";
import { interpolatorMap } from "@/blocks/core/placeholders";
import type {
  ImageArrayFieldConfig,
  ImageFieldConfig,
} from "@/blocks/core/types/field-config";
import { batchQueryMediaFiles } from "@/lib/server/image-query";
import type { ProcessedImageData } from "@/lib/shared/image-common";
import { processImageUrl } from "@/lib/shared/image-common";

/**
 * 上下文数据类型
 */
interface ContextData {
  slug?: string;
  page?: number;
  url?: string;
  pageSize?: number;
  [key: string]: unknown;
}

/**
 * 为占位符自动附加上下文参数
 *
 * @param placeholders - 解析后的占位符数组
 * @param contextData - 上下文数据
 * @returns 附加了上下文参数后的占位符映射
 */
function enrichPlaceholdersWithContext(
  placeholders: Array<{ name: string; params: Record<string, string> }>,
  contextData: ContextData,
): Map<string, Record<string, string>> {
  const enrichedMap = new Map<string, Record<string, string>>();

  for (const placeholder of placeholders) {
    const { name, params } = placeholder;

    // 默认附加的上下文参数（如果用户没有指定）
    const enrichedParams: Record<string, string> = { ...params };

    // 附加 slug（如果存在且未指定）
    if (contextData.slug && !enrichedParams.slug) {
      enrichedParams.slug = contextData.slug;
    }

    // 附加 page（如果存在且未指定）
    if (contextData.page !== undefined && !enrichedParams.page) {
      enrichedParams.page = String(contextData.page);
    }

    // 附加 pageSize（如果存在且未指定）
    if (contextData.pageSize !== undefined && !enrichedParams.pageSize) {
      enrichedParams.pageSize = String(contextData.pageSize);
    }

    // 附加 url（如果存在且未指定）
    if (contextData.url && !enrichedParams.url) {
      enrichedParams.url = contextData.url;
    }

    // 合并相同名称的占位符参数
    if (enrichedMap.has(name)) {
      const existing = enrichedMap.get(name)!;
      enrichedMap.set(name, { ...existing, ...enrichedParams });
    } else {
      enrichedMap.set(name, enrichedParams);
    }
  }

  return enrichedMap;
}

/**
 * 通用 Block Fetcher 逻辑
 * 分析内容中的占位符，动态加载对应的插值器，并发获取数据
 * 支持参数化占位符：{name|key=value&key2=value2}
 * 自动附加上下文参数：{name} 会自动变成 {name|slug=xxx&page=xxx&url=xxx}
 * 参数值支持占位符替换：{name|slug={slug}} 会从 contextData 中读取 slug
 */
export async function fetchBlockInterpolatedData(
  content: unknown,
  contextData?: ContextData,
): Promise<Record<string, unknown>> {
  if (!content) return {};

  const allParsedPlaceholders = extractParsedPlaceholdersFromValue(content);

  // 按插值器分组：相同名称的占位符合并参数
  const interpolatorGroups = new Map<string, Set<Record<string, string>>>();

  for (const parsed of allParsedPlaceholders) {
    if (!(parsed.name in interpolatorMap)) continue;

    if (!interpolatorGroups.has(parsed.name)) {
      interpolatorGroups.set(parsed.name, new Set());
    }

    // 处理参数：替换参数值中的占位符
    const resolvedParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed.params)) {
      // 如果参数值是占位符格式，从 contextData 中获取实际值
      if (value.startsWith("{") && value.endsWith("}")) {
        const placeholderKey = value.slice(1, -1);
        const actualValue = contextData?.[placeholderKey];
        if (actualValue !== undefined) {
          resolvedParams[key] = String(actualValue);
        }
      } else {
        resolvedParams[key] = value;
      }
    }

    // 将参数对象添加到集合中
    if (Object.keys(resolvedParams).length > 0) {
      const group = interpolatorGroups.get(parsed.name)!;
      group.add(resolvedParams);
    }
  }

  if (interpolatorGroups.size === 0) {
    return {};
  }

  // 自动附加上下文参数
  const enrichedPlaceholders = enrichPlaceholdersWithContext(
    Array.from(interpolatorGroups.entries()).map(([name, paramsSet]) => ({
      name,
      params: Array.from(paramsSet)[0] || {}, // 取第一个参数集，可能为空
    })),
    contextData || {},
  );

  const interpolatorPromises = Array.from(enrichedPlaceholders.entries()).map(
    async ([name, params]) => {
      const interpolatorLoader = interpolatorMap[name];
      if (!interpolatorLoader) return {};

      try {
        const interpolatorModule = await interpolatorLoader();
        // 获取模块中的第一个导出函数（插值器）
        const interpolator = Object.values(interpolatorModule)[0] as (
          params?: Record<string, string>,
        ) => Promise<Record<string, unknown>>;

        if (typeof interpolator !== "function") return {};

        // 调用插值器，传递参数（已包含上下文参数）
        return await interpolator(params);
      } catch (error) {
        console.error(`[Interpolator Error] Placeholder: {${name}}`, error);
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

import type { BlockConfig } from "@/blocks/types";
import { interpolatorMap } from "./interpolators";

/**
 * 提取文本中的所有占位符
 * @param text - 要分析的文本
 * @returns 占位符名称数组（不含花括号）
 */
function extractPlaceholders(text: string): string[] {
  if (!text) return [];

  const placeholderRegex = /\{(\w+)\}/g;
  const placeholders = new Set<string>();
  let match;

  while ((match = placeholderRegex.exec(text)) !== null) {
    const placeholder = match[1];
    if (placeholder) {
      placeholders.add(placeholder);
    }
  }

  return Array.from(placeholders);
}

/**
 * 递归提取对象中所有字符串值的占位符
 */
function extractPlaceholdersFromValue(value: unknown): string[] {
  const placeholders = new Set<string>();

  if (typeof value === "string") {
    extractPlaceholders(value).forEach((p) => placeholders.add(p));
  } else if (Array.isArray(value)) {
    value.forEach((item) => {
      extractPlaceholdersFromValue(item).forEach((p) => placeholders.add(p));
    });
  } else if (typeof value === "object" && value !== null) {
    Object.values(value).forEach((item) => {
      extractPlaceholdersFromValue(item).forEach((p) => placeholders.add(p));
    });
  }

  return Array.from(placeholders);
}

/**
 * Default Block Fetcher
 * 分析配置中的占位符，动态加载对应的插值器，并发获取数据
 */
export async function defaultBlockFetcher(
  config: BlockConfig,
): Promise<Record<string, unknown>> {
  const { content } = config;

  // 1. 从 content 中提取所有需要的占位符
  const allPlaceholders = extractPlaceholdersFromValue(content);

  // 2. 过滤出我们支持的占位符
  const supportedPlaceholders = allPlaceholders.filter(
    (placeholder) => placeholder in interpolatorMap,
  );

  // 3. 如果没有支持的占位符，直接返回空对象
  if (supportedPlaceholders.length === 0) {
    return {};
  }

  // 4. 并发调用所有插值器
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

  // 5. 等待所有插值器完成
  const results = await Promise.all(interpolatorPromises);

  // 6. 合并所有结果
  return Object.assign({}, ...results);
}

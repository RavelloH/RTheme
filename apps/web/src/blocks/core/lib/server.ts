import { extractPlaceholdersFromValue } from "@/blocks/core/lib/shared";
import { interpolatorMap } from "@/blocks/core/placeholders";

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

import { fetchBlockInterpolatedData } from "@/blocks/core/lib/server";
import { interpolatorMap } from "@/blocks/core/placeholders";
import type { BlockConfig } from "@/blocks/core/types";
import prisma from "@/lib/server/prisma";

/**
 * Default Block Fetcher
 * 分析配置中的占位符，动态加载对应的插值器，并发获取数据
 * 自动检测并调用 tagPosts 插值器（当内容包含 tag 相关占位符时）
 * 自动检测并调用随机链接所需的插值器
 */
export async function defaultBlockFetcher(
  config: BlockConfig,
): Promise<Record<string, unknown>> {
  const contextData = (config.data as Record<string, unknown>) || {};
  const content = config.content;

  // 基础插值数据
  let interpolatedData = await fetchBlockInterpolatedData(content, contextData);

  // 检测 footer 是否需要随机链接数据
  const footer = (content as Record<string, unknown>).footer as
    | Record<string, unknown>
    | undefined;
  const footerType = footer?.type;
  const randomSource = footer?.randomSource;

  // 收集需要强制调用的插值器
  const requiredInterpolators: string[] = [];

  // 1. 检测 tagPosts 相关占位符
  if (containsTagPlaceholders(content)) {
    requiredInterpolators.push("tagPosts");
  }

  // 2. 检测随机链接需求
  if (footerType === "random" && randomSource) {
    // 如果随机链接来源是 tags 或 posts，确保调用对应插值器
    if (randomSource === "tags" || randomSource === "posts") {
      requiredInterpolators.push(randomSource);
    }
  }

  // 去重
  const uniqueInterpolators = Array.from(new Set(requiredInterpolators));

  // 并发调用所有需要的插值器
  const interpolatorPromises = uniqueInterpolators.map(async (name) => {
    try {
      const interpolatorLoader =
        interpolatorMap[name as keyof typeof interpolatorMap];
      if (!interpolatorLoader) return {};

      const interpolatorModule = await interpolatorLoader();
      const interpolator = Object.values(interpolatorModule)[0] as (
        params?: Record<string, string>,
      ) => Promise<Record<string, unknown>>;

      if (typeof interpolator !== "function") return {};

      // tagPosts 需要特殊处理（需要 slug 参数）
      if (name === "tagPosts") {
        let slug = contextData.slug as string | undefined;

        // 如果没有 slug（编辑器环境），自动获取文章最多的标签
        if (!slug) {
          slug = await getMostPopularTagSlug();
        }

        if (slug) {
          const params: Record<string, string> = {
            slug,
            page: String(contextData.page || 1),
          };
          return await interpolator(params);
        }
        return {};
      }

      // 其他插值器（posts, tags, projects）不需要参数
      return await interpolator();
    } catch (error) {
      console.error(
        `[Default Block Fetcher] Failed to load ${name} interpolator:`,
        error,
      );
      return {};
    }
  });

  const results = await Promise.all(interpolatorPromises);

  // 合并所有插值器返回的数据
  for (const result of results) {
    interpolatedData = { ...interpolatedData, ...result };
  }

  return interpolatedData;
}

/**
 * 检测内容是否包含标签相关占位符
 */
function containsTagPlaceholders(content: unknown): boolean {
  if (!content) return false;
  if (typeof content === "string") {
    return /{tag(Name|Description)?|posts|pageInfo|totalPage|firstPage|lastPage}/.test(
      content,
    );
  }
  if (Array.isArray(content)) {
    return content.some((item) => containsTagPlaceholders(item));
  }
  if (typeof content === "object" && content !== null) {
    return Object.values(content).some((item) => containsTagPlaceholders(item));
  }
  return false;
}

/**
 * 获取文章数量最多的标签的 slug
 * 用于编辑器预览时自动选择默认值
 */
async function getMostPopularTagSlug(): Promise<string | undefined> {
  try {
    const tag = await prisma.tag.findFirst({
      select: {
        slug: true,
      },
      orderBy: {
        posts: {
          _count: "desc",
        },
      },
      where: {
        posts: {
          some: {
            status: "PUBLISHED",
            deletedAt: null,
          },
        },
      },
    });
    return tag?.slug || undefined;
  } catch (error) {
    console.error(
      "[Default Block Fetcher] Failed to get most popular tag slug:",
      error,
    );
    return undefined;
  }
}

import { fetchBlockInterpolatedData } from "@/blocks/core/lib/server";
import { interpolatorMap } from "@/blocks/core/placeholders";
import type { BlockConfig } from "@/blocks/core/types";
import prisma from "@/lib/server/prisma";

/**
 * Default Block Fetcher
 * 分析配置中的占位符，动态加载对应的插值器，并发获取数据
 * 根据 dataSource 字段决定调用哪个插值器
 */
export async function defaultBlockFetcher(
  config: BlockConfig,
): Promise<Record<string, unknown>> {
  const contextData = (config.data as Record<string, unknown>) || {};
  const content = config.content;

  // 基础插值数据
  let interpolatedData = await fetchBlockInterpolatedData(content, contextData);

  // 获取 dataSource 配置
  const dataSource = (content as Record<string, unknown>).dataSource as
    | string
    | undefined;

  // 检测 footer 是否需要随机链接数据
  const footer = (content as Record<string, unknown>).footer as
    | Record<string, unknown>
    | undefined;
  const footerType = footer?.type;

  // 收集需要强制调用的插值器
  const requiredInterpolators: string[] = [];

  // 1. 根据 dataSource 决定主插值器
  let inferredRandomSource: string | undefined;

  if (dataSource) {
    switch (dataSource) {
      case "normal":
        // 常规页面，不需要额外插值器
        break;
      case "posts-index":
        // 文章索引页
        requiredInterpolators.push("postsList");
        inferredRandomSource = "posts";
        break;
      case "categories-index":
        // 分类索引页
        requiredInterpolators.push("categories");
        inferredRandomSource = "categories";
        break;
      case "category-detail":
        // 分类详情页（需要实现 categoryPosts 插值器）
        // 暂时使用 categories，后续需要创建 categoryPosts 插值器
        requiredInterpolators.push("categories");
        inferredRandomSource = "categories";
        break;
      case "tags-index":
        // 标签索引页
        requiredInterpolators.push("tags");
        inferredRandomSource = "tags";
        break;
      case "tag-detail":
        // 标签详情页
        requiredInterpolators.push("tagPosts");
        inferredRandomSource = "tags";
        break;
    }
  } else {
    // 兼容旧逻辑：如果没有 dataSource，通过占位符检测
    // TODO: 未来移除此兼容逻辑
    if (containsTagDetailPlaceholders(content)) {
      requiredInterpolators.push("tagPosts");
      inferredRandomSource = "tags";
    } else if (containsPostsListPlaceholders(content)) {
      requiredInterpolators.push("postsList");
      inferredRandomSource = "posts";
    }
  }

  // 2. 检测随机链接需求
  if (footerType === "random" && inferredRandomSource) {
    // 根据 dataSource 推断出的随机链接来源，确保调用对应插值器
    requiredInterpolators.push(inferredRandomSource);
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

      // postsList 需要传递 page 和 pageSize 参数
      if (name === "postsList") {
        const params: Record<string, string> = {
          page: String(contextData.page || 1),
          pageSize: String(contextData.pageSize || 20),
        };
        return await interpolator(params);
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
 * 检测内容是否包含标签详情相关占位符（仅用于兼容旧配置）
 * 标签详情页特有占位符：{tag}, {tagName}, {tagDescription}
 */
function containsTagDetailPlaceholders(content: unknown): boolean {
  if (!content) return false;
  if (typeof content === "string") {
    return /{tag(Name|Description)?}/.test(content);
  }
  if (Array.isArray(content)) {
    return content.some((item) => containsTagDetailPlaceholders(item));
  }
  if (typeof content === "object" && content !== null) {
    return Object.values(content).some((item) =>
      containsTagDetailPlaceholders(item),
    );
  }
  return false;
}

/**
 * 检测内容是否包含文章列表相关占位符（仅用于兼容旧配置）
 */
function containsPostsListPlaceholders(content: unknown): boolean {
  if (!content) return false;
  if (typeof content === "string") {
    return /{firstPublishAt|lastPublishDays}/.test(content);
  }
  if (Array.isArray(content)) {
    return content.some((item) => containsPostsListPlaceholders(item));
  }
  if (typeof content === "object" && content !== null) {
    return Object.values(content).some((item) =>
      containsPostsListPlaceholders(item),
    );
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

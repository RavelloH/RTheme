import { inferRandomSource } from "@/blocks/collection/Default/helpers";
import type { RuntimeBlockInput } from "@/blocks/core/definition";
import { interpolatorMap } from "@/blocks/core/placeholders";
import prisma from "@/lib/server/prisma";

/**
 * Default Block Fetcher
 * 仅处理 Default 区块的业务数据补充：
 * 1. 按 dataSource 强制请求必要插值器
 * 2. 处理 random footer 所需的数据源
 */
export async function defaultBlockFetcher(
  config: RuntimeBlockInput,
): Promise<Record<string, unknown>> {
  const contextData = (config.data as Record<string, unknown>) || {};
  const content = config.content as Record<string, unknown>;

  const dataSource = content.dataSource as string | undefined;
  const footer = content.footer as Record<string, unknown> | undefined;
  const footerType = footer?.type;

  const requiredInterpolators: string[] = [];
  const inferredRandomSource = inferRandomSource(dataSource);

  if (dataSource) {
    switch (dataSource) {
      case "posts-index":
        requiredInterpolators.push("postsList");
        break;
      case "categories-index":
        requiredInterpolators.push("categories");
        break;
      case "category-detail":
        requiredInterpolators.push("categoryPosts");
        break;
      case "tags-index":
        requiredInterpolators.push("tags");
        break;
      case "tag-detail":
        requiredInterpolators.push("tagPosts");
        break;
      default:
        break;
    }
  }

  if (footerType === "random") {
    requiredInterpolators.push(inferredRandomSource);
  }

  const uniqueInterpolators = Array.from(new Set(requiredInterpolators));

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

      if (name === "tagPosts") {
        let slug = contextData.slug as string | undefined;

        if (!slug) {
          slug = await getMostPopularTagSlug();
        }

        if (slug) {
          return interpolator({
            slug,
            page: String(contextData.page || 1),
          });
        }
        return {};
      }

      if (name === "categoryPosts") {
        let slug = contextData.slug as string | undefined;

        if (!slug) {
          slug = await getMostPopularCategorySlug();
        }

        if (slug) {
          return interpolator({
            slug,
            page: String(contextData.page || 1),
          });
        }
        return {};
      }

      if (name === "postsList") {
        return interpolator({
          page: String(contextData.page || 1),
          pageSize: String(contextData.pageSize || 20),
        });
      }

      return interpolator();
    } catch (error) {
      console.error(
        `[Default Block Fetcher] Failed to load ${name} interpolator:`,
        error,
      );
      return {};
    }
  });

  const results = await Promise.all(interpolatorPromises);
  return Object.assign({}, ...results);
}

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

async function getMostPopularCategorySlug(): Promise<string | undefined> {
  try {
    const category = await prisma.category.findFirst({
      select: {
        slug: true,
      },
      where: {
        posts: {
          some: {
            status: "PUBLISHED",
            deletedAt: null,
          },
        },
      },
      orderBy: {
        posts: {
          _count: "desc",
        },
      },
    });
    return category?.slug || undefined;
  } catch (error) {
    console.error(
      "[Default Block Fetcher] Failed to get most popular category slug:",
      error,
    );
    return undefined;
  }
}

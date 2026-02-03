import type {
  AccordionBlockConfig,
  AccordionData,
  AccordionItem,
} from "@/blocks/collection/Accordion/types";
import { fetchBlockInterpolatedData } from "@/blocks/core/lib/server";
import type { BlockConfig } from "@/blocks/core/types";
import {
  batchGetCategoryPaths,
  countCategoryPosts,
} from "@/lib/server/category-utils";
import { batchQueryMediaFiles } from "@/lib/server/image-query";
import { getFeaturedImageUrl } from "@/lib/server/media-reference";
import prisma from "@/lib/server/prisma";
import { processImageUrl } from "@/lib/shared/image-common";

/**
 * AccordionBlock Fetcher
 * 根据配置的数据来源获取标签、分类或文章列表
 */
export async function accordionFetcher(
  config: BlockConfig,
): Promise<AccordionData> {
  const content = (config.content || {}) as AccordionBlockConfig["content"];
  const source = content.source || "tags";
  const sortBy = content.layout?.sortBy || "count";
  const limit = content.limit ?? 0;

  // 并发获取插值数据
  const interpolatedData = await fetchBlockInterpolatedData(config.content);

  let items: AccordionItem[] = [];

  if (source === "tags") {
    items = await fetchTags(sortBy, limit);
  } else if (source === "categories") {
    items = await fetchCategories(sortBy, limit);
  } else if (source === "posts") {
    items = await fetchPosts(sortBy, limit);
  }

  return {
    items,
    source,
    ...interpolatedData,
  };
}

/**
 * 获取标签列表
 */
async function fetchTags(
  sortBy: string,
  limit: number,
): Promise<AccordionItem[]> {
  // 构建排序条件
  const orderBy: {
    name?: "asc" | "desc";
    updatedAt?: "asc" | "desc";
    posts?: { _count?: "asc" | "desc" };
  } =
    sortBy === "count"
      ? { posts: { _count: "desc" as const } }
      : sortBy === "name"
        ? { name: "asc" as const }
        : sortBy === "recent"
          ? { updatedAt: "desc" as const }
          : { posts: { _count: "desc" as const } };

  const allTags = await prisma.tag.findMany({
    where: {
      posts: {
        some: {
          deletedAt: null,
        },
      },
    },
    select: {
      slug: true,
      name: true,
      description: true,
      updatedAt: true,
      mediaRefs: {
        include: {
          media: {
            select: {
              shortHash: true,
              width: true,
              height: true,
              blur: true,
            },
          },
        },
      },
      _count: {
        select: {
          posts: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
    },
    orderBy: [orderBy],
    // 根据 limit 限制查询数量
    ...(limit > 0 ? { take: limit } : {}),
  });

  // 处理封面图
  const tagImageUrls: string[] = [];
  const tagCoverUrlCache = new Map<string, string | null>();

  allTags.forEach((tag) => {
    const url = getFeaturedImageUrl(tag.mediaRefs);
    tagCoverUrlCache.set(tag.slug, url);
    if (url) tagImageUrls.push(url);
  });

  const mediaFileMap = await batchQueryMediaFiles(tagImageUrls);

  return allTags.map((tag) => {
    const coverUrl = tagCoverUrlCache.get(tag.slug);
    const processedCover = coverUrl
      ? processImageUrl(coverUrl, mediaFileMap)
      : null;

    return {
      slug: tag.slug,
      name: tag.name,
      description: tag.description,
      featuredImage: processedCover,
      postCount: tag._count.posts,
    };
  });
}

/**
 * 获取分类列表
 */
async function fetchCategories(
  sortBy: string,
  _limit: number,
): Promise<AccordionItem[]> {
  // 获取所有根分类（带媒体引用）
  const rootCategories = await prisma.category.findMany({
    where: { parentId: null },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      updatedAt: true,
      mediaRefs: {
        include: {
          media: {
            select: {
              shortHash: true,
              width: true,
              height: true,
              blur: true,
            },
          },
        },
      },
    },
    orderBy: { order: "asc" },
  });

  if (rootCategories.length === 0) return [];

  const categoryIds = rootCategories.map((c) => c.id);

  // 并发获取：路径映射 + 每个分类的文章数（使用物化路径递归统计）
  const [_pathMap, ...postCounts] = await Promise.all([
    batchGetCategoryPaths(categoryIds),
    ...rootCategories.map((cat) => countCategoryPosts(cat.id)),
  ]);

  // 批量处理封面图
  const coverUrls: string[] = [];
  const coverCache = new Map<number, string | null>();

  rootCategories.forEach((cat) => {
    const url = getFeaturedImageUrl(cat.mediaRefs);
    coverCache.set(cat.id, url);
    if (url) coverUrls.push(url);
  });

  const mediaFileMap = await batchQueryMediaFiles(coverUrls);

  // 组装结果
  const items: AccordionItem[] = rootCategories.map((cat, idx) => {
    const coverUrl = coverCache.get(cat.id);
    const processedCover = coverUrl
      ? processImageUrl(coverUrl, mediaFileMap)
      : null;

    return {
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      featuredImage: processedCover,
      postCount: postCounts[idx] ?? 0,
    };
  });

  // 排序：uncategorized 最后，其他按文章数降序
  if (sortBy === "count") {
    return items.sort((a, b) => {
      if (a.slug === "uncategorized") return 1;
      if (b.slug === "uncategorized") return -1;
      return b.postCount - a.postCount;
    });
  }

  return items;
}

/**
 * 获取文章列表
 */
async function fetchPosts(
  _sortBy: string,
  _limit: number,
): Promise<AccordionItem[]> {
  // TODO: 实现文章获取逻辑
  return [];
}

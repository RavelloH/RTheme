import type {
  AccordionBlockConfig,
  AccordionData,
  AccordionItem,
} from "@/blocks/collection/Accordion/types";
import type { RuntimeBlockInput } from "@/blocks/core/definition";
import {
  countCategoryPosts,
  findCategoryByPath,
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
  config: RuntimeBlockInput,
): Promise<AccordionData> {
  const content = (config.content || {}) as AccordionBlockConfig["content"];
  const source = content.source || "tags";
  const sortBy = content.layout?.sortBy || "count";
  const limit = content.limit ?? 0;

  let items: AccordionItem[] = [];

  if (source === "tags") {
    items = await fetchTags(sortBy, limit);
  } else if (source === "categories") {
    items = await fetchCategories(sortBy, limit);
  } else if (source === "child-categories") {
    items = await fetchChildCategories(sortBy, limit, config);
  } else if (source === "posts") {
    items = await fetchPosts(sortBy, limit);
  }

  return {
    items,
    source,
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

  // 并发获取：每个分类的文章数（使用物化路径递归统计）
  const postCounts = await Promise.all(
    rootCategories.map((cat) => countCategoryPosts(cat.id)),
  );

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

/**
 * 获取指定分类的子分类列表
 */
async function fetchChildCategories(
  sortBy: string,
  _limit: number,
  config: RuntimeBlockInput,
): Promise<AccordionItem[]> {
  const contextData = (config.data as Record<string, unknown>) || {};
  const slugPath = contextData.slug as string | undefined;

  if (!slugPath) {
    // 编辑器环境：查找一个有子分类的根分类作为预览
    const rootCategories = await prisma.category.findMany({
      where: { parentId: null },
      select: { id: true },
      take: 10,
    });

    // 找一个有子分类的根分类
    for (const root of rootCategories) {
      const childCount = await prisma.category.count({
        where: { parentId: root.id },
      });
      if (childCount > 0) {
        // 使用这个根分类的 slug 来获取其子分类
        const rootCategory = await prisma.category.findUnique({
          where: { id: root.id },
          select: { slug: true },
        });
        if (rootCategory) {
          const previewItems = await fetchChildCategories(sortBy, _limit, {
            ...config,
            data: {
              ...(config.data as Record<string, unknown>),
              slug: rootCategory.slug,
            },
          });
          if (previewItems.length > 0) {
            return previewItems;
          }
        }
      }
    }

    // 如果所有根分类都没有子分类，返回占位符（仅编辑器环境）
    return [
      {
        slug: "",
        name: "（无子分类）",
        description: "当前分类没有子分类，或者还没有创建任何分类",
        featuredImage: null,
        postCount: 0,
      },
    ];
  }

  // 解析 slug 路径并查找分类
  const pathSlugs = slugPath.split("/").filter(Boolean);
  const parentCategory =
    pathSlugs.length > 0 ? await findCategoryByPath(pathSlugs) : null;

  if (!parentCategory) {
    // 分类不存在（实际页面），返回空数组
    return [];
  }

  // 获取直接子分类
  const childCategories = await prisma.category.findMany({
    where: { parentId: parentCategory.id },
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

  if (childCategories.length === 0) {
    // 如果没有子分类（实际页面），返回空数组，不显示任何内容
    return [];
  }

  // 并发获取：每个分类的文章数
  const postCounts = await Promise.all(
    childCategories.map((cat) => countCategoryPosts(cat.id)),
  );

  // 批量处理封面图
  const coverUrls: string[] = [];
  const coverCache = new Map<number, string | null>();

  childCategories.forEach((cat) => {
    const url = getFeaturedImageUrl(cat.mediaRefs);
    coverCache.set(cat.id, url);
    if (url) coverUrls.push(url);
  });

  const mediaFileMap = await batchQueryMediaFiles(coverUrls);

  // 组装结果
  const items: AccordionItem[] = childCategories.map((cat, idx) => {
    const coverUrl = coverCache.get(cat.id);
    const processedCover = coverUrl
      ? processImageUrl(coverUrl, mediaFileMap)
      : null;

    return {
      slug: cat.slug, // 只返回子分类自己的 slug，不包含父路径
      name: cat.name,
      description: cat.description,
      featuredImage: processedCover,
      postCount: postCounts[idx] ?? 0,
    };
  });

  // 排序：按文章数降序
  if (sortBy === "count") {
    return items.sort((a, b) => b.postCount - a.postCount);
  }

  return items;
}

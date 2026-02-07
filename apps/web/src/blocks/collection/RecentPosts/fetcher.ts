import type { PostsBlockContent } from "@/blocks/collection/RecentPosts/types";
import type { BlockConfig } from "@/blocks/core/types";
import { batchGetCategoryPaths } from "@/lib/server/category-utils";
import { batchQueryMediaFiles } from "@/lib/server/image-query";
import {
  getFeaturedImageUrl,
  mediaRefsInclude,
} from "@/lib/server/media-reference";
import prisma from "@/lib/server/prisma";
import { processImageUrl } from "@/lib/shared/image-common";
import { MEDIA_SLOTS } from "@/types/media";

export async function postsFetcher(config: BlockConfig) {
  const content = (config.content || {}) as PostsBlockContent;

  // 1. 解析配置
  const columns = content.layout?.columns || "2";
  const sort = content.posts?.sort || "publishedAt_desc";
  const onlyWithCover = content.posts?.onlyWithCover || false;
  const showPinned = content.posts?.showPinned ?? true;

  // 计算需要获取的文章数量
  // 1列=1篇, 2列=5篇, 3列=9篇, 4列=13篇
  const takeMap: Record<string, number> = {
    "1": 1,
    "2": 5,
    "3": 9,
    "4": 13,
  };
  const take = takeMap[columns] || 5;

  // 构建查询条件
  const where: Record<string, unknown> = {
    status: "PUBLISHED",
    deletedAt: null,
  };

  if (onlyWithCover) {
    where.mediaRefs = {
      some: { slot: MEDIA_SLOTS.POST_FEATURED_IMAGE },
    };
  }

  // 构建排序条件
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderBy: any[] = [];
  if (showPinned) {
    orderBy.push({ isPinned: "desc" });
  }

  if (sort === "publishedAt_asc") {
    orderBy.push({ publishedAt: "asc" });
  } else if (sort === "viewCount_desc") {
    orderBy.push({ viewCount: { cachedCount: "desc" } });
  } else {
    // 默认按发布时间倒序
    orderBy.push({ publishedAt: "desc" });
  }

  // 2. 执行数据库查询
  const homePosts = await prisma.post.findMany({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: where as any,
    select: {
      title: true,
      slug: true,
      excerpt: true,
      isPinned: true,
      publishedAt: true,
      categories: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      tags: {
        select: {
          name: true,
          slug: true,
        },
      },
      ...mediaRefsInclude,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orderBy: orderBy as any,
    take,
  });

  // 如果没有文章，直接返回
  if (homePosts.length === 0) {
    return {
      displayPosts: [],
    };
  }

  // 3. 准备批量查询所需的数据 (ID 和 URLs)
  // 性能优化：在单次循环中同时完成数据收集和结果缓存
  const allCategoryIds = new Set<number>();
  const homePostImageUrls: string[] = [];
  const postCoverUrlCache = new Map<number, string | null>(); // 缓存每篇文章的封面 URL

  homePosts.forEach((post, index) => {
    // 收集分类 ID
    post.categories.forEach((cat) => allCategoryIds.add(cat.id));

    // 获取并缓存封面 URL，避免后续重复调用
    const url = getFeaturedImageUrl(post.mediaRefs);
    postCoverUrlCache.set(index, url);
    if (url) homePostImageUrls.push(url);
  });

  // 4. 并发执行外部资源/辅助数据查询
  const [homePageMediaFileMap, categoryPathsMap] = await Promise.all([
    batchQueryMediaFiles(homePostImageUrls),
    batchGetCategoryPaths(Array.from(allCategoryIds)),
  ]);

  // 5. 数据组装与转换
  // 性能优化：使用索引直接访问缓存的封面 URL，避免重复计算
  const displayPosts = homePosts.map((post, index) => {
    // 5.1 处理分类展开与去重
    const expandedCategories: { name: string; slug: string }[] = [];
    const seenSlugs = new Set<string>();

    for (const category of post.categories) {
      const fullPath = categoryPathsMap.get(category.id);
      if (!fullPath) continue;

      for (const pathItem of fullPath) {
        if (!seenSlugs.has(pathItem.slug)) {
          seenSlugs.add(pathItem.slug);
          expandedCategories.push({
            name: pathItem.name,
            slug: pathItem.slug,
          });
        }
      }
    }

    // 5.2 处理封面图 - 直接使用缓存的 URL
    const coverUrl = postCoverUrlCache.get(index);
    const processedCover = coverUrl
      ? processImageUrl(coverUrl, homePageMediaFileMap)
      : [];

    return {
      ...post,
      categories: expandedCategories,
      cover: processedCover,
    };
  });

  return {
    displayPosts,
  };
}

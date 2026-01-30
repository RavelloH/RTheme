import prisma from "@/lib/server/prisma";
import {
  getFeaturedImageUrl,
  mediaRefsInclude,
} from "@/lib/server/media-reference";
import { batchQueryMediaFiles } from "@/lib/server/image-query";
import { processImageUrl } from "@/lib/shared/image-common";
import { batchGetCategoryPaths } from "@/lib/server/category-utils";
import type { BlockConfig } from "@/blocks/types";

export async function postsFetcher(_config: BlockConfig) {
  // 1. 并发执行数据库查询：文章列表和总数统计互不依赖，应当并行
  const [homePosts, totalPosts] = await Promise.all([
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
      },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        isPinned: true,
        publishedAt: true,
        categories: {
          select: {
            id: true,
            // 只需要 ID 即可进行后续的路径查找，除非前端直接需要原始分类名
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
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      take: 5,
    }),
    prisma.post.count({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
      },
    }),
  ]);

  // 如果没有文章，直接返回，减少后续不必要的计算
  if (homePosts.length === 0) {
    return {
      displayPosts: Array(5).fill(null),
      totalPosts,
    };
  }

  // 2. 准备批量查询所需的数据 (ID 和 URLs)
  const allCategoryIds = new Set<number>();
  const homePostImageUrls: string[] = [];

  for (const post of homePosts) {
    // 收集 Category ID
    for (const cat of post.categories) {
      allCategoryIds.add(cat.id);
    }
    // 收集图片 URL
    const url = getFeaturedImageUrl(post.mediaRefs);
    if (url) homePostImageUrls.push(url);
  }

  // 3. 并发执行外部资源/辅助数据查询
  const [homePageMediaFileMap, categoryPathsMap] = await Promise.all([
    batchQueryMediaFiles(homePostImageUrls),
    batchGetCategoryPaths(Array.from(allCategoryIds)),
  ]);

  // 4. 数据组装与转换
  const processedPosts = homePosts.map((post) => {
    // 4.1 处理分类展开与去重
    const expandedCategories: { name: string; slug: string }[] = [];
    const seenSlugs = new Set<string>(); // 使用 Set 进行 O(1) 查重

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

    // 4.2 处理封面图
    const coverUrl = getFeaturedImageUrl(post.mediaRefs);
    const processedCover = coverUrl
      ? processImageUrl(coverUrl, homePageMediaFileMap)
      : [];

    return {
      ...post,
      categories: expandedCategories,
      cover: processedCover,
    };
  });

  // 5. 填充空位 (Padding)
  // 如果前端严格需要数组长度为 5，保留此逻辑；
  // 建议将填充逻辑移至前端，但在 Server Component 中这样做也没问题。
  const displayPosts = [
    ...processedPosts,
    ...Array(Math.max(0, 5 - processedPosts.length)).fill(null),
  ];

  return {
    displayPosts,
    totalPosts,
  };
}

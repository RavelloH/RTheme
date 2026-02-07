import type {
  PagedPostsBlockConfig,
  PagedPostsData,
  PostItem,
} from "@/blocks/collection/PagedPosts/types";
import type { RuntimeBlockInput } from "@/blocks/core/definition";
import {
  batchGetCategoryPaths,
  findCategoryByPath,
  getAllDescendantIds,
} from "@/lib/server/category-utils";
import { batchQueryMediaFiles } from "@/lib/server/image-query";
import { getFeaturedImageData } from "@/lib/server/media-reference";
import prisma from "@/lib/server/prisma";
import { processImageUrl } from "@/lib/shared/image-common";

/**
 * PagedPostsBlock Fetcher
 * 根据路由参数（slug 和 page）获取标签或分类下的文章列表
 */
export async function pagedPostsFetcher(
  config: RuntimeBlockInput,
): Promise<PagedPostsData> {
  const content = (config.content || {}) as PagedPostsBlockConfig["content"];
  const data = (config.data || {}) as Record<string, unknown>;

  // 从 config.data 获取路由参数
  let slug: string | null = (data.slug as string) || null;
  const currentPage = (data.page as number) || 1;
  const filterBy = content.filterBy || "all";
  // 优先使用 config.data 中的 pageSize（页面级配置），否则使用 content 中的配置
  const pageSize = (data.pageSize as number) || content.pageSize || 20;
  const sortBy = content.sortBy || "isPinned_desc";

  // 解析排序参数
  const [sortField, sortOrder] = sortBy.split("_") as [string, "asc" | "desc"];

  // 如果是"不筛选"模式
  if (filterBy === "all") {
    const { posts, totalPosts } = await fetchAllPosts(
      currentPage,
      pageSize,
      sortField,
      sortOrder,
    );

    return {
      posts,
      totalPosts,
      currentPage,
      totalPages: Math.ceil(totalPosts / pageSize),
      basePath: "/posts",
    };
  }

  // 如果需要筛选但没有 slug（编辑器环境），自动获取文章数量最多的标签/分类
  if (!slug) {
    slug = await getMostPopularSlug(filterBy);
  }

  // 如果仍然没有 slug，返回空结果
  if (!slug) {
    return {
      posts: [],
      totalPosts: 0,
      currentPage: 1,
      totalPages: 0,
      basePath: "",
    };
  }

  // 根据筛选条件查询文章
  const { posts, totalPosts } = await fetchPostsByFilter(
    filterBy,
    slug!, // 已在前面检查过 slug 不为 null
    currentPage,
    pageSize,
    sortField,
    sortOrder,
  );

  return {
    posts,
    totalPosts,
    currentPage,
    totalPages: Math.ceil(totalPosts / pageSize),
    basePath: `/${filterBy === "tag" ? "tags" : "categories"}/${slug}`,
  };
}

/**
 * 根据筛选条件获取文章列表
 */
async function fetchPostsByFilter(
  filterBy: "tag" | "category",
  slug: string,
  currentPage: number,
  pageSize: number,
  sortField: string,
  sortOrder: "asc" | "desc",
): Promise<{ posts: PostItem[]; totalPosts: number }> {
  // 构建查询条件
  // 对于分类，需要包含所有子孙分类的文章
  let where: {
    status: "PUBLISHED";
    deletedAt: null;
    tags?: { some: { slug: string } };
    categories?: { some: { id: { in: number[] } } };
  };

  if (filterBy === "tag") {
    where = {
      status: "PUBLISHED",
      deletedAt: null,
      tags: { some: { slug } },
    };
  } else {
    // 对于分类，查找所有子孙分类
    const pathSlugs = slug.split("/").filter(Boolean);
    const parentCategory =
      pathSlugs.length > 0 ? await findCategoryByPath(pathSlugs) : null;

    if (parentCategory) {
      // 获取所有子孙分类 ID
      const descendantIds = await getAllDescendantIds(parentCategory.id);
      const allIds = [parentCategory.id, ...descendantIds];

      where = {
        status: "PUBLISHED",
        deletedAt: null,
        categories: { some: { id: { in: allIds } } },
      };
    } else {
      // 分类不存在，返回空结果
      return { posts: [], totalPosts: 0 };
    }
  }

  // 构建排序条件
  const orderBy: Record<string, "asc" | "desc"> = {};
  if (sortField === "isPinned") {
    orderBy.publishedAt = "desc";
  } else {
    orderBy[sortField] = sortOrder;
  }

  // 并发查询文章列表和总数
  const [posts, totalPosts] = await Promise.all([
    // 如果是按置顶+发布时间排序，需要分别处理置顶和普通文章
    sortField === "isPinned"
      ? (async () => {
          // 第一页：显示置顶文章 + 普通文章
          if (currentPage === 1) {
            // 获取所有置顶文章（按发布时间倒序）
            const pinnedPosts = await prisma.post.findMany({
              where: { ...where, isPinned: true },
              select: {
                title: true,
                slug: true,
                excerpt: true,
                isPinned: true,
                publishedAt: true,
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
              },
              orderBy: { publishedAt: "desc" },
            });

            // 如果置顶文章已够一页，返回前 pageSize 条
            if (pinnedPosts.length >= pageSize) {
              return pinnedPosts.slice(0, pageSize);
            }

            // 否则补充普通文章
            const regularPosts = await prisma.post.findMany({
              where: { ...where, isPinned: false },
              select: {
                title: true,
                slug: true,
                excerpt: true,
                isPinned: true,
                publishedAt: true,
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
              },
              orderBy: { publishedAt: "desc" },
              take: pageSize - pinnedPosts.length,
            });

            return [...pinnedPosts, ...regularPosts];
          } else {
            // 第二页及以后：只显示普通文章
            // 需要先获取置顶文章总数，用于计算 skip
            const pinnedPostCount = await prisma.post.count({
              where: { ...where, isPinned: true },
            });

            // 计算需要跳过的普通文章数
            const skip = (currentPage - 1) * pageSize - pinnedPostCount;

            // 如果 skip 为负数或零，说明还在第一页范围内，不应该发生
            if (skip <= 0) {
              return [];
            }

            const regularPosts = await prisma.post.findMany({
              where: { ...where, isPinned: false },
              select: {
                title: true,
                slug: true,
                excerpt: true,
                isPinned: true,
                publishedAt: true,
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
              },
              orderBy: { publishedAt: "desc" },
              skip,
              take: pageSize,
            });

            return regularPosts;
          }
        })()
      : prisma.post.findMany({
          where,
          select: {
            title: true,
            slug: true,
            excerpt: true,
            isPinned: true,
            publishedAt: true,
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
          },
          orderBy: [orderBy],
          skip: (currentPage - 1) * pageSize,
          take: pageSize,
        }),
    prisma.post.count({ where }),
  ]);

  // 批量处理封面图和分类路径
  const coverUrls: string[] = [];
  const coverCache = new Map<string, string | null>();
  const categoryIds = new Set<number>();

  posts.forEach((post) => {
    const featuredImage = getFeaturedImageData(post.mediaRefs);
    const url = featuredImage?.url || null;
    coverCache.set(post.slug, url);
    if (url) coverUrls.push(url);
    post.categories.forEach((cat) => categoryIds.add(cat.id));
  });

  const [mediaFileMap, categoryPathsMap] = await Promise.all([
    batchQueryMediaFiles(coverUrls),
    batchGetCategoryPaths(Array.from(categoryIds)),
  ]);

  // 处理文章数据
  const processedPosts: PostItem[] = posts.map((post) => {
    const coverUrl = coverCache.get(post.slug);
    const coverData = coverUrl
      ? processImageUrl(coverUrl, mediaFileMap)
      : undefined;

    // 展开分类并去重
    const expandedCategories: { name: string; slug: string }[] = [];
    const seenSlugs = new Set<string>();

    post.categories.forEach((cat) => {
      const fullPath = categoryPathsMap.get(cat.id) || [];
      fullPath.forEach((pathItem) => {
        if (!seenSlugs.has(pathItem.slug)) {
          seenSlugs.add(pathItem.slug);
          expandedCategories.push(pathItem);
        }
      });
    });

    return {
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      isPinned: post.isPinned,
      publishedAt: post.publishedAt,
      categories: expandedCategories,
      tags: post.tags,
      coverData,
    };
  });

  return { posts: processedPosts, totalPosts };
}

/**
 * 获取所有文章（不筛选）
 */
async function fetchAllPosts(
  currentPage: number,
  pageSize: number,
  sortField: string,
  sortOrder: "asc" | "desc",
): Promise<{ posts: PostItem[]; totalPosts: number }> {
  // 构建查询条件（只获取已发布且未删除的文章）
  const where = {
    status: "PUBLISHED" as const,
    deletedAt: null,
  };

  // 构建排序条件
  const orderBy: Record<string, "asc" | "desc"> = {};
  if (sortField === "isPinned") {
    orderBy.publishedAt = "desc";
  } else {
    orderBy[sortField] = sortOrder;
  }

  // 并发查询文章列表和总数
  const [posts, totalPosts] = await Promise.all([
    // 如果是按置顶+发布时间排序，需要分别处理置顶和普通文章
    sortField === "isPinned"
      ? (async () => {
          // 第一页：显示置顶文章 + 普通文章
          if (currentPage === 1) {
            // 获取所有置顶文章（按发布时间倒序）
            const pinnedPosts = await prisma.post.findMany({
              where: { ...where, isPinned: true },
              select: {
                title: true,
                slug: true,
                excerpt: true,
                isPinned: true,
                publishedAt: true,
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
              },
              orderBy: { publishedAt: "desc" },
            });

            // 如果置顶文章已够一页，返回前 pageSize 条
            if (pinnedPosts.length >= pageSize) {
              return pinnedPosts.slice(0, pageSize);
            }

            // 否则补充普通文章
            const regularPosts = await prisma.post.findMany({
              where: { ...where, isPinned: false },
              select: {
                title: true,
                slug: true,
                excerpt: true,
                isPinned: true,
                publishedAt: true,
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
              },
              orderBy: { publishedAt: "desc" },
              take: pageSize - pinnedPosts.length,
            });

            return [...pinnedPosts, ...regularPosts];
          } else {
            // 第二页及以后：只显示普通文章
            // 需要先获取置顶文章总数，用于计算 skip
            const pinnedPostCount = await prisma.post.count({
              where: { ...where, isPinned: true },
            });

            // 计算需要跳过的普通文章数
            const skip = (currentPage - 1) * pageSize - pinnedPostCount;

            // 如果 skip 为负数或零，说明还在第一页范围内，不应该发生
            if (skip <= 0) {
              return [];
            }

            const regularPosts = await prisma.post.findMany({
              where: { ...where, isPinned: false },
              select: {
                title: true,
                slug: true,
                excerpt: true,
                isPinned: true,
                publishedAt: true,
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
              },
              orderBy: { publishedAt: "desc" },
              skip,
              take: pageSize,
            });

            return regularPosts;
          }
        })()
      : prisma.post.findMany({
          where,
          select: {
            title: true,
            slug: true,
            excerpt: true,
            isPinned: true,
            publishedAt: true,
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
          },
          orderBy: [orderBy],
          skip: (currentPage - 1) * pageSize,
          take: pageSize,
        }),
    prisma.post.count({ where }),
  ]);

  // 批量处理封面图和分类路径
  const coverUrls: string[] = [];
  const coverCache = new Map<string, string | null>();
  const categoryIds = new Set<number>();

  posts.forEach((post) => {
    const featuredImage = getFeaturedImageData(post.mediaRefs);
    const url = featuredImage?.url || null;
    coverCache.set(post.slug, url);
    if (url) coverUrls.push(url);
    post.categories.forEach((cat) => categoryIds.add(cat.id));
  });

  const [mediaFileMap, categoryPathsMap] = await Promise.all([
    batchQueryMediaFiles(coverUrls),
    batchGetCategoryPaths(Array.from(categoryIds)),
  ]);

  // 处理文章数据
  const processedPosts: PostItem[] = posts.map((post) => {
    const coverUrl = coverCache.get(post.slug);
    const coverData = coverUrl
      ? processImageUrl(coverUrl, mediaFileMap)
      : undefined;

    // 展开分类并去重
    const expandedCategories: { name: string; slug: string }[] = [];
    const seenSlugs = new Set<string>();

    post.categories.forEach((cat) => {
      const fullPath = categoryPathsMap.get(cat.id) || [];
      fullPath.forEach((pathItem) => {
        if (!seenSlugs.has(pathItem.slug)) {
          seenSlugs.add(pathItem.slug);
          expandedCategories.push(pathItem);
        }
      });
    });

    return {
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      isPinned: post.isPinned,
      publishedAt: post.publishedAt,
      categories: expandedCategories,
      tags: post.tags,
      coverData,
    };
  });

  return { posts: processedPosts, totalPosts };
}

/**
 * 获取文章数量最多的标签/分类的 slug
 * 用于编辑器预览时自动选择默认值
 */
async function getMostPopularSlug(
  filterBy: "tag" | "category",
): Promise<string | null> {
  try {
    if (filterBy === "tag") {
      // 获取文章数量最多的标签
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
      return tag?.slug || null;
    } else {
      // 获取文章数量最多的分类
      const category = await prisma.category.findFirst({
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
      return category?.slug || null;
    }
  } catch (error) {
    console.error("[PagedPostsBlock] Failed to get most popular slug:", error);
    return null;
  }
}

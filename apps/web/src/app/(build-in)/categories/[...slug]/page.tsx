import React, { Suspense } from "react";
import HorizontalScroll from "@/components/HorizontalScroll";
import LinkButton from "@/components/LinkButton";
import MainLayout from "@/components/MainLayout";
import RowGrid, { GridItem } from "@/components/RowGrid";
import PostCard from "@/components/PostCard";
import EmptyPostCard from "@/components/EmptyPostCard";
import PaginationNav from "@/components/PaginationNav";
import { createArray } from "@/lib/client/create-array";
import {
  getBlocksAreas,
  getRawPage,
  getSystemPageConfig,
} from "@/lib/server/page-cache";
import { createPageConfigBuilder } from "@/lib/server/page-utils";
import prisma from "@/lib/server/prisma";
import { generateMetadata as generateSEOMetadata } from "@/lib/server/seo";
import { batchGetCategoryPaths } from "@/lib/server/category-utils";
import Link from "@/components/Link";
import DynamicReplace from "@/components/client/DynamicReplace";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { RiArrowLeftSLine } from "@remixicon/react";
import { cache } from "react";
import CategoryContainer from "../CategoryContainer";
import {
  getFeaturedImageUrl,
  getFeaturedImageData,
} from "@/lib/server/media-reference";
import ViewCountBatchLoader from "@/components/client/ViewCountBatchLoader";
import { cacheLife, cacheTag } from "next/cache";

// 缓存函数：获取所有分类的完整数据
const getCategoriesWithFullData = cache(async () => {
  "use cache";
  return await prisma.category.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      parentId: true,
      createdAt: true,
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
      parent: {
        select: {
          slug: true,
          name: true,
        },
      },
      posts: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
        },
      },
      children: {
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          createdAt: true,
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
          posts: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
            },
          },
          children: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });
});

// 缓存函数：获取分类的基本信息（用于元数据生成）
const getCategoriesBasicInfo = cache(async () => {
  "use cache";
  return await prisma.category.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
    },
  });
});

// 缓存函数：批量获取分类及其子分类的文章数
const getCategoriesPostCount = cache(async (categoryIds: number[]) => {
  "use cache";
  // 获取指定分类及其子分类的所有文章
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      categories: {
        some: {
          id: {
            in: categoryIds,
          },
        },
      },
    },
    select: {
      categories: {
        select: {
          id: true,
        },
      },
    },
  });

  // 统计每个分类的文章数
  const countMap = new Map<number, number>();
  posts.forEach((post: { categories: { id: number }[] }) => {
    post.categories.forEach((category: { id: number }) => {
      const currentCount = countMap.get(category.id) || 0;
      countMap.set(category.id, currentCount + 1);
    });
  });

  return countMap;
});

// 缓存函数：获取分类的文章数据（包含分页、分类路径、标签）
const getCategoryPostsData = cache(
  async (
    targetCategoryIds: number[],
    currentPage: number,
    pageSize: number,
  ) => {
    "use cache";
    const [posts, totalPosts] = await Promise.all([
      // 分页查询文章
      prisma.post.findMany({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          categories: {
            some: {
              id: {
                in: targetCategoryIds,
              },
            },
          },
        },
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
        orderBy: [
          {
            isPinned: "desc",
          },
          {
            publishedAt: "desc",
          },
        ],
        skip: (currentPage - 1) * pageSize,
        take: pageSize,
      }),
      // 获取总文章数
      prisma.post.count({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          categories: {
            some: {
              id: {
                in: targetCategoryIds,
              },
            },
          },
        },
      }),
    ]);

    // 收集所有分类ID，批量获取路径
    const allPostCategoryIds = new Set<number>();
    posts.forEach((post: PostWithCategories) => {
      post.categories.forEach((category: PostCategory) => {
        allPostCategoryIds.add(category.id);
      });
    });

    // 批量获取所有分类路径
    const postCategoryPathsMap = await batchGetCategoryPaths(
      Array.from(allPostCategoryIds),
    );

    return { posts, totalPosts, postCategoryPathsMap };
  },
);

interface PostCategory {
  id: number;
  name: string;
  slug: string;
}

interface PostWithCategories {
  title: string;
  slug: string;
  excerpt: string | null;
  isPinned: boolean;
  publishedAt: Date | null;
  mediaRefs: Array<{
    slot: string;
    media: { shortHash: string };
  }>;
  categories: PostCategory[];
  tags: { name: string; slug: string }[];
}

interface CategorySlugPageProps {
  params: Promise<{ slug: string[] }>;
}

// 获取分类页面配置
const page = await getRawPage("/categories/[slug]");
const config = createPageConfigBuilder(getSystemPageConfig(page));

const PRE_PAGE_SIZE = 20;

// 导出 generateStaticParams 函数供 Next.js SSG 使用
export async function generateStaticParams() {
  // 获取所有已发布的文章，找出所有有文章的分类
  const postsWithCategories = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
    },
    select: {
      categories: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
  });

  // 收集所有有文章的分类ID
  const categoryIdsWithPosts = new Set<number>();
  postsWithCategories.forEach((post) => {
    post.categories.forEach((cat) => {
      categoryIdsWithPosts.add(cat.id);
    });
  });

  // 获取所有分类
  const allCategories = await prisma.category.findMany({
    select: {
      id: true,
      slug: true,
    },
  });

  // 批量获取分类路径
  const categoryPathsMap = await batchGetCategoryPaths(
    allCategories.map((cat) => cat.id),
  );

  const params: { slug: string[] }[] = [];

  // 为每个有文章的分类生成路径
  for (const categoryId of categoryIdsWithPosts) {
    const categoryPath = categoryPathsMap.get(categoryId) || [];
    if (categoryPath.length > 0) {
      const slugs = categoryPath.map((item) => item.slug);

      // 获取该分类下的文章数
      const totalPosts = await prisma.post.count({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          categories: {
            some: {
              id: categoryId,
            },
          },
        },
      });

      // 计算总页数
      const totalPages = Math.ceil(totalPosts / PRE_PAGE_SIZE);

      // 第1页（根路径）
      params.push({ slug: slugs });

      // 其他页面（/categories/a/b/c/page/2, /categories/a/b/c/page/3, ...）
      for (let i = 2; i <= totalPages; i++) {
        params.push({ slug: [...slugs, "page", i.toString()] });
      }
    }
  }

  return params;
}

export default async function CategorySlugPage({
  params,
}: CategorySlugPageProps) {
  "use cache";
  cacheTag(
    "pages/child-categories-page",
    "posts",
    `categories/${(await params).slug}`,
  );
  cacheLife("max");
  const { slug } = await params;

  // 处理空路径情况，重定向到分类首页
  if (!slug || slug.length === 0) {
    notFound();
  }

  // 检查是否包含分页参数
  let categorySlugs: string[] = [];
  let currentPage = 1;

  // 查找 'page' 关键字的位置
  const pageKeywordIndex = slug.findIndex(
    (item, index) =>
      item === "page" &&
      index < slug.length - 1 &&
      /^\d+$/.test(slug[index + 1]!),
  );

  if (pageKeywordIndex !== -1) {
    // 找到了分页参数
    categorySlugs = slug.slice(0, pageKeywordIndex);
    currentPage = parseInt(slug[pageKeywordIndex + 1]!) || 1;
  } else {
    // 没有分页参数，全部都是分类路径
    categorySlugs = slug;
    currentPage = 1;
  }

  // 构建完整路径用于查找目标分类
  const fullPath = categorySlugs.join("/");

  // 获取所有分类数据（使用缓存函数）
  const allCategories = await getCategoriesWithFullData();

  // 查找当前分类：根据路径层级查找
  // 首先尝试查找最深层级的分类（最后一个slug）
  const targetSlug = categorySlugs[categorySlugs.length - 1]!;
  const possibleCategories = allCategories.filter(
    (category) => category.slug === targetSlug,
  );

  // 如果没有找到匹配的分类，返回404
  if (possibleCategories.length === 0) {
    notFound();
  }

  // 如果只有一个匹配的分类，直接使用
  let currentCategory = possibleCategories[0];

  // 如果有多个匹配的分类，需要根据路径层级来确定正确的分类
  if (possibleCategories.length > 1) {
    // 构建路径映射来找到正确的分类
    const categoryPathsMap = await batchGetCategoryPaths(
      allCategories.map((cat) => cat.id),
    );

    // 查找路径完全匹配的分类
    for (const category of possibleCategories) {
      const categoryPath = categoryPathsMap.get(category.id) || [];
      const categoryPathSlugs = categoryPath.map((item) => item.slug);

      // 检查路径是否匹配
      if (JSON.stringify(categoryPathSlugs) === JSON.stringify(categorySlugs)) {
        currentCategory = category;
        break;
      }
    }
  }

  if (!currentCategory) {
    notFound();
  }

  // 获取所有分类ID用于批量获取路径
  const allCategoryIds = allCategories.map((category) => category.id);

  // 批量获取所有分类路径
  const categoryPathsMap = await batchGetCategoryPaths(allCategoryIds);

  // 构建分类映射
  const categoryMap = new Map<number, (typeof allCategories)[0]>();
  allCategories.forEach((category) => {
    categoryMap.set(category.id, category);
  });

  // 获取当前分类及其所有子分类的ID（用于查询文章）
  const getAllChildCategoryIds = (categoryId: number): number[] => {
    const category = categoryMap.get(categoryId);
    if (!category) return [];

    const childIds = category.children.map((child) => child.id);
    const grandChildIds = childIds.flatMap((childId) =>
      getAllChildCategoryIds(childId),
    );

    return [categoryId, ...childIds, ...grandChildIds];
  };

  // 辅助函数：递归计算总文章数
  const calculateTotalPosts = (categoryId: number): number => {
    const category = categoryMap.get(categoryId);
    if (!category) return 0;

    const directPosts = category.posts.length;
    const childPosts = category.children.reduce(
      (sum, child) => sum + calculateTotalPosts(child.id),
      0,
    );

    return directPosts + childPosts;
  };

  // 辅助函数：递归计算总子分类数
  const calculateTotalChildren = (categoryId: number): number => {
    const category = categoryMap.get(categoryId);
    if (!category) return 0;

    const directChildren = category.children.length;
    const grandChildren = category.children.reduce(
      (sum, child) => sum + calculateTotalChildren(child.id),
      0,
    );

    return directChildren + grandChildren;
  };

  // 处理当前分类数据
  const currentCategoryData = {
    id: currentCategory.id,
    slug: currentCategory.slug,
    name: currentCategory.name,
    description: currentCategory.description,
    featuredImageUrl: getFeaturedImageUrl(currentCategory.mediaRefs) ?? null,
    totalPostCount: calculateTotalPosts(currentCategory.id),
    totalChildCount: calculateTotalChildren(currentCategory.id),
    path: (categoryPathsMap.get(currentCategory.id) || []).map(
      (item) => item.slug,
    ),
    createdAt: currentCategory.createdAt.toISOString(),
    updatedAt: currentCategory.updatedAt.toISOString(),
  };

  // 处理子分类数据
  const processedChildCategories = currentCategory.children.map((child) => {
    const totalPostCount = calculateTotalPosts(child.id);
    const totalChildCount = calculateTotalChildren(child.id);
    const path = categoryPathsMap.get(child.id) || [];

    return {
      id: child.id,
      slug: child.slug,
      name: child.name,
      description: child.description,
      featuredImage: getFeaturedImageData(child.mediaRefs)
        ? [getFeaturedImageData(child.mediaRefs)!]
        : null,
      totalPostCount,
      totalChildCount,
      path: path.map((item) => item.slug),
      createdAt: child.createdAt.toISOString(),
      updatedAt: child.updatedAt.toISOString(),
    };
  });

  // 过滤和排序子分类
  const childCategories = processedChildCategories
    .filter((category) => category.totalPostCount > 0) // 过滤掉空的分类
    .sort((a, b) => {
      // 将"未分类"排在最后
      if (a.slug === "uncategorized") return 1;
      if (b.slug === "uncategorized") return -1;
      // 其他分类按总文章数降序排序
      return b.totalPostCount - a.totalPostCount;
    });

  // 计算统计数据
  const totalChildCategories = childCategories.length;
  const lastUpdatedDate = new Date();

  // 获取当前分类及其所有子分类的ID
  const targetCategoryIds = getAllChildCategoryIds(currentCategory.id);

  // 查询该分类下的所有文章（包括子分类）- 使用优化的缓存函数
  const { posts, totalPosts, postCategoryPathsMap } =
    await getCategoryPostsData(targetCategoryIds, currentPage, PRE_PAGE_SIZE);

  // 为文章构建完整的分类路径数组
  const postsWithExpandedCategories = posts.map((post: PostWithCategories) => {
    const expandedCategories: { name: string; slug: string }[] = [];

    post.categories.forEach((category: PostCategory) => {
      const fullPath = postCategoryPathsMap.get(category.id) || [];
      // 将完整路径的每个级别都作为一个单独的分类项添加到数组中
      fullPath.forEach((pathItem) => {
        // 检查是否已经存在，避免重复添加同一分类路径
        if (!expandedCategories.some((cat) => cat.slug === pathItem.slug)) {
          expandedCategories.push({
            name: pathItem.name,
            slug: pathItem.slug,
          });
        }
      });
    });

    // 获取图片优化数据
    const featuredImageData = getFeaturedImageData(post.mediaRefs);

    return {
      ...post,
      categories: expandedCategories,
      coverData: featuredImageData ? [featuredImageData] : undefined,
    };
  });

  // 计算总页数
  const totalPages = Math.ceil(totalPosts / PRE_PAGE_SIZE);

  const pageInfo = `${currentCategoryData.name} 及其子分类和文章`;

  return (
    <MainLayout type="horizontal">
      <HorizontalScroll
        className="h-full"
        enableParallax={true}
        enableFadeElements={true}
        enableLineReveal={true}
        snapToElements={false}
      >
        {config.isBlockEnabled(1) && (
          <RowGrid>
            {config.getBlockHeader(1) && (
              <GridItem
                areas={[1]}
                width={14}
                height={0.1}
                className="bg-primary text-primary-foreground flex items-center px-10 uppercase text-2xl h-full"
              >
                <span>{config.getBlockHeader(1)}</span>
              </GridItem>
            )}

            <GridItem
              areas={getBlocksAreas(
                1,
                !!config.getBlockHeader(1),
                !!(
                  config.getBlockFooterLink(1) || config.getBlockFooterDesc(1)
                ),
              )}
              width={
                14 /
                getBlocksAreas(
                  1,
                  !!config.getBlockHeader(1),
                  !!(
                    config.getBlockFooterLink(1) || config.getBlockFooterDesc(1)
                  ),
                ).length
              }
              height={1}
              className="px-10 py-15 text-2xl flex flex-col justify-between"
            >
              <div>
                <div className="text-7xl" data-fade-char>
                  <h1>
                    {config
                      .getBlockTitle(1)
                      .replaceAll("{categoryName}", currentCategoryData.name)}
                  </h1>
                </div>
                <Suspense>
                  <div className="mt-10 flex flex-col gap-y-1" data-line-reveal>
                    {config.getBlockContent(1).map((line, index) => {
                      // 检查是否包含需要动态处理的占位符
                      const lineKey = `${line}-${index}`;
                      if (line.includes("{lastUpdatedDays}")) {
                        return (
                          <DynamicReplace
                            key={lineKey}
                            text={line}
                            params={[
                              ["{categoryName}", currentCategoryData.name],
                              ["{categories}", String(totalChildCategories)],
                              ["{posts}", String(totalPosts)],
                              ["__date", lastUpdatedDate.toISOString()],
                            ]}
                          />
                        );
                      } else {
                        return (
                          <div key={lineKey}>
                            {line
                              .replaceAll(
                                "{categoryName}",
                                currentCategoryData.name,
                              )
                              .replaceAll(
                                "{categories}",
                                String(totalChildCategories),
                              )
                              .replaceAll("{posts}", String(totalPosts)) || " "}
                          </div>
                        );
                      }
                    })}
                  </div>
                </Suspense>
              </div>
              <div>
                <div className="mt-10">
                  {config.getBlockContent(1, "bottom").map((line, index) => (
                    <div key={`bottom1-${index}`} data-fade-char>
                      {line
                        .replaceAll("{pageInfo}", pageInfo)
                        .replaceAll("{page}", String(currentPage))
                        .replaceAll("{totalPage}", String(totalPages))
                        .replaceAll(
                          "{firstPage}",
                          String(PRE_PAGE_SIZE * (currentPage - 1) + 1),
                        )
                        .replaceAll(
                          "{lastPage}",
                          String(
                            totalPages === currentPage
                              ? PRE_PAGE_SIZE * (currentPage - 1) +
                                  postsWithExpandedCategories.length
                              : PRE_PAGE_SIZE * currentPage,
                          ),
                        ) || " "}
                    </div>
                  ))}
                  <div>
                    路径：
                    <Link href="/categories" presets={["hover-underline"]}>
                      根分类
                    </Link>
                    {" / "}
                    {currentCategoryData.path.map((slug, index) => (
                      <span key={slug}>
                        <Link
                          href={`/categories/${currentCategoryData.path
                            .slice(0, index + 1)
                            .join("/")}`}
                          presets={["hover-underline"]}
                        >
                          {allCategories.find((cat) => cat.slug === slug)?.name}
                        </Link>
                        {index < currentCategoryData.path.length - 1
                          ? " / "
                          : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </GridItem>
            {(config.getBlockFooterLink(1) || config.getBlockFooterDesc(1)) && (
              <GridItem
                areas={[12]}
                width={14}
                height={0.1}
                className="flex items-center uppercase text-2xl"
              >
                <LinkButton
                  mode="link"
                  href={
                    categorySlugs.length > 1
                      ? `/categories/${categorySlugs.slice(0, -1).join("/")}`
                      : "/categories"
                  }
                  text={config.getBlockFooterDesc(1)}
                  icon={<RiArrowLeftSLine />}
                />
              </GridItem>
            )}
          </RowGrid>
        )}

        {/* 子分类网格 */}
        {childCategories.length > 0 && (
          <RowGrid>
            {childCategories.map((category) => (
              <CategoryContainer
                key={category.id}
                category={{
                  ...category,
                  featuredImage: category.featuredImage,
                }}
              />
            ))}
          </RowGrid>
        )}

        {/* 文章网格 */}
        {postsWithExpandedCategories.length > 0 && (
          <RowGrid>
            {Array(Math.ceil(postsWithExpandedCategories.length / 4))
              .fill(0)
              .map((_, rowIndex) => {
                const firstPostInRow =
                  postsWithExpandedCategories[rowIndex * 4];
                return (
                  <React.Fragment
                    key={firstPostInRow?.slug || `row-${rowIndex}`}
                  >
                    {Array.from({ length: 4 }, (_, index) => {
                      const postIndex = rowIndex * 4 + index;
                      const post = postsWithExpandedCategories[postIndex];

                      return (
                        <GridItem
                          key={post ? post.slug : `empty-${postIndex}`}
                          areas={createArray(index * 3 + 1, (index + 1) * 3)}
                          width={4}
                          height={0.4}
                          className=""
                        >
                          {post ? (
                            <PostCard
                              title={post.title}
                              slug={post.slug}
                              isPinned={post.isPinned}
                              date={
                                post.publishedAt
                                  ? new Date(post.publishedAt)
                                      .toLocaleDateString("zh-CN", {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                      })
                                      .replace(/\//g, "/")
                                  : ""
                              }
                              category={post.categories}
                              tags={post.tags}
                              cover={post.coverData}
                              summary={post.excerpt || ""}
                            />
                          ) : (
                            <EmptyPostCard
                              direction={index % 2 === 0 ? "left" : "right"}
                            />
                          )}
                        </GridItem>
                      );
                    })}
                  </React.Fragment>
                );
              })}
          </RowGrid>
        )}

        {/* 分页导航 */}
        <PaginationNav
          currentPage={currentPage}
          totalPages={totalPages}
          basePath={`/categories/${fullPath}`}
        />

        {config.isBlockEnabled(2) && (
          <RowGrid>
            {config.getBlockHeader(2) && (
              <GridItem
                areas={[1]}
                width={14}
                height={0.1}
                className="bg-primary text-primary-foreground flex items-center px-10 uppercase text-2xl h-full"
              >
                <span>{config.getBlockHeader(2)}</span>
              </GridItem>
            )}

            <GridItem
              areas={getBlocksAreas(
                2,
                !!config.getBlockHeader(2),
                !!(
                  config.getBlockFooterLink(2) || config.getBlockFooterDesc(2)
                ),
              )}
              width={
                14 /
                getBlocksAreas(
                  2,
                  !!config.getBlockHeader(2),
                  !!(
                    config.getBlockFooterLink(2) || config.getBlockFooterDesc(2)
                  ),
                ).length
              }
              height={1}
              className="px-10 py-15 text-2xl flex flex-col justify-between"
            >
              <div>
                <div className="text-7xl" data-fade-char>
                  <p>{config.getBlockTitle(2)}</p>
                </div>
                <div className="block mt-4" data-line-reveal>
                  {config.getBlockContent(2).map((line, index) => (
                    <div key={`content2-${index}`}>{line || " "}</div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mt-10">
                  {config.getBlockContent(2, "bottom").map((line, index) => (
                    <div key={`bottom2-${index}`} data-fade-char>
                      {line || " "}
                    </div>
                  ))}
                </div>
              </div>
            </GridItem>
            {(config.getBlockFooterLink(2) || config.getBlockFooterDesc(2)) && (
              <GridItem
                areas={[12]}
                width={14}
                height={0.1}
                className="flex items-center uppercase text-2xl"
              >
                <LinkButton
                  mode="link"
                  href={config.getBlockFooterLink(2)}
                  text={config.getBlockFooterDesc(2)}
                />
              </GridItem>
            )}
          </RowGrid>
        )}
      </HorizontalScroll>
      <ViewCountBatchLoader />
    </MainLayout>
  );
}

export async function generateMetadata({
  params,
}: CategorySlugPageProps): Promise<Metadata> {
  const { slug } = await params;

  // 处理空路径情况
  if (!slug || slug.length === 0) {
    return {
      title: "分类未找到",
      description: "请求的分类不存在",
    };
  }

  // 检查是否包含分页参数
  let categorySlugs: string[] = [];
  let currentPage = 1;

  // 查找 'page' 关键字的位置
  const pageKeywordIndex = slug.findIndex(
    (item, index) =>
      item === "page" &&
      index < slug.length - 1 &&
      /^\d+$/.test(slug[index + 1]!),
  );

  if (pageKeywordIndex !== -1) {
    // 找到了分页参数
    categorySlugs = slug.slice(0, pageKeywordIndex);
    currentPage = parseInt(slug[pageKeywordIndex + 1]!) || 1;
  } else {
    // 没有分页参数，全部都是分类路径
    categorySlugs = slug;
    currentPage = 1;
  }

  // 获取所有分类数据用于路径查找（使用缓存函数）
  const allCategories = await getCategoriesBasicInfo();

  // 查找目标分类
  const targetSlug = categorySlugs[categorySlugs.length - 1]!;
  const possibleCategories = allCategories.filter(
    (category) => category.slug === targetSlug,
  );

  if (possibleCategories.length === 0) {
    return notFound();
  }

  // 如果有多个匹配，需要根据路径来确定正确的分类
  let targetCategory = possibleCategories[0];
  if (possibleCategories.length > 1) {
    const categoryPathsMap = await batchGetCategoryPaths(
      allCategories.map((cat) => cat.id),
    );

    for (const category of possibleCategories) {
      const categoryPath = categoryPathsMap.get(category.id) || [];
      const categoryPathSlugs = categoryPath.map((item) => item.slug);

      if (JSON.stringify(categoryPathSlugs) === JSON.stringify(categorySlugs)) {
        targetCategory = category;
        break;
      }
    }
  }

  if (!targetCategory) {
    return {
      title: "分类未找到",
      description: "请求的分类不存在",
    };
  }

  // 获取该分类下的总文章数用于SEO（使用缓存函数）
  const targetCategoryIds = [targetCategory.id];
  const postCountMap = await getCategoriesPostCount(targetCategoryIds);
  const totalPosts = postCountMap.get(targetCategory.id) || 0;
  const fullPath = categorySlugs.join("/");

  return generateSEOMetadata(
    {
      title: `${targetCategory.name}${currentPage > 1 ? ` - 第${currentPage}页` : ""} - 分类`,
      description:
        targetCategory.description ||
        `浏览 ${targetCategory.name} 分类下的所有文章${currentPage > 1 ? `，第${currentPage}页` : ""}`,
      keywords: [targetCategory.name, "分类", "文章"],
      robots: {
        index: true,
      },
      pagination: {
        next:
          totalPosts > PRE_PAGE_SIZE * currentPage
            ? currentPage === 1
              ? `/categories/${fullPath}/page/${currentPage + 1}`
              : `/categories/${fullPath}/page/${currentPage + 1}`
            : undefined,
        prev:
          currentPage > 1
            ? currentPage === 2
              ? `/categories/${fullPath}`
              : `/categories/${fullPath}/page/${currentPage - 1}`
            : undefined,
      },
    },
    {
      pathname:
        currentPage === 1
          ? `/categories/${fullPath}`
          : `/categories/${fullPath}/page/${currentPage}`,
    },
  );
}

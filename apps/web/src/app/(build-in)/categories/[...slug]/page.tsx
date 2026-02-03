import React, { Suspense } from "react";
import { cache } from "react";
import { RiArrowLeftSLine } from "@remixicon/react";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";

import CategoryContainer from "@/app/(build-in)/categories/CategoryContainer";
import DynamicReplace from "@/components/client/DynamicReplace";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import ViewCountBatchLoader from "@/components/client/logic/ViewCountBatchLoader";
import EmptyPostCard from "@/components/server/features/posts/EmptyPostCard";
import PostCard from "@/components/server/features/posts/PostCard";
import Link from "@/components/ui/Link";
import LinkButton from "@/components/ui/LinkButton";
import PaginationNav from "@/components/ui/PaginationNav";
import { createArray } from "@/lib/client/create-array";
import {
  batchGetCategoryPaths,
  countAllDescendants,
  countCategoryPosts,
  findCategoryByPath,
  getAllDescendantIds,
} from "@/lib/server/category-utils";
import {
  getFeaturedImageData,
  getFeaturedImageUrl,
} from "@/lib/server/media-reference";
import {
  getBlocksAreas,
  getRawPage,
  getSystemPageConfig,
} from "@/lib/server/page-cache";
import { createPageConfigBuilder } from "@/lib/server/page-cache";
import prisma from "@/lib/server/prisma";
import { generateMetadata as generateSEOMetadata } from "@/lib/server/seo";

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
  // 优化：仅获取必要的字段
  const allCategories = await prisma.category.findMany({
    select: {
      id: true,
      slug: true,
      path: true,
      parentId: true,
    },
  });

  const categoryMap = new Map(allCategories.map((c) => [c.id, c.slug]));
  const params: { slug: string[] }[] = [];

  for (const cat of allCategories) {
    // 构建路径
    // 注意：cat.path 是 "/1/5/" 格式
    const pathIds = cat.path.split("/").filter(Boolean).map(Number);
    const slugs = pathIds
      .map((id) => categoryMap.get(id))
      .filter(Boolean) as string[];
    slugs.push(cat.slug);

    if (slugs.length > 0) {
      // 检查是否有文章（可选优化：只为有文章的分类生成页面）
      // 这里为了简单，可以简化逻辑，或者保留原逻辑
      const hasPosts = await prisma.post.findFirst({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          categories: { some: { id: cat.id } },
        },
        select: { id: true },
      });

      if (hasPosts) {
        params.push({ slug: slugs });
        // 简单处理分页：这里不预生成分页，只生成首页
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

  // 1. 查找目标分类（优化：使用 path 查找，无需加载所有分类）
  const currentCategory = await findCategoryByPath(categorySlugs);

  if (!currentCategory) {
    notFound();
  }

  // 2. 并行获取详情数据
  // - 完整详情（图片等）
  // - 子分类
  // - 统计数据
  const [
    categoryWithMedia,
    directChildren,
    totalPostCount,
    totalChildCount,
    categoryPathMap,
  ] = await Promise.all([
    prisma.category.findUnique({
      where: { id: currentCategory.id },
      include: {
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
    }),
    prisma.category.findMany({
      where: { parentId: currentCategory.id },
      include: {
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
    }),
    countCategoryPosts(currentCategory.id),
    countAllDescendants(currentCategory.id),
    batchGetCategoryPaths([currentCategory.id]),
  ]);

  if (!categoryWithMedia) notFound();

  // 获取当前分类的路径对象
  const currentCategoryPath = categoryPathMap.get(currentCategory.id) || [];

  // 处理当前分类数据
  const currentCategoryData = {
    id: categoryWithMedia.id,
    slug: categoryWithMedia.slug,
    name: categoryWithMedia.name,
    description: categoryWithMedia.description,
    featuredImageUrl: getFeaturedImageUrl(categoryWithMedia.mediaRefs) ?? null,
    totalPostCount,
    totalChildCount,
    path: currentCategoryPath,
    createdAt: categoryWithMedia.createdAt.toISOString(),
    updatedAt: categoryWithMedia.updatedAt.toISOString(),
  };

  // 处理子分类数据
  // 并行获取子分类的统计数据
  const childCategories = await Promise.all(
    directChildren.map(async (child) => {
      const childTotalPostCount = await countCategoryPosts(child.id);
      const childTotalChildCount = await countAllDescendants(child.id);
      // 获取子分类路径用于链接
      // 注意：这里我们其实可以推断子分类路径是 当前路径 + 子分类slug
      // 但为了简单和一致性，我们可以再次调用 batchGetCategoryPaths 或者手动构建
      // 鉴于 batchGetCategoryPaths 是高效的（且有缓存），我们可以批量获取所有子分类路径
      // 为了优化，我们可以在上面一次性获取所有相关路径。但这里为了代码结构改动最小，
      // 我们暂且手动构建子分类的 path 数组（仅用于 slug 数组兼容旧接口，或者我们更新接口）

      // 修正：ProcessedChildCategories 需要 path 字段，原来的逻辑是 path: childPath.map(item => item.slug)
      // 我们这里简单构建一下，或者忽略 path 字段如果组件不需要它完整展示

      // 实际上，CategoryContainer 可能只需要 slug 用于跳转。
      // 如果我们传递完整的累进 slug 给 CategoryContainer，那就更好了。

      return {
        id: child.id,
        slug: `${currentCategoryPath[currentCategoryPath.length - 1]?.slug || ""}/${child.slug}`, // 构建累进 slug
        name: child.name,
        description: child.description,
        featuredImage: getFeaturedImageData(child.mediaRefs)
          ? [getFeaturedImageData(child.mediaRefs)!]
          : null,
        totalPostCount: childTotalPostCount,
        totalChildCount: childTotalChildCount,
        path: [], // 暂时留空，CategoryContainer 可能不显示完整面包屑
        createdAt: child.createdAt.toISOString(),
        updatedAt: child.updatedAt.toISOString(),
      };
    }),
  );

  // 过滤和排序子分类
  const sortedChildCategories = childCategories
    .filter((category) => category.totalPostCount > 0) // 过滤掉空的分类
    .sort((a, b) => {
      if (a.slug === "uncategorized") return 1;
      if (b.slug === "uncategorized") return -1;
      return b.totalPostCount - a.totalPostCount;
    });

  // 计算统计数据
  const totalChildCategories = sortedChildCategories.length;
  const lastUpdatedDate = new Date();

  // 获取当前分类及其所有子分类的ID
  const descendantIds = await getAllDescendantIds(currentCategory.id);
  const targetCategoryIds = [currentCategory.id, ...descendantIds];

  // 查询该分类下的所有文章
  const { posts, totalPosts, postCategoryPathsMap } =
    await getCategoryPostsData(targetCategoryIds, currentPage, PRE_PAGE_SIZE);

  // 为文章构建完整的分类路径数组
  const postsWithExpandedCategories = posts.map((post: PostWithCategories) => {
    const expandedCategories: { name: string; slug: string }[] = [];

    post.categories.forEach((category: PostCategory) => {
      const fullPath = postCategoryPathsMap.get(category.id) || [];
      fullPath.forEach((pathItem) => {
        if (!expandedCategories.some((cat) => cat.slug === pathItem.slug)) {
          expandedCategories.push({
            name: pathItem.name,
            slug: pathItem.slug,
          });
        }
      });
    });

    const featuredImageData = getFeaturedImageData(post.mediaRefs);

    return {
      ...post,
      categories: expandedCategories,
      coverData: featuredImageData ? [featuredImageData] : undefined,
    };
  });

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
                    {config
                      .getBlockContent(1)
                      .map((line: string, index: number) => {
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
                                .replaceAll("{posts}", String(totalPosts)) ||
                                " "}
                            </div>
                          );
                        }
                      })}
                  </div>
                </Suspense>
              </div>
              <div>
                <div className="mt-10">
                  {config
                    .getBlockContent(1, "bottom")
                    .map((line: string, index: number) => (
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
                    {currentCategoryData.path.map((pathItem, index) => (
                      <span key={pathItem.slug}>
                        <Link
                          href={`/categories/${pathItem.slug}`}
                          presets={["hover-underline"]}
                        >
                          {pathItem.name}
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
        {sortedChildCategories.length > 0 && (
          <RowGrid>
            {sortedChildCategories.map((category) => (
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
                  {config
                    .getBlockContent(2)
                    .map((line: string, index: number) => (
                      <div key={`content2-${index}`}>{line || " "}</div>
                    ))}
                </div>
              </div>
              <div>
                <div className="mt-10">
                  {config
                    .getBlockContent(2, "bottom")
                    .map((line: string, index: number) => (
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

  if (!slug || slug.length === 0) {
    return {
      title: "分类未找到",
      description: "请求的分类不存在",
    };
  }

  let categorySlugs: string[] = [];
  let currentPage = 1;

  const pageKeywordIndex = slug.findIndex(
    (item, index) =>
      item === "page" &&
      index < slug.length - 1 &&
      /^\d+$/.test(slug[index + 1]!),
  );

  if (pageKeywordIndex !== -1) {
    categorySlugs = slug.slice(0, pageKeywordIndex);
    currentPage = parseInt(slug[pageKeywordIndex + 1]!) || 1;
  } else {
    categorySlugs = slug;
    currentPage = 1;
  }

  // 优化：直接查找
  const targetCategory = await findCategoryByPath(categorySlugs);

  if (!targetCategory) {
    return {
      title: "分类未找到",
      description: "请求的分类不存在",
    };
  }

  const totalPosts = await countCategoryPosts(targetCategory.id);
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

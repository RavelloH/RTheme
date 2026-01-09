import React from "react";
import HorizontalScroll from "@/components/HorizontalScroll";
import LinkButton from "@/components/LinkButton";
import MainLayout from "@/components/MainLayout";
import RowGrid, { GridItem } from "@/components/RowGrid";
import PostCard from "@/components/PostCard";
import PaginationNav from "@/components/PaginationNav";
import { createArray } from "@/lib/client/create-array";
import {
  getBlocksAreas,
  getRawPage,
  getSystemPageConfig,
} from "@/lib/server/page-cache";
import { createPageConfigBuilder } from "@/lib/server/page-utils";
import { batchGetCategoryPaths } from "@/lib/server/category-utils";
import prisma from "@/lib/server/prisma";
import { generateMetadata as generateSEOMetadata } from "@/lib/server/seo";
import { Input } from "@/ui/Input";
import { RiSearch2Line } from "@remixicon/react";
import EmptyPostCard from "@/components/EmptyPostCard";
import DynamicReplace from "@/components/client/DynamicReplace";
import { getFeaturedImageData } from "@/lib/server/media-reference";
import ViewCountBatchLoader from "@/components/client/ViewCountBatchLoader";
import { notFound } from "next/navigation";

// 获取系统页面配置
const pageConfig = await getRawPage("/posts");
const config = createPageConfigBuilder(getSystemPageConfig(pageConfig));

const PRE_PAGE_SIZE = 20;

// 获取统计数据和日期信息（优化为单个查询）
const [postsStats, dateRange] = await Promise.all([
  // 一次性获取所有统计数据
  prisma.post.groupBy({
    by: ["isPinned"],
    where: {
      status: "PUBLISHED",
      deletedAt: null,
    },
    _count: true,
  }),
  // 获取日期范围
  prisma.post.aggregate({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
    },
    _min: {
      publishedAt: true,
    },
    _max: {
      publishedAt: true,
    },
  }),
]);

// 计算统计结果
const pinnedPostsCount = postsStats.find((stat) => stat.isPinned)?._count || 0;
const totalRegularPosts =
  postsStats.find((stat) => !stat.isPinned)?._count || 0;
const totalPosts = pinnedPostsCount + totalRegularPosts;
const newestDate = dateRange._max.publishedAt;
const oldestDate = dateRange._min.publishedAt;

// 导出 generateStaticParams 函数供 Next.js SSG 使用
export async function generateStaticParams() {
  // 获取已发布文章总数
  const totalPosts = await prisma.post.count({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
    },
  });

  // 计算总页数
  const totalPages = Math.ceil(totalPosts / PRE_PAGE_SIZE);

  // 生成所有页面的参数
  const params = [];

  // 第1页（根路径 /posts）
  params.push({ page: [] });

  // 其他页面（/posts/2, /posts/3, ...）
  for (let i = 2; i <= totalPages; i++) {
    params.push({ page: [i.toString()] });
  }

  return params;
}

// 导出 generateMetadata 函数供 Next.js 使用
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page?: string[] }>;
}) {
  const resolvedParams = await params;
  const currentPage = parseInt(resolvedParams.page?.[1] || "1");

  return await generateSEOMetadata(
    {
      title:
        pageConfig?.title + (currentPage > 1 ? ` - 第${currentPage}页` : ""),
      description: pageConfig?.metaDescription,
      keywords: pageConfig?.metaKeywords,
      robots: {
        index: pageConfig?.robotsIndex,
      },
      pagination: {
        next:
          totalPosts > PRE_PAGE_SIZE * currentPage
            ? `/posts/${currentPage + 1}`
            : undefined,
        prev:
          currentPage > 1
            ? currentPage === 2
              ? `/posts`
              : `/posts/${currentPage - 1}`
            : undefined,
      },
    },
    {
      pathname: currentPage === 1 ? "/posts" : `/posts/${currentPage}`,
    },
  );
}

export default async function PostsPage({
  params,
}: {
  params: Promise<{ page?: string[] }>;
}) {
  const resolvedParams = await params;
  const page = resolvedParams.page?.[1] || "1";

  // 计算分页
  const currentPage = parseInt(page);

  // 单次查询获取所有文章，按置顶优先和时间排序
  const posts = await prisma.post.findMany({
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
        isPinned: "desc", // 置顶文章优先
      },
      {
        publishedAt: "desc", // 然后按发布时间倒序
      },
    ],
    skip: (currentPage - 1) * PRE_PAGE_SIZE,
    take: PRE_PAGE_SIZE,
  });

  // 收集所有分类ID，批量获取路径
  const allCategoryIds = new Set<number>();
  posts.forEach((post) => {
    post.categories.forEach((category) => {
      allCategoryIds.add(category.id);
    });
  });

  // 批量获取所有分类路径（只需1次额外查询）
  const categoryPathsMap = await batchGetCategoryPaths(
    Array.from(allCategoryIds),
  );

  // 为文章构建完整的分类路径数组
  // 将每个分类的完整路径展开为多个分类项，父分类在前，子分类在后
  const postsWithExpandedCategories = posts.map((post) => {
    const expandedCategories: { name: string; slug: string }[] = [];

    post.categories.forEach((category) => {
      const fullPath = categoryPathsMap.get(category.id) || [];
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

  // 计算总页数：基于所有已发布文章数量计算
  const totalPages = Math.ceil(totalPosts / PRE_PAGE_SIZE);

  if (postsWithExpandedCategories.length === 0) return notFound();

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
                  <h1>{config.getBlockTitle(1)}</h1>
                </div>
                <Input
                  label="搜索全站文章..."
                  icon={<RiSearch2Line size={"1em"} />}
                />
                <div className="mt-10 flex flex-col gap-y-1" data-line-reveal>
                  {config.getBlockContent(1).map((line, index) => {
                    // 检查是否包含需要动态处理的占位符
                    if (line.includes("{lastPublishDays}")) {
                      return (
                        <DynamicReplace
                          key={index}
                          text={line}
                          params={[
                            [
                              "{firstPublishAt}",
                              oldestDate
                                ? new Date(oldestDate).toLocaleDateString(
                                    "zh-CN",
                                    {
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                    },
                                  )
                                : "",
                            ],
                            ["{posts}", String(totalPosts)],
                            ["__date", newestDate?.toISOString() || ""],
                          ]}
                        />
                      );
                    } else {
                      return (
                        <div key={index}>
                          {line
                            .replaceAll(
                              "{firstPublishAt}",
                              new Date(oldestDate || "").toLocaleDateString(
                                "zh-CN",
                                {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                },
                              ),
                            )
                            .replaceAll("{posts}", String(totalPosts)) || " "}
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
              <div>
                <div className="mt-10">
                  {config.getBlockContent(1, "bottom").map((line, index) => (
                    <div key={index} data-fade-char>
                      {line
                        .replaceAll("{page}", page)
                        .replaceAll("{totalPage}", String(totalPages))
                        .replaceAll(
                          "{firstPage}",
                          String(PRE_PAGE_SIZE * (Number(page) - 1) + 1),
                        )
                        .replaceAll(
                          "{lastPage}",
                          String(
                            totalPages === Number(page)
                              ? PRE_PAGE_SIZE * (Number(page) - 1) +
                                  posts.length
                              : PRE_PAGE_SIZE * (Number(page) - 1) +
                                  PRE_PAGE_SIZE,
                          ),
                        ) || " "}
                    </div>
                  ))}
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
                  href={config.getBlockFooterLink(1)}
                  text={config.getBlockFooterDesc(1)}
                />
              </GridItem>
            )}
          </RowGrid>
        )}

        <RowGrid>
          {Array(Math.ceil(postsWithExpandedCategories.length / 4))
            .fill(0)
            .map((_, rowIndex) => (
              <React.Fragment key={rowIndex}>
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
            ))}
        </RowGrid>

        {/* 分页导航 */}
        <PaginationNav
          currentPage={Number(page)}
          totalPages={totalPages}
          basePath="/posts"
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
                    <div key={index}>{line || " "}</div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mt-10">
                  {config.getBlockContent(2, "bottom").map((line, index) => (
                    <div key={index} data-fade-char>
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

import React from "react";
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
import Link from "@/components/Link";
import DynamicReplace from "@/components/client/DynamicReplace";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { RiArrowLeftSLine } from "@remixicon/react";
import { cache } from "react";
import {
  batchQueryMediaFiles,
  processImageUrl,
} from "@/lib/shared/image-utils";
import ViewCountBatchLoader from "@/components/client/ViewCountBatchLoader";

// 缓存函数：获取标签的基本信息
const getTagBasicInfo = cache(async (slug: string) => {
  return await prisma.tag.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      description: true,
      featuredImage: true,
      createdAt: true,
      updatedAt: true,
    },
  });
});

// 缓存函数：获取标签下的文章数据
const getTagPostsData = cache(
  async (tagSlug: string, currentPage: number, pageSize: number) => {
    const [posts, totalPosts] = await Promise.all([
      // 分页查询文章
      prisma.post.findMany({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          tags: {
            some: {
              slug: tagSlug,
            },
          },
        },
        select: {
          title: true,
          slug: true,
          excerpt: true,
          featuredImage: true,
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
          tags: {
            some: {
              slug: tagSlug,
            },
          },
        },
      }),
    ]);

    return { posts, totalPosts };
  },
);

interface TagSlugPageProps {
  params: Promise<{ slug: string[] }>;
}

// 获取标签页面配置
const page = await getRawPage("/tags/[slug]");
const config = createPageConfigBuilder(getSystemPageConfig(page));

const PRE_PAGE_SIZE = 20;

// 导出 generateStaticParams 函数供 Next.js SSG 使用
export async function generateStaticParams() {
  // 获取所有已发布的文章，找出所有有文章的标签
  const postsWithTags = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
    },
    select: {
      tags: {
        select: {
          slug: true,
        },
      },
    },
  });

  // 收集所有有文章的标签
  const tagSlugsWithPosts = new Set<string>();
  postsWithTags.forEach((post) => {
    post.tags.forEach((tag) => {
      tagSlugsWithPosts.add(tag.slug);
    });
  });

  const params: { slug: string[] }[] = [];

  // 为每个有文章的标签生成路径
  for (const tagSlug of tagSlugsWithPosts) {
    // 获取该标签下的文章数
    const totalPosts = await prisma.post.count({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        tags: {
          some: {
            slug: tagSlug,
          },
        },
      },
    });

    // 计算总页数
    const totalPages = Math.ceil(totalPosts / PRE_PAGE_SIZE);

    // 第1页（根路径）
    params.push({ slug: [tagSlug] });

    // 其他页面（/tags/tag-slug/page/2, /tags/tag-slug/page/3, ...）
    for (let i = 2; i <= totalPages; i++) {
      params.push({ slug: [tagSlug, "page", i.toString()] });
    }
  }

  return params;
}

export default async function TagSlugPage({ params }: TagSlugPageProps) {
  const { slug } = await params;

  // 处理空路径情况
  if (!slug || slug.length === 0) {
    notFound();
  }

  // 检查是否包含分页参数
  let tagSlug: string = "";
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
    tagSlug = slug[0]!;
    currentPage = parseInt(slug[pageKeywordIndex + 1]!) || 1;
  } else {
    // 没有分页参数，第一个是标签slug
    tagSlug = slug[0]!;
    currentPage = 1;
  }

  // 获取标签信息
  const tagInfo = await getTagBasicInfo(tagSlug);

  if (!tagInfo) {
    notFound();
  }

  // 查询该标签下的所有文章 - 使用优化的缓存函数
  const { posts, totalPosts } = await getTagPostsData(
    tagSlug,
    currentPage,
    PRE_PAGE_SIZE,
  );

  // 收集所有文章的featuredImage进行批量查询
  const allPostImageUrls = posts
    .map((post) => post.featuredImage)
    .filter((image): image is string => image !== null);

  // 批量查询媒体文件
  const postMediaFileMap = await batchQueryMediaFiles(allPostImageUrls);

  // 计算总页数
  const totalPages = Math.ceil(totalPosts / PRE_PAGE_SIZE);

  const pageInfo = `标签：${tagInfo.name}`;
  const lastUpdatedDate = new Date();

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
                      .replaceAll("{tagName}", tagInfo.name)}
                  </h1>
                </div>
                <div className="mt-10 flex flex-col gap-y-1" data-line-reveal>
                  {config.getBlockContent(1).map((line, index) => {
                    // 检查是否包含需要动态处理的占位符
                    if (line.includes("{lastUpdatedDays}")) {
                      return (
                        <DynamicReplace
                          key={index}
                          text={line}
                          params={[
                            ["{tag}", tagInfo.name],
                            ["{tagName}", tagInfo.name],
                            ["{posts}", String(totalPosts)],
                            ["__date", lastUpdatedDate.toISOString()],
                          ]}
                        />
                      );
                    } else {
                      return (
                        <div key={index}>
                          {line
                            .replaceAll("{tag}", tagInfo.name)
                            .replaceAll("{tagName}", tagInfo.name)
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
                              ? PRE_PAGE_SIZE * (currentPage - 1) + posts.length
                              : PRE_PAGE_SIZE * currentPage,
                          ),
                        ) || " "}
                    </div>
                  ))}
                  <div>
                    路径：
                    <Link href="/tags" presets={["hover-underline"]}>
                      标签列表
                    </Link>
                    {" / "}
                    <Link
                      href={`/tags/${tagSlug}`}
                      presets={["hover-underline"]}
                    >
                      {tagInfo.name}
                    </Link>
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
                  href="/tags"
                  text={config.getBlockFooterDesc(1)}
                  icon={<RiArrowLeftSLine />}
                />
              </GridItem>
            )}
          </RowGrid>
        )}

        {/* 文章网格 */}
        {posts.length > 0 && (
          <RowGrid>
            {Array(Math.ceil(posts.length / 4))
              .fill(0)
              .map((_, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  {Array.from({ length: 4 }, (_, index) => {
                    const postIndex = rowIndex * 4 + index;
                    const post = posts[postIndex];

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
                            cover={
                              post.featuredImage
                                ? processImageUrl(
                                    post.featuredImage,
                                    postMediaFileMap,
                                  )
                                : []
                            }
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
        )}

        {/* 分页导航 */}
        <PaginationNav
          currentPage={currentPage}
          totalPages={totalPages}
          basePath={`/tags/${tagSlug}`}
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

export async function generateMetadata({
  params,
}: TagSlugPageProps): Promise<Metadata> {
  const { slug } = await params;

  // 处理空路径情况
  if (!slug || slug.length === 0) {
    return {
      title: "标签未找到",
      description: "请求的标签不存在",
    };
  }

  // 检查是否包含分页参数
  let tagSlug: string = "";
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
    tagSlug = slug[0]!;
    currentPage = parseInt(slug[pageKeywordIndex + 1]!) || 1;
  } else {
    // 没有分页参数，第一个是标签slug
    tagSlug = slug[0]!;
    currentPage = 1;
  }

  // 获取标签信息
  const tagInfo = await getTagBasicInfo(tagSlug);

  if (!tagInfo) {
    return {
      title: "标签未找到",
      description: "请求的标签不存在",
    };
  }

  // 获取该标签下的总文章数用于SEO
  const totalPosts = await prisma.post.count({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      tags: {
        some: {
          slug: tagSlug,
        },
      },
    },
  });

  return generateSEOMetadata(
    {
      title: `${tagInfo.name}${currentPage > 1 ? ` - 第${currentPage}页` : ""} - 标签`,
      description:
        tagInfo.description ||
        `浏览 ${tagInfo.name} 标签下的所有文章${currentPage > 1 ? `，第${currentPage}页` : ""}`,
      keywords: [tagInfo.name, "标签", "文章"],
      robots: {
        index: true,
      },
      pagination: {
        next:
          totalPosts > PRE_PAGE_SIZE * currentPage
            ? `/tags/${tagSlug}/page/${currentPage + 1}`
            : undefined,
        prev:
          currentPage > 1
            ? currentPage === 2
              ? `/tags/${tagSlug}`
              : `/tags/${tagSlug}/page/${currentPage - 1}`
            : undefined,
      },
    },
    {
      pathname:
        currentPage === 1
          ? `/tags/${tagSlug}`
          : `/tags/${tagSlug}/page/${currentPage}`,
    },
  );
}

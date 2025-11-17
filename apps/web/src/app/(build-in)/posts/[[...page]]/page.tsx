import HorizontalScroll from "@/components/HorizontalScroll";
import LinkButton from "@/components/LinkButton";
import MainLayout from "@/components/MainLayout";
import RowGrid, { GridItem } from "@/components/RowGrid";
import PostCard from "@/components/PostCard";
import PaginationNav from "@/components/PaginationNav";
import { createArray } from "@/lib/client/createArray";
import {
  getBlocksAreas,
  getRawPage,
  getSystemPageConfig,
} from "@/lib/server/pageCache";
import { createPageConfigBuilder } from "@/lib/server/pageUtils";
import prisma from "@/lib/server/prisma";
import { generateMetadata } from "@/lib/server/seo";
import { Input } from "@/ui/Input";
import { RiSearch2Line } from "@remixicon/react";
import Custom404 from "@/app/not-found";
import EmptyPostCard from "@/components/EmptyPostCard";

// 获取系统页面配置
const page = await getRawPage("/posts");
const config = createPageConfigBuilder(getSystemPageConfig(page));

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

// 获取Posts列表

export const metadata = await generateMetadata(
  {
    title: page?.title,
    description: page?.metaDescription,
    keywords: page?.metaKeywords,
    robots: {
      index: page?.robotsIndex,
    },
  },
  {
    pathname: "/posts",
  },
);

export default async function PostsPage({
  params,
}: {
  params: { page?: string[] };
}) {
  const page = params.page?.[1] || "1";

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
      featuredImage: true,
      isPinned: true,
      publishedAt: true,
      categories: {
        select: {
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

  // 计算总页数：基于所有已发布文章数量计算
  const totalPages = Math.ceil(totalPosts / PRE_PAGE_SIZE);

  if (posts.length === 0) return <Custom404 />;

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
                  {config.getBlockContent(1).map((line, index) => (
                    <div key={index}>
                      {line
                        .replaceAll(
                          "{lastPublishDays}",
                          String(
                            new Date().getDate() -
                              new Date(newestDate || "").getDate(),
                          ),
                        )
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
                  ))}
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
          {Array(Math.ceil(posts.length / 4))
            .fill(0)
            .map((_, rowIndex) => (
              <>
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
                          cover={post.featuredImage || ""}
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
              </>
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
    </MainLayout>
  );
}

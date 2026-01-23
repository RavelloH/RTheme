import { generateMetadata } from "@/lib/server/seo";
import HorizontalScroll from "@/components/HorizontalScroll";
import RowGrid, { GridItem } from "@/components/RowGrid";
import ParallaxImageCarousel from "@/components/ParallaxImageCarousel";
import Marquee from "react-fast-marquee";
import Link from "@/components/Link";
import PostCard from "@/components/PostCard";
import EmptyPostCard from "@/components/EmptyPostCard";
import MainLayout from "@/components/MainLayout";
import HomeTitle from "./home/HomeTitle";
import HomeSlogan from "./home/HomeSlogan";
import HomeImageGallery from "./home/HomeImageGallery";
import GlobalMouseTracker from "./home/GlobalMouseTracker";
import LinkButton from "@/components/LinkButton";
import {
  getSystemPageConfig,
  getBlocksAreas,
  getRawPage,
} from "@/lib/server/page-cache";
import { createPageConfigBuilder } from "@/lib/server/page-utils";
import { batchGetCategoryPaths } from "@/lib/server/category-utils";
import { getConfig } from "@/lib/server/config-cache";
import { RiArrowRightSLine } from "@remixicon/react";
import {
  batchQueryMediaFiles,
  processImageUrl,
} from "@/lib/shared/image-utils";
import prisma from "@/lib/server/prisma";
import ViewCountBatchLoader from "@/components/client/ViewCountBatchLoader";
import { notFound } from "next/navigation";
import {
  getFeaturedImageUrl,
  mediaRefsInclude,
} from "@/lib/server/media-reference";
import { cacheLife, cacheTag } from "next/cache";

// 获取系统页面配置
const page = await getRawPage("/");
const config = createPageConfigBuilder(getSystemPageConfig(page));

// 获取配置
const [siteTitle, siteSlogan] = await Promise.all([
  getConfig<string>("site.title"),
  getConfig<string>("site.slogan.primary"),
]);

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
    pathname: "/",
  },
);

export default async function Home() {
  "use cache";
  cacheTag(
    "pages/home-page",
    "posts",
    "categories",
    "tags",
    "projects",
    "config",
  );
  cacheLife("max");

  if (!page || page.status !== "ACTIVE" || page.deletedAt) {
    return notFound();
  }

  // 获取首页展示的文章（最多5篇）
  const homePosts = await prisma.post.findMany({
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
    orderBy: [
      {
        isPinned: "desc", // 置顶文章优先
      },
      {
        publishedAt: "desc", // 然后按发布时间倒序
      },
    ],
    take: 5, // 最多取5篇文章
  });

  // 获取用于图片画廊的文章封面（最多9篇）
  const galleryPosts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
    },
    select: {
      ...mediaRefsInclude,
    },
    orderBy: [
      {
        isPinned: "desc",
      },
      {
        publishedAt: "desc",
      },
    ],
    take: 9,
  });

  // 获取文章总数用于展示
  const totalPosts = await prisma.post.count({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
    },
  });

  // 收集所有文章的featuredImage进行批量查询
  const homePostImageUrls = homePosts
    .map((post) => getFeaturedImageUrl(post.mediaRefs))
    .filter((image): image is string => image !== null);

  const galleryImageUrls = galleryPosts
    .map((post) => getFeaturedImageUrl(post.mediaRefs))
    .filter((image): image is string => image !== null);

  const homePageMediaFileMap = await batchQueryMediaFiles([
    ...homePostImageUrls,
    ...galleryImageUrls,
  ]);

  // 收集所有分类ID，批量获取路径
  const allCategoryIds = new Set<number>();
  homePosts.forEach((post) => {
    post.categories.forEach((category: { id: number }) => {
      allCategoryIds.add(category.id);
    });
  });

  // 批量获取所有分类路径
  const categoryPathsMap = await batchGetCategoryPaths(
    Array.from(allCategoryIds),
  );

  // 为文章构建完整的分类路径数组
  const postsWithExpandedCategories = homePosts.map((post) => {
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

    return {
      ...post,
      categories: expandedCategories,
    };
  });

  // 创建固定长度的文章数组（5个），不足的用 null 填充
  const displayPosts: ((typeof postsWithExpandedCategories)[0] | null)[] = [
    ...postsWithExpandedCategories,
    ...Array(Math.max(0, 5 - postsWithExpandedCategories.length)).fill(null),
  ];

  const [tagResults, categoryResults] = await Promise.all([
    prisma.tag.findMany({
      select: {
        slug: true,
        name: true,
        posts: {
          where: {
            deletedAt: null,
          },
          select: {
            id: true,
          },
        },
      },
    }),
    prisma.category.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        parentId: true,
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
    }),
  ]);

  type DisplayTag = {
    slug: string;
    name: string;
    postCount: number;
    isPlaceholder?: boolean;
  };

  const processedTags: DisplayTag[] = tagResults
    .map((tag) => ({
      slug: tag.slug,
      name: tag.name,
      postCount: tag.posts.length,
    }))
    .filter((tag) => tag.postCount > 0)
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 6);

  const displayTags: DisplayTag[] = [
    ...processedTags,
    ...Array.from(
      { length: Math.max(0, 6 - processedTags.length) },
      (_, i) => ({
        slug: `placeholder-tag-${i}`,
        name: "---",
        postCount: 0,
        isPlaceholder: true,
      }),
    ),
  ];

  type DisplayCategory = {
    id: number;
    slug: string;
    name: string;
    totalPostCount: number;
    isPlaceholder?: boolean;
  };

  const categoryMap = new Map<number, (typeof categoryResults)[0]>();
  categoryResults.forEach((category) => {
    categoryMap.set(category.id, category);
  });

  const calculateCategoryPosts = (categoryId: number): number => {
    const category = categoryMap.get(categoryId);
    if (!category) return 0;

    const directPosts = category.posts.length;
    const childPosts = category.children.reduce(
      (sum, child) => sum + calculateCategoryPosts(child.id),
      0,
    );

    return directPosts + childPosts;
  };

  const sortedRootCategories: DisplayCategory[] = categoryResults
    .filter((category) => category.parentId === null)
    .map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      totalPostCount: calculateCategoryPosts(category.id),
    }))
    .filter((category) => category.totalPostCount > 0)
    .sort((a, b) => {
      if (a.slug === "uncategorized") return 1;
      if (b.slug === "uncategorized") return -1;
      return b.totalPostCount - a.totalPostCount;
    });

  const categoriesToShow: DisplayCategory[] = sortedRootCategories
    .slice(0, 7)
    .filter((category) => category.slug !== "uncategorized")
    .slice(0, 6);

  const displayCategories: DisplayCategory[] = [
    ...categoriesToShow,
    ...Array.from(
      { length: Math.max(0, 6 - categoriesToShow.length) },
      (_, i) => ({
        id: -1 - i,
        slug: `placeholder-category-${i}`,
        name: "---",
        totalPostCount: 0,
        isPlaceholder: true,
      }),
    ),
  ];

  // 处理画廊图片URL
  const galleryImages = galleryImageUrls
    .map((url) => processImageUrl(url, homePageMediaFileMap))
    .filter((urls) => urls.length > 0)
    .map((urls) => urls[0]?.url) // 提取 url 字段
    .filter((url): url is string => url !== undefined); // 过滤掉 undefined

  return (
    <>
      <GlobalMouseTracker />
      <MainLayout type="horizontal">
        <HorizontalScroll
          className="h-full"
          enableParallax={true}
          enableFadeElements={true}
          enableLineReveal={true}
          snapToElements={false}
        >
          <RowGrid>
            {/* 主页介绍区域 */}
            <GridItem
              areas={[1, 2, 3, 4, 5, 6]}
              width={4.5}
              height={0.5}
              className="flex items-center justify-center"
            >
              <HomeImageGallery images={galleryImages} />
            </GridItem>
            <GridItem
              areas={[7, 8, 9]}
              width={9}
              height={0.3}
              className="flex items-center text-8xl overflow-hidden"
            >
              <HomeTitle title={siteTitle} />
            </GridItem>
            <GridItem
              areas={[10, 11, 12]}
              width={9}
              height={0.3}
              className=" flex items-center justify-start text-8xl"
            >
              <HomeSlogan slogan={siteSlogan} />
            </GridItem>
          </RowGrid>
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
                      config.getBlockFooterLink(1) ||
                      config.getBlockFooterDesc(1)
                    ),
                  ).length
                }
                height={1}
                className="px-10 py-15 text-2xl flex flex-col justify-between"
              >
                <div>
                  <div className="text-7xl" data-fade-char>
                    <p>{config.getBlockTitle(1)}</p>
                  </div>
                  <div className="block mt-4" data-line-reveal>
                    {config.getBlockContent(1).map((line, index) => (
                      <div key={index}>{line || " "}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mt-10">
                    {config.getBlockContent(1, "bottom").map((line, index) => (
                      <div key={index} data-fade-char>
                        {line.replaceAll("{posts}", String(totalPosts)) || " "}
                      </div>
                    ))}
                  </div>
                </div>
              </GridItem>
              {(config.getBlockFooterLink(1) ||
                config.getBlockFooterDesc(1)) && (
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
            <GridItem
              areas={[1, 2, 3, 4, 5, 6]}
              width={2}
              mobileIndex={4}
              className="overflow-hidden block relative"
              fixedHeight={true}
            >
              <ParallaxImageCarousel
                images={[
                  { url: "https://raw.ravelloh.top/rtheme/fork.webp" },
                  { url: "https://raw.ravelloh.top/rtheme/fork.webp" },
                ]}
                alt="RTheme showcase"
              />

              <div className="p-15 absolute inset-0 z-10 flex flex-col justify-end">
                <div className="text-5xl text-white" data-fade-char>
                  RTheme
                </div>
                <div className="text-2xl text-white" data-fade-char>
                  RTheme 是一个 Tailwind 主题设计语言。
                </div>
              </div>
            </GridItem>

            <GridItem
              areas={[7, 8, 9]}
              width={4}
              mobileIndex={0}
              className="flex items-center uppercase bg-primary text-primary-foreground"
            >
              <Marquee speed={40} autoFill={true} className="h-full text-7xl">
                PROJECTS&nbsp;&nbsp;/&nbsp;&nbsp;
              </Marquee>
            </GridItem>
            <GridItem
              areas={[10, 11, 12]}
              width={4}
              className="flex items-center uppercase"
              mobileIndex={1}
            >
              <Marquee
                speed={40}
                direction="right"
                autoFill={true}
                className="h-full text-7xl"
              >
                作品&nbsp;&nbsp;/&nbsp;&nbsp;
              </Marquee>
            </GridItem>

            <GridItem
              areas={[1]}
              width={12}
              height={0.1}
              mobileIndex={2}
              className="flex items-center px-10 text-2xl bg-primary text-primary-foreground uppercase"
            >
              <span data-fade-word>
                {config.getComponentHeader("works-description")}
              </span>
            </GridItem>
            <GridItem
              areas={[2, 3, 4, 5, 6]}
              width={12 / 5}
              mobileIndex={3}
              className="flex items-center px-10 py-15"
            >
              <div className="text-2xl block">
                <div data-fade-word>
                  {config.getComponentContent("works-description")}
                </div>
              </div>
            </GridItem>

            <GridItem
              areas={[7, 8, 9, 10, 11, 12]}
              width={2}
              className="overflow-hidden block relative"
              mobileIndex={5}
              fixedHeight={true}
            >
              <ParallaxImageCarousel
                images={[
                  {
                    url: "https://raw.ravelloh.top/20250724/image.8hgs168oya.webp",
                  },
                  {
                    url: "https://raw.ravelloh.top/20250724/image.2yynl10qrg.webp",
                  },
                ]}
                alt="RTheme showcase"
              />

              <div className="p-15 absolute inset-0 z-10 flex flex-col justify-end">
                <div className="text-5xl text-white" data-fade-char>
                  Timepulse
                </div>
                <div className="text-2xl text-white" data-fade-char>
                  玻璃态风格的网页正计时/倒计时/世界时钟。
                </div>
              </div>
            </GridItem>
            <GridItem
              areas={[1, 2, 3, 4, 5, 6]}
              width={2}
              mobileIndex={6}
              className="overflow-hidden block relative"
              fixedHeight={true}
            >
              <ParallaxImageCarousel
                images={[
                  {
                    url: "https://raw.ravelloh.top/20250325/image.7p3rq9hok6.webp",
                  },
                ]}
                alt="RTheme showcase"
              />

              <div className="p-15 absolute inset-0 z-10 flex flex-col justify-end">
                <div className="text-5xl text-white" data-fade-char>
                  RTheme
                </div>
                <div className="text-2xl text-white" data-fade-char>
                  RTheme 是一个 Tailwind 主题设计语言。
                </div>
              </div>
            </GridItem>
            <GridItem
              areas={[7, 8, 9, 10, 11]}
              width={12 / 5}
              mobileIndex={7}
              className="flex items-center px-10 py-15"
            >
              <div className="text-2xl block" data-line-reveal>
                {config
                  .getComponentContentArray("works-summary")
                  ?.map((item, index) => {
                    return <div key={index}>{item || " "}</div>;
                  })}
              </div>
            </GridItem>
            <GridItem
              areas={[12]}
              width={12}
              height={0.1}
              mobileIndex={8}
              className="flex items-center uppercase text-2xl"
            >
              <LinkButton
                mode="link"
                href={config.getComponentFooterLink("works-summary", "/works")}
                text={config.getComponentFooterDesc(
                  "works-summary",
                  "View more projects",
                )}
              />
            </GridItem>
          </RowGrid>
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
                      config.getBlockFooterLink(2) ||
                      config.getBlockFooterDesc(2)
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
              {(config.getBlockFooterLink(2) ||
                config.getBlockFooterDesc(2)) && (
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
          <RowGrid>
            <GridItem
              areas={[1, 2, 3]}
              width={4}
              className="flex items-center uppercase bg-primary text-primary-foreground"
            >
              <Marquee speed={40} autoFill={true} className="h-full text-7xl">
                POSTS&nbsp;&nbsp;/&nbsp;&nbsp;
              </Marquee>
            </GridItem>
            <GridItem
              areas={[4, 5, 6]}
              width={4}
              className="flex items-center uppercase"
            >
              <Marquee
                speed={40}
                direction="right"
                autoFill={true}
                className="h-full text-7xl"
              >
                文章&nbsp;&nbsp;/&nbsp;&nbsp;
              </Marquee>
            </GridItem>

            {/* 第一篇文章 */}
            <GridItem areas={[7, 8, 9]} width={4} height={0.4} className="">
              {displayPosts[0] ? (
                <PostCard
                  title={displayPosts[0].title}
                  slug={displayPosts[0].slug}
                  isPinned={displayPosts[0].isPinned}
                  date={
                    displayPosts[0].publishedAt
                      ? new Date(displayPosts[0].publishedAt)
                          .toLocaleDateString("zh-CN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })
                          .replace(/\//g, "/")
                      : ""
                  }
                  category={displayPosts[0].categories}
                  tags={displayPosts[0].tags}
                  cover={
                    getFeaturedImageUrl(displayPosts[0].mediaRefs)
                      ? processImageUrl(
                          getFeaturedImageUrl(displayPosts[0].mediaRefs)!,
                          homePageMediaFileMap,
                        )
                      : []
                  }
                  summary={displayPosts[0].excerpt || ""}
                />
              ) : (
                <EmptyPostCard direction="left" />
              )}
            </GridItem>

            {/* 第二篇文章 */}
            <GridItem areas={[10, 11, 12]} width={4} height={0.4} className="">
              {displayPosts[1] ? (
                <PostCard
                  title={displayPosts[1].title}
                  slug={displayPosts[1].slug}
                  isPinned={displayPosts[1].isPinned}
                  date={
                    displayPosts[1].publishedAt
                      ? new Date(displayPosts[1].publishedAt)
                          .toLocaleDateString("zh-CN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })
                          .replace(/\//g, "/")
                      : ""
                  }
                  category={displayPosts[1].categories}
                  tags={displayPosts[1].tags}
                  cover={
                    getFeaturedImageUrl(displayPosts[1].mediaRefs)
                      ? processImageUrl(
                          getFeaturedImageUrl(displayPosts[1].mediaRefs)!,
                          homePageMediaFileMap,
                        )
                      : []
                  }
                  summary={displayPosts[1].excerpt || ""}
                />
              ) : (
                <EmptyPostCard direction="right" />
              )}
            </GridItem>

            {/* 第三篇文章 */}
            <GridItem areas={[1, 2, 3]} width={4} height={0.4} className="">
              {displayPosts[2] ? (
                <PostCard
                  title={displayPosts[2].title}
                  slug={displayPosts[2].slug}
                  isPinned={displayPosts[2].isPinned}
                  date={
                    displayPosts[2].publishedAt
                      ? new Date(displayPosts[2].publishedAt)
                          .toLocaleDateString("zh-CN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })
                          .replace(/\//g, "/")
                      : ""
                  }
                  category={displayPosts[2].categories}
                  tags={displayPosts[2].tags}
                  cover={
                    getFeaturedImageUrl(displayPosts[2].mediaRefs)
                      ? processImageUrl(
                          getFeaturedImageUrl(displayPosts[2].mediaRefs)!,
                          homePageMediaFileMap,
                        )
                      : []
                  }
                  summary={displayPosts[2].excerpt || ""}
                />
              ) : (
                <EmptyPostCard direction="left" />
              )}
            </GridItem>

            {/* 第四篇文章 */}
            <GridItem areas={[4, 5, 6]} width={4} height={0.4} className="">
              {displayPosts[3] ? (
                <PostCard
                  title={displayPosts[3].title}
                  slug={displayPosts[3].slug}
                  isPinned={displayPosts[3].isPinned}
                  date={
                    displayPosts[3].publishedAt
                      ? new Date(displayPosts[3].publishedAt)
                          .toLocaleDateString("zh-CN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })
                          .replace(/\//g, "/")
                      : ""
                  }
                  category={displayPosts[3].categories}
                  tags={displayPosts[3].tags}
                  cover={
                    getFeaturedImageUrl(displayPosts[3].mediaRefs)
                      ? processImageUrl(
                          getFeaturedImageUrl(displayPosts[3].mediaRefs)!,
                          homePageMediaFileMap,
                        )
                      : []
                  }
                  summary={displayPosts[3].excerpt || ""}
                />
              ) : (
                <EmptyPostCard direction="right" />
              )}
            </GridItem>

            {/* 第五篇文章 */}
            <GridItem areas={[7, 8, 9]} width={4} height={0.4} className="">
              {displayPosts[4] ? (
                <PostCard
                  title={displayPosts[4].title}
                  slug={displayPosts[4].slug}
                  isPinned={displayPosts[4].isPinned}
                  date={
                    displayPosts[4].publishedAt
                      ? new Date(displayPosts[4].publishedAt)
                          .toLocaleDateString("zh-CN", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          })
                          .replace(/\//g, "/")
                      : ""
                  }
                  category={displayPosts[4].categories}
                  tags={displayPosts[4].tags}
                  cover={
                    getFeaturedImageUrl(displayPosts[4].mediaRefs)
                      ? processImageUrl(
                          getFeaturedImageUrl(displayPosts[4].mediaRefs)!,
                          homePageMediaFileMap,
                        )
                      : []
                  }
                  summary={displayPosts[4].excerpt || ""}
                />
              ) : (
                <EmptyPostCard direction="left" />
              )}
            </GridItem>

            {/* "查看全部文章"按钮 */}
            <GridItem
              areas={[10, 11, 12]}
              width={4}
              height={0.4}
              className="uppercase "
            >
              <Link
                href="/posts"
                className="flex items-center justify-between group px-10 py-15 h-full"
              >
                <div className="block" data-line-reveal>
                  <div className="text-4xl relative inline box-decoration-clone bg-[linear-gradient(white,white)] bg-left-bottom bg-no-repeat bg-[length:0%_2px] transition-[background-size] duration-300 ease-out group-hover:bg-[length:100%_2px]">
                    查看全部文章
                  </div>
                  <div className="text-2xl">共 {totalPosts} 篇文章</div>
                </div>
                <div className="relative w-20 h-20">
                  <RiArrowRightSLine
                    size={"5em"}
                    className="absolute top-0 left-0 transition-transform duration-300 ease-out group-hover:-translate-x-8"
                  />
                  <RiArrowRightSLine
                    size={"5em"}
                    className="absolute top-0 left-0 transition-transform duration-300 ease-out group-hover:-translate-x-16 "
                  />
                  <RiArrowRightSLine
                    size={"5em"}
                    className="absolute top-0 left-0 transition-transform duration-300 ease-out group-hover:-translate-x-24"
                  />
                </div>
              </Link>
            </GridItem>
          </RowGrid>
          {config.isBlockEnabled(3) && (
            <RowGrid>
              {config.getBlockHeader(3) && (
                <GridItem
                  areas={[1]}
                  width={14}
                  height={0.1}
                  className="bg-primary text-primary-foreground flex items-center px-10 uppercase text-2xl h-full"
                >
                  <span>{config.getBlockHeader(3)}</span>
                </GridItem>
              )}

              <GridItem
                areas={getBlocksAreas(
                  3,
                  !!config.getBlockHeader(3),
                  !!(
                    config.getBlockFooterLink(3) || config.getBlockFooterDesc(3)
                  ),
                )}
                width={
                  14 /
                  getBlocksAreas(
                    3,
                    !!config.getBlockHeader(3),
                    !!(
                      config.getBlockFooterLink(3) ||
                      config.getBlockFooterDesc(3)
                    ),
                  ).length
                }
                height={1}
                className="px-10 py-15 text-2xl flex flex-col justify-between"
              >
                <div>
                  <div className="text-7xl" data-fade-char>
                    <p>{config.getBlockTitle(3)}</p>
                  </div>
                  <div className="block mt-4" data-line-reveal>
                    {config.getBlockContent(3).map((line, index) => (
                      <div key={index}>{line || " "}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mt-10">
                    {config.getBlockContent(3, "bottom").map((line, index) => (
                      <div key={index} data-fade-char>
                        {line || " "}
                      </div>
                    ))}
                  </div>
                </div>
              </GridItem>
              {(config.getBlockFooterLink(3) ||
                config.getBlockFooterDesc(3)) && (
                <GridItem
                  areas={[12]}
                  width={14}
                  height={0.1}
                  className="flex items-center uppercase text-2xl"
                >
                  <LinkButton
                    mode="link"
                    href={config.getBlockFooterLink(3)}
                    text={config.getBlockFooterDesc(3)}
                  />
                </GridItem>
              )}
            </RowGrid>
          )}
          <RowGrid>
            <GridItem
              areas={[1, 2, 3, 4, 5]}
              mobileAreas={[1, 2, 3, 4, 5, 6]}
              width={6 / 5}
              className="flex items-center justify-center px-10 text-2xl"
            >
              <div
                className="flex flex-col gap-2 justify-center items-center"
                data-line-reveal
              >
                {displayTags.map((tag, index) =>
                  tag.isPlaceholder ? (
                    <div key={tag.slug + index}>---</div>
                  ) : (
                    <Link key={tag.slug} href={`/tags/${tag.slug}`}>
                      <div className=" hover:scale-110 transition-all">
                        #{tag.name} x {tag.postCount}
                      </div>
                    </Link>
                  ),
                )}
                <Link href="/tags">
                  <div>...</div>
                </Link>
              </div>
            </GridItem>
            <GridItem
              areas={[6, 7, 8, 9, 10]}
              mobileAreas={[7, 8, 9, 10, 11, 12]}
              width={6 / 5}
              className="flex items-center justify-center px-10 text-2xl"
            >
              <div
                className="flex flex-col gap-2 justify-center items-center"
                data-line-reveal
              >
                {displayCategories.map((category, index) =>
                  category.isPlaceholder ? (
                    <div key={category.slug + index}>---</div>
                  ) : (
                    <Link
                      key={category.slug}
                      href={`/categories/${category.slug}`}
                    >
                      <div className=" hover:scale-110 transition-all">
                        {category.name} x {category.totalPostCount}
                      </div>
                    </Link>
                  ),
                )}
                <Link href="/categories">
                  <div>...</div>
                </Link>
              </div>
            </GridItem>
            <GridItem
              areas={[11, 12]}
              width={6 / 2}
              height={0.25}
              className="flex items-center justify-center uppercase text-5xl bg-primary text-primary-foreground"
            >
              <div>
                <div data-fade-char>Tags &</div>
                <div data-fade-char>Categories</div>
              </div>
            </GridItem>
          </RowGrid>
          {config.isBlockEnabled(4) && (
            <RowGrid>
              {config.getBlockHeader(4) && (
                <GridItem
                  areas={[1]}
                  width={14}
                  height={0.1}
                  className="bg-primary text-primary-foreground flex items-center px-10 uppercase text-2xl h-full"
                >
                  <span>{config.getBlockHeader(4)}</span>
                </GridItem>
              )}

              <GridItem
                areas={getBlocksAreas(
                  4,
                  !!config.getBlockHeader(4),
                  !!(
                    config.getBlockFooterLink(4) || config.getBlockFooterDesc(4)
                  ),
                )}
                width={
                  14 /
                  getBlocksAreas(
                    4,
                    !!config.getBlockHeader(4),
                    !!(
                      config.getBlockFooterLink(4) ||
                      config.getBlockFooterDesc(4)
                    ),
                  ).length
                }
                height={1}
                className="px-10 py-15 text-2xl flex flex-col justify-between"
              >
                <div>
                  <div className="text-7xl" data-fade-char>
                    <p>{config.getBlockTitle(4)}</p>
                  </div>
                  <div className="block mt-4" data-line-reveal>
                    {config.getBlockContent(4).map((line, index) => (
                      <div key={index}>{line || " "}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mt-10">
                    {config.getBlockContent(4, "bottom").map((line, index) => (
                      <div key={index} data-fade-char>
                        {line || " "}
                      </div>
                    ))}
                  </div>
                </div>
              </GridItem>
              {(config.getBlockFooterLink(4) ||
                config.getBlockFooterDesc(4)) && (
                <GridItem
                  areas={[12]}
                  width={14}
                  height={0.1}
                  className="flex items-center uppercase text-2xl"
                >
                  <LinkButton
                    mode="link"
                    href={config.getBlockFooterLink(4)}
                    text={config.getBlockFooterDesc(4)}
                  />
                </GridItem>
              )}
            </RowGrid>
          )}
          <ViewCountBatchLoader />
        </HorizontalScroll>
      </MainLayout>
    </>
  );
}

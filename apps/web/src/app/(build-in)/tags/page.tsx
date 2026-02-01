import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";

import TagContainer from "@/app/(build-in)/tags/TagContainer";
import TagsRandomPage from "@/app/(build-in)/tags/TagsRandomPage";
import DynamicReplace from "@/components/client/DynamicReplace";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import Link from "@/components/ui/Link";
import LinkButton from "@/components/ui/LinkButton";
import { getFeaturedImageData } from "@/lib/server/media-reference";
import {
  getBlocksAreas,
  getRawPage,
  getSystemPageConfig,
} from "@/lib/server/page-cache";
import { createPageConfigBuilder } from "@/lib/server/page-cache";
import prisma from "@/lib/server/prisma";
import { generateMetadata } from "@/lib/server/seo";

// 获取系统页面配置
const page = await getRawPage("/tags");
const config = createPageConfigBuilder(getSystemPageConfig(page));

// 获取所有标签数据
const allTags = await prisma.tag.findMany({
  select: {
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
  },
});

// 处理标签统计数据
const processedTags = allTags.map((tag) => ({
  slug: tag.slug,
  name: tag.name,
  description: tag.description,
  featuredImage: getFeaturedImageData(tag.mediaRefs)
    ? [getFeaturedImageData(tag.mediaRefs)!]
    : null,
  postCount: tag.posts.length,
  createdAt: tag.createdAt.toISOString(),
  updatedAt: tag.updatedAt.toISOString(),
}));

// 过滤和排序标签
const tags = processedTags
  .filter((tag) => tag.postCount > 0) // 过滤掉没有文章的标签
  .sort((a, b) => b.postCount - a.postCount); // 按文章数降序排序

// 计算标签统计数据
const totalTags = tags.length;
const lastUpdatedDate = new Date(); // 当前服务器时间

const pageInfo = "标签列表";

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
    pathname: "/tags",
  },
);

export default async function TagsIndex() {
  "use cache";
  cacheTag("pages/tags-page", "posts", "tags");
  cacheLife("max");
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
                <Suspense>
                  <div className="mt-10 flex flex-col gap-y-1" data-line-reveal>
                    {config
                      .getBlockContent(1)
                      .map((line: string, index: number) => {
                        const lineKey = `${line}-${index}`;
                        // 检查是否包含需要动态处理的占位符
                        if (line.includes("{lastUpdatedDays}")) {
                          return (
                            <DynamicReplace
                              key={lineKey}
                              text={line}
                              params={[
                                ["{tags}", String(totalTags)],
                                ["__date", lastUpdatedDate.toISOString()],
                              ]}
                            />
                          );
                        } else {
                          return (
                            <div key={lineKey}>
                              {line.replaceAll("{tags}", String(totalTags)) ||
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
                        {line.replaceAll("{pageInfo}", pageInfo) || " "}
                      </div>
                    ))}
                  <div>
                    路径：
                    <Link href={"/tags"} presets={["hover-underline"]}>
                      标签列表
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
                <Suspense>
                  <TagsRandomPage
                    options={tags.map((tag) => {
                      return `/tags/${tag.slug}`;
                    })}
                    text={config.getBlockFooterDesc(1)}
                  />
                </Suspense>
              </GridItem>
            )}
          </RowGrid>
        )}

        <RowGrid>
          {tags.map((tag) => (
            <TagContainer key={tag.slug} tag={tag} />
          ))}
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
    </MainLayout>
  );
}

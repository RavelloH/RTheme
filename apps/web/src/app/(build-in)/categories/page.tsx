import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";

import CategoriesRandomPage from "@/app/(build-in)/categories/CategoriesRandomPage";
import CategoryContainer from "@/app/(build-in)/categories/CategoryContainer";
import DynamicReplace from "@/components/client/DynamicReplace";
import HorizontalScroll from "@/components/HorizontalScroll";
import Link from "@/components/Link";
import LinkButton from "@/components/LinkButton";
import MainLayout from "@/components/MainLayout";
import RowGrid, { GridItem } from "@/components/RowGrid";
import { batchGetCategoryPaths } from "@/lib/server/category-utils";
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
const page = await getRawPage("/categories");
const config = createPageConfigBuilder(getSystemPageConfig(page));

// 获取所有分类数据（一次性获取，避免递归查询）
const allCategories = await prisma.category.findMany({
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
      },
    },
  },
});

// 过滤出根分类
const rawCategories = allCategories.filter(
  (category) => category.parentId === null,
);

// 获取所有分类ID用于批量获取路径
const allCategoryIds = allCategories.map((category) => category.id);

// 批量获取所有分类路径（只需1次额外查询）
const categoryPathsMap = await batchGetCategoryPaths(allCategoryIds);

// 构建分类映射和关系数据
const categoryMap = new Map<number, (typeof allCategories)[0]>();
allCategories.forEach((category) => {
  categoryMap.set(category.id, category);
});

// 辅助函数：递归计算总文章数（使用内存数据，无需数据库查询）
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

// 处理分类统计数据
const processedCategories = rawCategories.map((category) => {
  // 使用内存数据计算统计信息，无需额外数据库查询
  const totalPostCount = calculateTotalPosts(category.id);
  const totalChildCount = calculateTotalChildren(category.id);

  // 获取路径
  const path = categoryPathsMap.get(category.id) || [];

  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description,
    featuredImage: getFeaturedImageData(category.mediaRefs)
      ? [getFeaturedImageData(category.mediaRefs)!]
      : null,
    totalPostCount,
    totalChildCount,
    path: path.map((item) => item.slug), // 转换为 slug 数组
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
});

// 过滤和排序分类
const categories = processedCategories
  .filter((category) => category.totalPostCount > 0) // 过滤掉空的分类
  .sort((a, b) => {
    // 将"未分类"排在最后
    if (a.slug === "uncategorized") return 1;
    if (b.slug === "uncategorized") return -1;
    // 其他分类按总文章数降序排序
    return b.totalPostCount - a.totalPostCount;
  });

// 计算分类统计数据
const totalCategories = categories.length;
const rootCategories = categories.length; // 所有分类都是根分类（当前只显示根分类）
const childCategories = categories.reduce(
  (sum, cat) => sum + cat.totalChildCount,
  0,
); // 总子分类数
const lastUpdatedDate = new Date(); // 当前服务器时间

const pageInfo = "根分类";

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
    pathname: "/categories",
  },
);

export default async function CategoryIndex() {
  "use cache";
  cacheTag("pages/categories-page", "posts", "categories");
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
                                ["{categories}", String(totalCategories)],
                                ["{root}", String(rootCategories)],
                                ["{child}", String(childCategories)],
                                ["__date", lastUpdatedDate.toISOString()],
                              ]}
                            />
                          );
                        } else {
                          return (
                            <div key={lineKey}>
                              {line
                                .replaceAll(
                                  "{categories}",
                                  String(totalCategories),
                                )
                                .replaceAll("{root}", String(rootCategories))
                                .replaceAll(
                                  "{child}",
                                  String(childCategories),
                                ) || " "}
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
                    <Link href={"/categories"} presets={["hover-underline"]}>
                      根分类
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
                  <CategoriesRandomPage
                    options={categories.map((category) => {
                      return `/categories/${category.slug}`;
                    })}
                    text={config.getBlockFooterDesc(1)}
                  />
                </Suspense>
              </GridItem>
            )}
          </RowGrid>
        )}

        <RowGrid>
          {categories.map((category) => (
            <CategoryContainer key={category.id} category={category} />
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

import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";

import type { RuntimeBlockInput } from "@/blocks/core/definition";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import PageTextContentLayout from "@/components/server/features/pages/PageTextContentLayout";
import BlockRenderer from "@/components/server/renderer/BlockRenderer";
import JsonLdScript from "@/components/server/seo/JsonLdScript";
import type { PageConfig } from "@/data/default-pages";
import { buildPageCacheTagsForBlocks } from "@/lib/server/block-cache";
import { resolveBlockData } from "@/lib/server/block-data-resolver";
import {
  getMainRouteTopLevelStaticParams,
  getMatchingPage,
  getSystemPageConfig,
} from "@/lib/server/page-cache";
import { getLatestPublishedPostsForJsonLd } from "@/lib/server/post";
import {
  generateJsonLdGraph,
  generateMetadata as getBaseMetadata,
  type JsonLdBreadcrumbItem,
  type SeoTemplateParams,
} from "@/lib/server/seo";

export async function generateStaticParams() {
  return getMainRouteTopLevelStaticParams();
}

const pageTextRenderModeMap = {
  BLOCK: null,
  BUILDIN: null,
  MARKDOWN: "markdown",
  MDX: "mdx",
  HTML: "html",
} as const;

const BREADCRUMB_LABEL_MAP: Record<string, string> = {
  posts: "文章",
  tags: "标签",
  categories: "分类",
  gallery: "画廊",
  projects: "项目",
};

function formatSegmentLabel(segment: string): string {
  const lowered = segment.toLowerCase();
  if (BREADCRUMB_LABEL_MAP[lowered]) {
    return BREADCRUMB_LABEL_MAP[lowered]!;
  }

  return decodeURIComponent(segment).replace(/-/g, " ");
}

function buildMainRouteBreadcrumb(
  pathname: string,
  title: string,
): JsonLdBreadcrumbItem[] {
  const breadcrumb: JsonLdBreadcrumbItem[] = [{ name: "首页", item: "/" }];
  const segments = pathname.split("/").filter(Boolean);

  let currentPath = "";
  for (const segment of segments) {
    currentPath += `/${segment}`;
    breadcrumb.push({
      name: formatSegmentLabel(segment),
      item: currentPath,
    });
  }

  if (breadcrumb[breadcrumb.length - 1]?.name !== title) {
    breadcrumb.push({ name: title, item: pathname });
  }

  return breadcrumb;
}

function isCollectionPage(pathname: string): boolean {
  const normalized = pathname.toLowerCase();
  if (normalized.includes("/page/")) return true;
  return (
    normalized === "/" ||
    normalized.startsWith("/posts") ||
    normalized.startsWith("/tags") ||
    normalized.startsWith("/categories") ||
    normalized.startsWith("/gallery")
  );
}

export const generateMetadata = async ({
  params,
}: PageProps<"/[[...slug]]">) => {
  const match = await getMatchingPage((await params).slug);
  if (!match) return notFound();
  const { page, params: resolvedParams } = match;
  const config = getSystemPageConfig(page) as PageConfig;

  // 获取 pageSize（用于计算 totalPage）
  const pageSize =
    ((config?.data as Record<string, unknown>)?.pageSize as number) ?? 20;

  // 准备 SEO 插值参数
  const seoParams: SeoTemplateParams = {
    slug: resolvedParams.slug,
    page: resolvedParams.page,
    pageSize,
  };

  return getBaseMetadata(
    {
      title: page.title,
      description: page.metaDescription,
      keywords: page.metaKeywords,
      robots: { index: page.robotsIndex },
    },
    {
      pathname: resolvedParams.url,
      seoParams,
    },
  );
};

export default async function Page({ params }: PageProps<"/[[...slug]]">) {
  "use cache";

  const match = await getMatchingPage((await params).slug);
  if (!match) return notFound();
  const { page, params: resolvedParams } = match;
  const isHomePage = resolvedParams.url === "/";
  const latestPostsForJsonLd = isHomePage
    ? await getLatestPublishedPostsForJsonLd(10)
    : [];
  const jsonLdGraph = await generateJsonLdGraph({
    kind: resolvedParams.url === "/" ? "site" : "webpage",
    pathname: resolvedParams.url,
    title: page.title,
    description: page.metaDescription || undefined,
    keywords: page.metaKeywords,
    robots: { index: page.robotsIndex },
    pageType: isCollectionPage(resolvedParams.url)
      ? "CollectionPage"
      : "WebPage",
    publishedAt: page.createdAt,
    updatedAt: page.updatedAt,
    breadcrumb: buildMainRouteBreadcrumb(resolvedParams.url, page.title),
    itemList: isHomePage
      ? {
          idSuffix: "latest-posts",
          name: "最新文章",
          itemType: "BlogPosting",
          items: latestPostsForJsonLd.map((post) => ({
            name: post.title,
            url: `/posts/${post.slug}`,
            description: post.excerpt || post.metaDescription || undefined,
            image: post.featuredImage || undefined,
            datePublished: post.publishedAt || post.createdAt,
            dateModified: post.updatedAt,
          })),
        }
      : undefined,
  });

  cacheTag(
    `pages/${page.id}`,
    "config/site.url",
    "config/site.title",
    "config/seo.description",
    "config/author.name",
    "config/site.avatar",
    "config/seo.index.enable",
  );
  if (isHomePage) {
    cacheTag("posts/list");
  }
  cacheLife("max");

  if (page.contentType === "BLOCK") {
    const config = getSystemPageConfig(page) as PageConfig;
    const blockInputs = (
      config &&
      typeof config === "object" &&
      "blocks" in config &&
      Array.isArray((config as { blocks?: unknown }).blocks)
        ? ((config as { blocks?: RuntimeBlockInput[] }).blocks ?? [])
        : []
    ) as RuntimeBlockInput[];
    const pageTags = buildPageCacheTagsForBlocks({
      pageId: page.id,
      blocks: blockInputs,
      pageContext: resolvedParams,
    });

    if (pageTags.length > 0) {
      cacheTag(...pageTags);
    }

    const { blocks = [] } =
      (await resolveBlockData(config, resolvedParams, {
        pageId: page.id,
      })) || {};

    return (
      <MainLayout type="horizontal">
        <JsonLdScript id="jsonld-main" graph={jsonLdGraph} />
        <HorizontalScroll className="h-full" disableContentAnimation>
          <BlockRenderer
            blocks={blocks}
            horizontalAnimation={{
              enableParallax: true,
              enableFadeElements: true,
              enableLineReveal: true,
            }}
          />
        </HorizontalScroll>
      </MainLayout>
    );
  }

  const renderMode = pageTextRenderModeMap[page.contentType];
  if (renderMode) {
    return (
      <PageTextContentLayout
        pageId={page.id}
        title={page.title}
        description={page.metaDescription}
        source={page.content}
        mode={renderMode}
        jsonLdGraph={jsonLdGraph}
      />
    );
  }

  return notFound();
}

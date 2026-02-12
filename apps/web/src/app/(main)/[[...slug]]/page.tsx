import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";

import type { RuntimeBlockInput } from "@/blocks/core/definition";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import PageTextContentLayout from "@/components/server/features/pages/PageTextContentLayout";
import BlockRenderer from "@/components/server/renderer/BlockRenderer";
import type { PageConfig } from "@/data/default-pages";
import { buildPageCacheTagsForBlocks } from "@/lib/server/block-cache";
import { resolveBlockData } from "@/lib/server/block-data-resolver";
import {
  getMainRouteStaticParams,
  getMatchingPage,
  getSystemPageConfig,
} from "@/lib/server/page-cache";
import {
  generateMetadata as getBaseMetadata,
  type SeoTemplateParams,
} from "@/lib/server/seo";

export async function generateStaticParams() {
  return getMainRouteStaticParams();
}

const pageTextRenderModeMap = {
  BLOCK: null,
  BUILDIN: null,
  MARKDOWN: "markdown",
  MDX: "mdx",
  HTML: "html",
} as const;

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

  cacheTag(`pages/${page.id}`);
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
      />
    );
  }

  return notFound();
}

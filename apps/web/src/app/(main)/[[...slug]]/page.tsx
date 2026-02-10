import { notFound } from "next/navigation";

import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import PageTextContentLayout from "@/components/server/features/pages/PageTextContentLayout";
import BlockRenderer from "@/components/server/renderer/BlockRenderer";
import type { PageConfig } from "@/data/default-pages";
import { resolveBlockData } from "@/lib/server/block-data-resolver";
import { getMatchingPage, getSystemPageConfig } from "@/lib/server/page-cache";
import {
  generateMetadata as getBaseMetadata,
  type SeoTemplateParams,
} from "@/lib/server/seo";

// TODO: Static Params
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
  const match = await getMatchingPage((await params).slug);
  if (!match) return notFound();
  const { page, params: resolvedParams } = match;

  // cacheLife("max");
  // TODO: Cache Tag

  if (page.contentType === "BLOCK") {
    const config = getSystemPageConfig(page) as PageConfig;
    const { blocks = [] } =
      (await resolveBlockData(config, resolvedParams)) || {};

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

import { notFound } from "next/navigation";

import BlockRenderer from "@/components/BlockRenderer";
import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import type { PageConfig } from "@/data/default-pages";
import { resolveBlockData } from "@/lib/server/block-data-resolver";
import { getRawPage, getSystemPageConfig } from "@/lib/server/page-cache";
import { generateMetadata as getBaseMetadata } from "@/lib/server/seo";

// TODO: Static Params

async function loadPageData(paramsPromise: Promise<{ slug?: string[] }>) {
  const path = (await paramsPromise).slug?.join("/") ?? "/";
  const page = await getRawPage(path);
  return page?.status === "ACTIVE" && !page.deletedAt ? { page, path } : null;
}

export const generateMetadata = async ({
  params,
}: PageProps<"/[[...slug]]">) => {
  const data = await loadPageData(params);
  if (!data) return {};

  const { page, path } = data;
  return getBaseMetadata(
    {
      title: page.title,
      description: page.metaDescription,
      keywords: page.metaKeywords,
      robots: { index: page.robotsIndex },
    },
    { pathname: path },
  );
};

export default async function Page({ params }: PageProps<"/[[...slug]]">) {
  const data = await loadPageData(params);
  if (!data) return notFound();
  const config = getSystemPageConfig(data.page);
  const { blocks = [] } = (await resolveBlockData(config as PageConfig)) || {};

  // cacheLife("max");
  // TODO: Cache Tag

  return (
    <MainLayout type="horizontal">
      <HorizontalScroll
        className="h-full"
        enableParallax
        enableFadeElements
        enableLineReveal
      >
        <BlockRenderer config={blocks} />
      </HorizontalScroll>
    </MainLayout>
  );
}

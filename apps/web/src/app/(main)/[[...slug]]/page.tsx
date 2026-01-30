"use cache";

import { generateMetadata as getBaseMetadata } from "@/lib/server/seo";
import { getSystemPageConfig, getRawPage } from "@/lib/server/page-cache";
import { resolveBlockData } from "@/lib/server/block-data-resolver";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import MainLayout from "@/components/MainLayout";
import HorizontalScroll from "@/components/HorizontalScroll";
import BlockRenderer from "@/components/BlockRenderer";
import type { PageConfig } from "next";

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
  const { blocks = [] } =
    (await resolveBlockData(config as unknown as PageConfig)) || {};

  cacheLife("max");
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

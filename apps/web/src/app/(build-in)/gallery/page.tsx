import { cacheLife, cacheTag } from "next/cache";

import GalleryClient from "@/app/(build-in)/gallery/GalleryClient";
import MainLayout from "@/components/client/layout/MainLayout";
import { getGalleryPhotosData } from "@/lib/server/media";
import { getRawPage } from "@/lib/server/page-cache";
import { generateMetadata } from "@/lib/server/seo";

const page = await getRawPage("/gallery");

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
    pathname: "/gallery",
  },
);

export default async function GalleryIndex() {
  "use cache";
  cacheTag(
    "gallery/list",
    "config/media.gallery.sortByShotTime",
    "config/media.gallery.sortOrder",
  );
  if (page?.id) {
    cacheTag(`pages/${page.id}`);
  }
  cacheLife("max");

  const { photos, nextCursor } = await getGalleryPhotosData({});

  return (
    <MainLayout type="horizontal">
      <GalleryClient initialPhotos={photos} initialCursor={nextCursor} />
    </MainLayout>
  );
}

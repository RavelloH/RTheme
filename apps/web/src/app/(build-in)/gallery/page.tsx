import MainLayout from "@/components/MainLayout";
import { getRawPage } from "@/lib/server/page-cache";
import { generateMetadata } from "@/lib/server/seo";
import { cacheLife, cacheTag } from "next/cache";
import GalleryClient from "./GalleryClient";
import { getGalleryPhotosData } from "@/lib/server/media";

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
  cacheTag("photos", "config");
  cacheLife("max");

  const { photos, nextCursor } = await getGalleryPhotosData({});

  return (
    <MainLayout type="horizontal">
      <GalleryClient initialPhotos={photos} initialCursor={nextCursor} />
    </MainLayout>
  );
}

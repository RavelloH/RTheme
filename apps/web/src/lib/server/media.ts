import "server-only";
import prisma from "@/lib/server/prisma";
import { generateSignedImageId } from "@/lib/server/image-crypto";
import type { GalleryPhoto } from "@/lib/gallery-layout";
import { getConfig } from "@/lib/server/config-cache";

const GALLERY_PAGE_SIZE = 50;

/**
 * 核心数据获取逻辑：获取画廊照片
 * 这是一个纯粹的服务端函数，不依赖 Request/Headers 上下文
 */
export async function getGalleryPhotosData(params: {
  cursorId?: number;
}): Promise<{ photos: GalleryPhoto[]; nextCursor?: number }> {
  const { cursorId } = params;

  // 获取排序配置
  const sortByShotTime = await getConfig("media.gallery.sortByShotTime");
  const sortOrder = await getConfig("media.gallery.sortOrder");

  // 构建排序条件
  // 如果优先按拍摄时间排序，使用 sortTime (已在写入时处理为 shotAt || now)
  // 否则使用 createdAt (加入画廊的时间)
  const orderBy: Record<string, string>[] = [
    { [sortByShotTime ? "sortTime" : "createdAt"]: sortOrder as string },
    { id: "desc" },
  ];

  const rawPhotos = await prisma.photo.findMany({
    take: GALLERY_PAGE_SIZE,
    skip: cursorId ? 1 : 0, // Skip the cursor itself
    cursor: cursorId ? { id: cursorId } : undefined,
    include: {
      media: true,
    },
    orderBy,
  });

  const nextCursor =
    rawPhotos.length === GALLERY_PAGE_SIZE
      ? rawPhotos[rawPhotos.length - 1]?.id
      : undefined;

  const photos: GalleryPhoto[] = rawPhotos.map((photo) => ({
    id: photo.id,
    slug: photo.slug,
    size: photo.size,
    imageUrl: `/p/${generateSignedImageId(photo.media.shortHash)}`,
    blur: photo.media.blur,
    width: photo.media.width,
    height: photo.media.height,
    alt: photo.media.altText,
    name: photo.name,
  }));

  return { photos, nextCursor };
}

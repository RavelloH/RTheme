import {
  fetchBlockInterpolatedData,
  processImageArrayField,
} from "@/blocks/core/lib/server";
import type { BlockConfig } from "@/blocks/core/types";
import { getConfigs } from "@/lib/server/config-cache";
import { generateSignedImageId } from "@/lib/server/image-crypto";
import { batchQueryMediaFiles } from "@/lib/server/image-query";
import {
  getFeaturedImageUrl,
  mediaRefsInclude,
} from "@/lib/server/media-reference";
import prisma from "@/lib/server/prisma";
import type { ProcessedImageData } from "@/lib/shared/image-common";
import { processImageUrl } from "@/lib/shared/image-common";
import { MEDIA_SLOTS } from "@/types/media";

type HeroBlockContent = {
  logoImage?: string;
  galleryImages?: string[];
  galleryImagesOrigin?: "latestPosts" | "latestGallery" | "custom";
} & Record<string, unknown>;

export async function heroFetcher(config: BlockConfig) {
  const content = (config.content || {}) as HeroBlockContent;

  // =========================================================
  // 1. 定义并发任务
  // =========================================================

  // 任务 A: 获取插值数据
  const interpolatedPromise = fetchBlockInterpolatedData(config.content);

  // 任务 B: 获取站点配置
  const siteConfigPromise = getConfigs(["site.title", "site.slogan.primary"]);

  // 任务 C: 获取并处理 Logo 图片 (独立异步，不阻塞其他查询)
  const logoPromise = (async () => {
    if (!content.logoImage) return undefined;
    const mediaFileMap = await batchQueryMediaFiles([content.logoImage]);
    const processed = processImageUrl(content.logoImage, mediaFileMap);
    return processed?.[0];
  })();

  // 任务 D: 获取并处理图集数据 (核心逻辑封装在辅助函数中)
  const galleryPromise = fetchGalleryData(content);

  // =========================================================
  // 2. 并行执行所有任务
  // =========================================================
  const [interpolatedData, [siteTitle, siteSlogan], logoImage, galleryImages] =
    await Promise.all([
      interpolatedPromise,
      siteConfigPromise,
      logoPromise,
      galleryPromise,
    ]);

  // =========================================================
  // 3. 返回结果
  // =========================================================
  return {
    siteTitle,
    siteSlogan,
    galleryImages,
    logoImage,
    ...interpolatedData,
  };
}

/**
 * 辅助函数：根据配置来源获取并处理图集图片
 */
async function fetchGalleryData(
  content: HeroBlockContent,
): Promise<ProcessedImageData[]> {
  const { galleryImagesOrigin, galleryImages: customImages } = content;

  // 场景 1: 自定义图片 (Custom)
  if (
    galleryImagesOrigin === "custom" ||
    (customImages && customImages.length > 0)
  ) {
    return processImageArrayField(customImages);
  }

  // 场景 2: 最新照片墙 (Latest Gallery)
  if (galleryImagesOrigin === "latestGallery") {
    const photos = await prisma.photo.findMany({
      where: {
        media: { mediaType: "IMAGE" },
      },
      include: {
        media: {
          select: { shortHash: true, width: true, height: true, blur: true },
        },
      },
      orderBy: [{ sortTime: "desc" }, { id: "desc" }],
      take: 9,
    });

    return photos.map((photo) => ({
      url: `/p/${generateSignedImageId(photo.media.shortHash)}`,
      width: photo.media.width ?? undefined,
      height: photo.media.height ?? undefined,
      blur: photo.media.blur ?? undefined,
    }));
  }

  // 场景 3 (默认): 最新文章特色图 (Latest Posts)
  // 此时 origin 为 "latestPosts" 或 undefined
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      mediaRefs: {
        some: { slot: MEDIA_SLOTS.POST_FEATURED_IMAGE },
      },
    },
    select: { ...mediaRefsInclude },
    orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
    take: 9,
  });

  // 提取原始 URL
  const rawImageUrls = posts
    .map((post) => getFeaturedImageUrl(post.mediaRefs))
    .filter((url): url is string => !!url);

  if (rawImageUrls.length === 0) return [];

  // 批量查询图片元数据并处理
  const homePageMediaFileMap = await batchQueryMediaFiles(rawImageUrls);

  return rawImageUrls.reduce<ProcessedImageData[]>((acc, rawUrl) => {
    const processed = processImageUrl(rawUrl, homePageMediaFileMap);
    if (processed && processed.length > 0) {
      acc.push(...processed);
    }
    return acc;
  }, []);
}

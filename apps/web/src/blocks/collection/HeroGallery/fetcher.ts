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

export async function heroFetcher(config: BlockConfig) {
  // 0. 启动插值数据获取
  const interpolatedPromise = fetchBlockInterpolatedData(config.content);

  // 从 content 中获取用户配置
  const content = config.content as Record<string, unknown> | undefined;
  const customLogoImage = content?.logoImage as string | undefined;
  const customGalleryImages = content?.galleryImages as string[] | undefined;
  const galleryImagesOrigin = content?.galleryImagesOrigin as
    | "latestPosts"
    | "latestGallery"
    | "custom"
    | undefined;

  // 1. 并发优化：将 Prisma 查询与 Config 获取合并到一个 Promise.all 中
  // 这样数据库查询和缓存读取是同时进行的
  const [siteConfig, data] = await Promise.all([
    // 获取站点配置
    getConfigs(["site.title", "site.slogan.primary"]),

    // 根据来源获取数据
    (async () => {
      // 如果是自定义图片，不查询数据库
      if (
        galleryImagesOrigin === "custom" ||
        (customGalleryImages && customGalleryImages.length > 0)
      ) {
        return { posts: [], photos: [] };
      }

      // 如果是最新文章图片，查询 Post
      if (galleryImagesOrigin === "latestPosts" || !galleryImagesOrigin) {
        const posts = await prisma.post.findMany({
          where: {
            status: "PUBLISHED",
            deletedAt: null,
            mediaRefs: {
              some: {
                slot: MEDIA_SLOTS.POST_FEATURED_IMAGE,
              },
            },
          },
          select: {
            ...mediaRefsInclude,
          },
          orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
          take: 9,
        });
        return { posts, photos: [] };
      }

      // 如果是最新照片墙图片，查询 Photo
      if (galleryImagesOrigin === "latestGallery") {
        const photos = await prisma.photo.findMany({
          where: {
            media: {
              mediaType: "IMAGE",
            },
          },
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
          orderBy: [{ sortTime: "desc" }, { id: "desc" }],
          take: 9,
        });
        return { posts: [], photos };
      }

      // 默认返回最新文章图片
      const posts = await prisma.post.findMany({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
          mediaRefs: {
            some: {
              slot: MEDIA_SLOTS.POST_FEATURED_IMAGE,
            },
          },
        },
        select: {
          ...mediaRefsInclude,
        },
        orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
        take: 9,
      });
      return { posts, photos: [] };
    })(),
  ]);

  const [siteTitle, siteSlogan] = siteConfig;
  const { posts: galleryPosts, photos } = data;

  // 2. 处理图集图片 - 返回 ProcessedImageData[] 格式
  let galleryImages: ProcessedImageData[] = [];

  if (customGalleryImages && customGalleryImages.length > 0) {
    // 优先使用自定义图片
    galleryImages = await processImageArrayField(customGalleryImages);
  } else if (photos && photos.length > 0) {
    // 使用照片墙图片
    galleryImages = photos.map((photo) => {
      const imageId = generateSignedImageId(photo.media.shortHash);
      return {
        url: `/p/${imageId}`,
        width: photo.media.width ?? undefined,
        height: photo.media.height ?? undefined,
        blur: photo.media.blur ?? undefined,
      };
    });
  } else if (galleryPosts && galleryPosts.length > 0) {
    // 使用文章特色图片
    const rawImageUrls = galleryPosts
      .map((post: (typeof galleryPosts)[number]) =>
        getFeaturedImageUrl(post.mediaRefs),
      )
      .filter((url): url is string => !!url);

    if (rawImageUrls.length > 0) {
      const homePageMediaFileMap = await batchQueryMediaFiles(rawImageUrls);

      galleryImages = rawImageUrls.reduce<ProcessedImageData[]>(
        (acc: ProcessedImageData[], rawUrl: string) => {
          const processed = processImageUrl(rawUrl, homePageMediaFileMap);
          if (processed && processed.length > 0) {
            acc.push(...processed);
          }
          return acc;
        },
        [],
      );
    }
  }

  // 3. 处理 logo 图片（如果用户自定义）- 返回 ProcessedImageData 格式
  let logoImage: ProcessedImageData | undefined;
  if (customLogoImage) {
    const mediaFileMap = await batchQueryMediaFiles([customLogoImage]);
    const processed = processImageUrl(customLogoImage, mediaFileMap);
    logoImage = processed?.[0];
  }

  const interpolatedData = await interpolatedPromise;

  return {
    siteTitle,
    siteSlogan,
    galleryImages,
    logoImage,
    ...interpolatedData,
  };
}

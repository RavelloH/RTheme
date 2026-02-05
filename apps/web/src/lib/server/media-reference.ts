/**
 * MediaReference 辅助工具
 * 用于简化从 MediaReference 表中查询和转换图片引用
 */

import { generateSignature } from "@/lib/server/image-crypto";
import type Prisma from "@/lib/server/prisma";
import { MEDIA_SLOTS } from "@/types/media";

/**
 * MediaReference 查询包含选项
 * 用于 Prisma 查询时包含 mediaRefs 关系
 */
export const mediaRefsInclude = {
  mediaRefs: {
    include: {
      media: {
        select: {
          id: true,
          shortHash: true,
          fileName: true,
          originalName: true,
          mimeType: true,
          width: true,
          height: true,
          altText: true,
          blur: true,
        },
      },
    },
  },
} as const;

/**
 * 从 mediaRefs 中提取特色图片短链接
 * 返回格式：/p/{shortHash}{signature}
 */
export function getFeaturedImageUrl(
  mediaRefs?: Array<{
    slot: string;
    media: { shortHash: string };
  }>,
): string | null {
  const ref = mediaRefs?.find(
    (ref) =>
      ref.slot === MEDIA_SLOTS.POST_FEATURED_IMAGE ||
      ref.slot === MEDIA_SLOTS.TAG_FEATURED_IMAGE ||
      ref.slot === MEDIA_SLOTS.CATEGORY_FEATURED_IMAGE ||
      ref.slot === MEDIA_SLOTS.PAGE_FEATURED_IMAGE ||
      ref.slot === MEDIA_SLOTS.PROJECT_FEATURED_IMAGE,
  );

  if (!ref) return null;

  const { shortHash } = ref.media;
  const signature = generateSignature(shortHash);
  return `/p/${shortHash}${signature}`;
}

/**
 * 从 mediaRefs 中提取所有特色图片短链接
 * 返回格式：["/p/{shortHash}{signature}", ...]
 */
export function getAllFeaturedImageUrls(
  mediaRefs?: Array<{
    slot: string;
    media: { shortHash: string };
  }>,
): string[] {
  return (
    mediaRefs
      ?.filter(
        (ref) =>
          ref.slot === MEDIA_SLOTS.POST_FEATURED_IMAGE ||
          ref.slot === MEDIA_SLOTS.TAG_FEATURED_IMAGE ||
          ref.slot === MEDIA_SLOTS.CATEGORY_FEATURED_IMAGE ||
          ref.slot === MEDIA_SLOTS.PAGE_FEATURED_IMAGE ||
          ref.slot === MEDIA_SLOTS.PROJECT_FEATURED_IMAGE,
      )
      .map((ref) => {
        const { shortHash } = ref.media;
        const signature = generateSignature(shortHash);
        return `/p/${shortHash}${signature}`;
      }) ?? []
  );
}

/**
 * 从 mediaRefs 中提取特色图片完整信息（包含优化属性）
 * 返回格式：{ url: string, width?: number, height?: number, blur?: string }
 */
export function getFeaturedImageData(
  mediaRefs?: Array<{
    slot: string;
    media: {
      shortHash: string;
      width?: number | null;
      height?: number | null;
      blur?: string | null;
    };
  }>,
): { url: string; width?: number; height?: number; blur?: string } | null {
  const ref = mediaRefs?.find(
    (ref) =>
      ref.slot === MEDIA_SLOTS.POST_FEATURED_IMAGE ||
      ref.slot === MEDIA_SLOTS.TAG_FEATURED_IMAGE ||
      ref.slot === MEDIA_SLOTS.CATEGORY_FEATURED_IMAGE ||
      ref.slot === MEDIA_SLOTS.PAGE_FEATURED_IMAGE ||
      ref.slot === MEDIA_SLOTS.PROJECT_FEATURED_IMAGE,
  );

  if (!ref) return null;

  const { shortHash, width, height, blur } = ref.media;
  const signature = generateSignature(shortHash);

  return {
    url: `/p/${shortHash}${signature}`,
    width: width || undefined,
    height: height || undefined,
    blur: blur || undefined,
  };
}

/**
 * 从 mediaRefs 中提取所有内容图片短链接
 * 返回格式：/p/{shortHash}{signature}
 */
export function getContentImageUrls(
  mediaRefs?: Array<{
    slot: string;
    media: { shortHash: string };
  }>,
): string[] {
  return (
    mediaRefs
      ?.filter(
        (ref) =>
          ref.slot === MEDIA_SLOTS.POST_CONTENT_IMAGE ||
          ref.slot === MEDIA_SLOTS.PAGE_CONTENT_IMAGE,
      )
      .map((ref) => {
        const { shortHash } = ref.media;
        const signature = generateSignature(shortHash);
        return `/p/${shortHash}${signature}`;
      }) ?? []
  );
}

/**
 * 创建特色图片的 MediaReference 连接数据
 */
export function createFeaturedImageRef(
  mediaId: number,
  entityType: "post" | "tag" | "category" | "page",
) {
  const slotMap = {
    post: MEDIA_SLOTS.POST_FEATURED_IMAGE,
    tag: MEDIA_SLOTS.TAG_FEATURED_IMAGE,
    category: MEDIA_SLOTS.CATEGORY_FEATURED_IMAGE,
    page: MEDIA_SLOTS.PAGE_FEATURED_IMAGE,
  };

  return {
    create: {
      mediaId,
      slot: slotMap[entityType],
    },
  };
}

/**
 * 创建内容图片的 MediaReference 连接数据
 */
export function createContentImageRefs(
  mediaIds: number[],
  entityType: "post" | "page",
) {
  const slotMap = {
    post: MEDIA_SLOTS.POST_CONTENT_IMAGE,
    page: MEDIA_SLOTS.PAGE_CONTENT_IMAGE,
  };

  return {
    create: mediaIds.map((mediaId) => ({
      mediaId,
      slot: slotMap[entityType],
    })),
  };
}

/**
 * 更新特色图片引用
 * @param entityId 实体 ID
 * @param entityType 实体类型
 * @param mediaId 新的媒体 ID（null 表示删除）
 * @returns Prisma 更新操作对象
 */
export function updateFeaturedImageRef(
  mediaId: number | null,
  entityType: "post" | "tag" | "category" | "page",
) {
  const slotMap = {
    post: MEDIA_SLOTS.POST_FEATURED_IMAGE,
    tag: MEDIA_SLOTS.TAG_FEATURED_IMAGE,
    category: MEDIA_SLOTS.CATEGORY_FEATURED_IMAGE,
    page: MEDIA_SLOTS.PAGE_FEATURED_IMAGE,
  };

  const slot = slotMap[entityType];

  if (mediaId === null) {
    // 删除特色图片引用
    return {
      deleteMany: {
        slot,
      },
    };
  }

  // 先删除旧的特色图片引用，再创建新的
  return {
    deleteMany: {
      slot,
    },
    create: {
      mediaId,
      slot,
    },
  };
}

/**
 * 通过 URL 查找媒体 ID
 * 支持多种 URL 格式：
 * - 完整的 storageUrl (如 https://cdn.example.com/image.jpg)
 * - 短链接格式 (如 /p/5DIMkhLb 或 /p/5DIMkhLbkAfO)
 * - 相对路径 (如 /uploads/image.jpg)
 */
export async function findMediaIdByUrl(
  prisma: typeof Prisma,
  url: string | null | undefined,
): Promise<number | null> {
  if (!url) return null;

  // 1. 先尝试完整 URL 匹配
  let media = await prisma.media.findFirst({
    where: { storageUrl: url },
    select: { id: true },
  });

  if (media) return media.id;

  // 2. 检查是否是短链接格式 /p/{shortHash+signature}
  const shortLinkMatch = url.match(/\/p\/([a-zA-Z0-9_-]{8,12})/);
  if (shortLinkMatch) {
    const shortHashWithSignature = shortLinkMatch[1]!;
    // 前8位是 shortHash
    const shortHash = shortHashWithSignature.substring(0, 8);

    media = await prisma.media.findFirst({
      where: { shortHash },
      select: { id: true },
    });

    if (media) return media.id;
  }

  // 3. 尝试通过 fileName 匹配（如果 URL 包含文件名）
  const fileNameMatch = url.match(/([^/]+\.(jpg|jpeg|png|gif|webp|svg))$/i);
  if (fileNameMatch) {
    const fileName = fileNameMatch[1];

    media = await prisma.media.findFirst({
      where: { fileName },
      select: { id: true },
    });

    if (media) return media.id;
  }

  // 4. 尝试通过 storageUrl 部分匹配（如果 URL 是相对路径）
  if (url.startsWith("/")) {
    media = await prisma.media.findFirst({
      where: {
        storageUrl: {
          endsWith: url,
        },
      },
      select: { id: true },
    });

    if (media) return media.id;
  }

  return null;
}

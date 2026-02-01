// apps/web/src/lib/server/image-query.ts
// Server-Only 逻辑，依赖 Prisma

import "server-only";

import prisma from "@/lib/server/prisma";
import {
  extractInternalHashes,
  type MediaFileInfo,
} from "@/lib/shared/image-common";

/**
 * 批量查询图片媒体文件
 * @param imageUrls 图片URL数组或字符串
 * @returns 媒体文件映射（shortHash -> MediaFileInfo）
 */
export async function batchQueryMediaFiles(
  imageUrls: (string | null)[],
): Promise<Map<string, MediaFileInfo>> {
  // 收集所有内部链接的哈希
  const allInternalHashes = imageUrls
    .filter((image): image is string => image !== null)
    .flatMap((image) => extractInternalHashes(image));

  // 提取短哈希用于数据库查询
  const allInternalLinks = allInternalHashes.map((hash) => hash.shortHash);

  if (allInternalLinks.length === 0) {
    return new Map();
  }

  // 查询这些短哈希对应的媒体文件
  const mediaFiles = await prisma.media.findMany({
    where: {
      shortHash: {
        in: allInternalLinks,
      },
      mediaType: "IMAGE",
    },
    select: {
      shortHash: true,
      width: true,
      height: true,
      blur: true,
    },
  });

  // 构建映射表：shortHash -> MediaFileInfo
  const mediaFileMap = new Map<string, MediaFileInfo>();
  mediaFiles.forEach((file) => {
    mediaFileMap.set(file.shortHash, {
      shortHash: file.shortHash,
      width: file.width || undefined,
      height: file.height || undefined,
      blur: file.blur || undefined,
    });
  });

  return mediaFileMap;
}

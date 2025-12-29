import prisma from "@/lib/server/prisma";

export interface ImageHash {
  shortHash: string; // 前8位：查询数据库
  fullHash: string; // 12位：构建图片URL
}

export interface ProcessedImageData {
  url: string;
  width?: number;
  height?: number;
  blur?: string;
}

export interface MediaFileInfo {
  shortHash: string;
  width?: number;
  height?: number;
  blur?: string;
}

/**
 * 筛选出内部链接的短哈希和完整哈希
 * @param text 要筛选的文本
 * @returns {shortHash: string, fullHash: string} 数组
 */
export function extractInternalHashes(text: string): ImageHash[] {
  if (!text) return [];

  // 匹配内部链接格式 /p/xxxxxxxxxxxx，其中xxxxxxxxxxxx是完整哈希（12位）
  const internalLinkRegex = /\/p\/([a-zA-Z0-9]{12})/g;
  const matches = text.match(internalLinkRegex) || [];

  const hashes = matches
    .map((match) => {
      const parts = match.split("/p/");
      const fullHash = parts[1] ? parts[1].trim() : "";
      const shortHash = fullHash.substring(0, 8); // 前8位用于查询数据库
      return { shortHash, fullHash };
    })
    .filter((hash) => hash.shortHash.length > 0);

  // 去重，基于短哈希
  const uniqueHashes = new Map<string, string>();
  hashes.forEach((hash) => {
    if (!uniqueHashes.has(hash.shortHash)) {
      uniqueHashes.set(hash.shortHash, hash.fullHash);
    }
  });

  return Array.from(uniqueHashes.entries()).map(([shortHash, fullHash]) => ({
    shortHash,
    fullHash,
  }));
}

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
    .filter((image): image is string => image !== null) // 过滤空值并进行类型守卫
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

/**
 * 处理图片链接，转换为 ParallaxImageCarousel 所需格式
 * @param imageUrl 原始图片URL
 * @param mediaFileMap 媒体文件映射表
 * @returns 处理后的图片对象数组
 */
export function processImageUrl(
  imageUrl: string,
  mediaFileMap: Map<string, MediaFileInfo>,
): ProcessedImageData[] {
  if (!imageUrl) return [];

  // 筛选出内部链接的哈希（包含短哈希和完整哈希）
  const internalHashes = extractInternalHashes(imageUrl);
  const imageObjects: ProcessedImageData[] = [];

  internalHashes.forEach((hash) => {
    const mediaFile = mediaFileMap.get(hash.shortHash);
    if (mediaFile) {
      // 如果找到对应的媒体文件，使用完整哈希URL并包含优化信息
      imageObjects.push({
        url: `/p/${hash.fullHash}`,
        width: mediaFile.width || undefined,
        height: mediaFile.height || undefined,
        blur: mediaFile.blur || undefined,
      });
    } else {
      // 如果没找到对应的媒体文件，使用完整哈希URL（不优化）
      imageObjects.push({
        url: `/p/${hash.fullHash}`,
      });
    }
  });

  // 处理外部链接（不包含内部链接的部分）
  const externalLinks = imageUrl
    .replace(/\/p\/[a-zA-Z0-9]{12,}/g, "")
    .split(",")
    .map((link) => link.trim())
    .filter((link) => link.length > 0);

  externalLinks.forEach((link) => {
    imageObjects.push({
      url: link,
    });
  });

  return imageObjects;
}

/**
 * 批量处理多个图片URL
 * @param imageUrls 图片URL数组
 * @param mediaFileMap 媒体文件映射表
 * @returns 处理后的图片对象数组
 */
export function batchProcessImageUrls(
  imageUrls: (string | null)[],
  mediaFileMap: Map<string, MediaFileInfo>,
): ProcessedImageData[] {
  const allImageObjects: ProcessedImageData[] = [];

  imageUrls.forEach((imageUrl) => {
    if (imageUrl) {
      allImageObjects.push(...processImageUrl(imageUrl, mediaFileMap));
    }
  });

  return allImageObjects;
}

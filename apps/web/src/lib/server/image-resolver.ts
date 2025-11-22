import "server-only";

import prisma from "@/lib/server/prisma";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 媒体解析结果
 */
export interface MediaResolveResult {
  id: number;
  shortHash: string;
  storageUrl: string;
  mimeType: string;
  fileName: string;
  isOptimized: boolean;
}

// ============================================================================
// 数据获取函数
// ============================================================================

/**
 * 根据短哈希获取媒体信息
 *
 * 目前使用 Prisma 直接查询数据库
 * 未来可切换为 Redis 缓存以提升性能
 *
 * @param shortHash 8位短哈希
 * @returns 媒体信息或 null
 */
export async function getMediaByShortHash(
  shortHash: string
): Promise<MediaResolveResult | null> {
  // TODO: 未来可在此处添加 Redis 缓存层
  // const cached = await redis.get(`np:media:${shortHash}`);
  // if (cached) return JSON.parse(cached);

  const media = await prisma.media.findUnique({
    where: { shortHash },
    select: {
      id: true,
      shortHash: true,
      storageUrl: true,
      mimeType: true,
      fileName: true,
      isOptimized: true,
    },
  });

  if (!media) {
    return null;
  }

  const result: MediaResolveResult = {
    id: media.id,
    shortHash: media.shortHash,
    storageUrl: media.storageUrl,
    mimeType: media.mimeType,
    fileName: media.fileName,
    isOptimized: media.isOptimized,
  };

  // TODO: 未来可在此处缓存到 Redis
  // await redis.setex(`np:media:${shortHash}`, 3600, JSON.stringify(result));

  return result;
}

/**
 * 批量获取媒体信息（预留接口）
 *
 * @param shortHashes 短哈希数组
 * @returns 媒体信息映射
 */
export async function getMediaByShortHashes(
  shortHashes: string[]
): Promise<Map<string, MediaResolveResult>> {
  const mediaList = await prisma.media.findMany({
    where: {
      shortHash: { in: shortHashes },
    },
    select: {
      id: true,
      shortHash: true,
      storageUrl: true,
      mimeType: true,
      fileName: true,
      isOptimized: true,
    },
  });

  const resultMap = new Map<string, MediaResolveResult>();

  for (const media of mediaList) {
    resultMap.set(media.shortHash, {
      id: media.id,
      shortHash: media.shortHash,
      storageUrl: media.storageUrl,
      mimeType: media.mimeType,
      fileName: media.fileName,
      isOptimized: media.isOptimized,
    });
  }

  return resultMap;
}

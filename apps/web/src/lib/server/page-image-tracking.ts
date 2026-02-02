import "server-only";

import prisma from "@/lib/server/prisma";
import { extractInternalHashes } from "@/lib/shared/image-common";

/**
 * 从内容中递归提取所有站内图片 URL
 * @param content 任意内容（对象、数组、字符串等）
 * @returns 图片 URL 集合
 */
export function extractImageUrls(content: unknown): Set<string> {
  const urls = new Set<string>();

  function traverse(value: unknown): void {
    if (value === null || value === undefined) return;

    if (typeof value === "string") {
      // 提取字符串中的图片 URL
      const hashes = extractInternalHashes(value);
      hashes.forEach((hash) => {
        urls.add(`/p/${hash.fullHash}`);
      });
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(traverse);
      return;
    }

    if (typeof value === "object") {
      Object.values(value).forEach(traverse);
    }
  }

  traverse(content);
  return urls;
}

/**
 * 提取 blocks 中使用的所有图片
 * @param blocks 页面 blocks 配置
 * @returns 图片 URL 和 block 信息的映射 { url: { blockName, index } }
 */
export function extractImagesFromBlocks(
  blocks: Array<{ block: string; content?: unknown; data?: unknown }>,
): Map<string, { blockName: string; index: number }> {
  const images = new Map<string, { blockName: string; index: number }>();

  blocks.forEach((block, index) => {
    // 从 content 中提取图片
    if (block.content) {
      const contentUrls = extractImageUrls(block.content);
      contentUrls.forEach((url) => {
        images.set(url, { blockName: block.block, index });
      });
    }

    // 从 data 中提取图片（如果有 fetcher 返回的图片数据）
    if (block.data) {
      const dataUrls = extractImageUrls(block.data);
      dataUrls.forEach((url) => {
        images.set(url, { blockName: block.block, index });
      });
    }
  });

  return images;
}

/**
 * 更新页面的图片引用
 * @param pageId 页面 ID
 * @param blocks 页面 blocks 配置
 */
export async function updatePageMediaReferences(
  pageId: string,
  blocks: Array<{ block: string; content?: unknown; data?: unknown }>,
): Promise<void> {
  // 提取所有图片及其 block 信息
  const images = extractImagesFromBlocks(blocks);

  if (images.size === 0) {
    // 如果没有图片，删除该页面的所有 mediaRefs
    await prisma.mediaReference.deleteMany({
      where: { pageId },
    });
    return;
  }

  // 查询所有相关的 media 记录
  // 从 URL 中提取 shortHash（12位ID的前8位）用于查询数据库
  const shortHashes = Array.from(images.keys())
    .map((url) => {
      // 从 `/p/{imageId}` 中提取 imageId（12位）
      const match = url.match(/^\/p\/([a-zA-Z0-9]{12})$/);
      if (!match || !match[1]) return null;
      // 提取前 8 位作为 shortHash
      return match[1].slice(0, 8);
    })
    .filter((hash): hash is string => !!hash);

  // 去重
  const uniqueShortHashes = Array.from(new Set(shortHashes));

  const mediaRecords = await prisma.media.findMany({
    where: {
      shortHash: { in: uniqueShortHashes },
    },
    select: {
      id: true,
      shortHash: true,
    },
  });

  // 构建 shortHash 到 mediaId 的映射
  const shortHashToMediaId = new Map(
    mediaRecords.map((m) => [m.shortHash, m.id] as const),
  );

  // 在事务中更新 mediaRefs
  await prisma.$transaction(async (tx) => {
    // 1. 删除该页面的所有现有 mediaRefs
    await tx.mediaReference.deleteMany({
      where: { pageId },
    });

    // 2. 为每个图片创建新的 mediaRef
    const mediaRefs = Array.from(images.entries())
      .map(([url, { blockName, index }]) => {
        // 从 URL 中提取 imageId
        const match = url.match(/^\/p\/([a-zA-Z0-9]{12})$/);
        if (!match) return null;

        const imageId = match[1];
        if (!imageId) return null; // 类型守卫
        const shortHash = imageId.slice(0, 8);

        const mediaId = shortHashToMediaId.get(shortHash);
        if (!mediaId) return null; // 图片不存在，跳过

        // slot 格式：blockName-index（如 "hero-0", "text-1"）
        const slot = `${blockName}-${index}`;

        return {
          pageId,
          mediaId,
          slot,
        };
      })
      .filter((ref): ref is typeof ref & { mediaId: number } => ref !== null);

    if (mediaRefs.length > 0) {
      await tx.mediaReference.createMany({
        data: mediaRefs,
      });
    }
  });
}

/**
 * 从图片 URL 中提取 shortHash（8位）
 * @param imageUrl 图片 URL（如 /p/{12位imageId}）
 * @returns shortHash 或 null
 */
export function extractShortHash(imageUrl: string): string | null {
  const match = imageUrl.match(/^\/p\/([a-zA-Z0-9]{12})$/);
  return match && match[1] ? match[1].slice(0, 8) : null;
}

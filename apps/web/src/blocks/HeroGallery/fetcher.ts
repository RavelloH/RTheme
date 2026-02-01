import { getConfigs } from "@/lib/server/config-cache";
import { batchQueryMediaFiles } from "@/lib/server/image-query";
import { processImageUrl } from "@/lib/shared/image-common";
import prisma from "@/lib/server/prisma";
import {
  getFeaturedImageUrl,
  mediaRefsInclude,
} from "@/lib/server/media-reference";
import { MEDIA_SLOTS } from "@/types/media";
import type { BlockConfig } from "@/blocks/types";
import { fetchBlockInterpolatedData } from "../lib/server";

export async function heroFetcher(config: BlockConfig) {
  // 0. 启动插值数据获取
  const interpolatedPromise = fetchBlockInterpolatedData(config.content);

  // 1. 并发优化：将 Prisma 查询与 Config 获取合并到一个 Promise.all 中
  // 这样数据库查询和缓存读取是同时进行的
  const [siteConfig, galleryPosts] = await Promise.all([
    // 获取站点配置
    getConfigs(["site.title", "site.slogan.primary"]),

    // 获取画廊文章
    prisma.post.findMany({
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
        // 仅选择计算特色图片所需的字段，避免 select * (尽管使用了 mediaRefsInclude，确认其不包含 content 即可)
        ...mediaRefsInclude,
      },
      orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }],
      take: 9,
    }),
  ]);

  const [siteTitle, siteSlogan] = siteConfig;

  // 3. 数据处理优化：流式处理 URL
  // 先提取出所有原始 URL
  const rawImageUrls = galleryPosts
    .map((post) => getFeaturedImageUrl(post.mediaRefs))
    .filter((url): url is string => !!url); // 使用 !!url 过滤 null/undefined/空字符串

  // 批量获取媒体文件信息
  const homePageMediaFileMap = await batchQueryMediaFiles(rawImageUrls);

  // 4. 结果映射简化
  const galleryImages = rawImageUrls.reduce<string[]>((acc, rawUrl) => {
    // 处理图片 URL（签名/缩放等）
    const processed = processImageUrl(rawUrl, homePageMediaFileMap);
    // 取第一个可用的处理后 URL
    const finalUrl = processed?.[0]?.url;

    if (finalUrl) {
      acc.push(finalUrl);
    }
    return acc;
  }, []);

  const interpolatedData = await interpolatedPromise;

  return {
    siteTitle,
    siteSlogan,
    galleryImages,
    ...interpolatedData,
  };
}

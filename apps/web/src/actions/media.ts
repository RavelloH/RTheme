"use server";
import { NextResponse } from "next/server";
import {
  GetMediaListSchema,
  GetMediaList,
  MediaListItem,
  GetMediaDetailSchema,
  GetMediaDetail,
  MediaDetail,
  UpdateMediaSchema,
  UpdateMedia,
  DeleteMediaSchema,
  DeleteMedia,
  GetMediaStatsSchema,
  GetMediaStats,
  MediaStats,
  GetMediaTrendsSchema,
  GetMediaTrends,
  MediaTrendItem,
} from "@repo/shared-types/api/media";
import { ApiResponse, ApiResponseData } from "@repo/shared-types/api/common";
import ResponseBuilder from "@/lib/server/response";
import limitControl from "@/lib/server/rate-limit";
import { headers } from "next/headers";
import { validateData } from "@/lib/server/validator";
import prisma from "@/lib/server/prisma";
import { authVerify } from "@/lib/server/auth-verify";
import { logAuditEvent } from "@/lib/server/audit";
import {
  processImage,
  type ProcessMode,
  SUPPORTED_IMAGE_FORMATS,
} from "@/lib/server/image-processor";
import { uploadObject } from "@/lib/server/oss";
import { generateSignedImageId } from "@/lib/server/image-crypto";
import { getCache, setCache, generateCacheKey } from "@/lib/server/cache";

type ActionEnvironment = "serverless" | "serveraction";
type ActionConfig = { environment?: ActionEnvironment };
type ActionResult<T extends ApiResponseData> =
  | NextResponse<ApiResponse<T>>
  | ApiResponse<T>;

/*
  getMediaList - 获取媒体文件列表
*/
export async function getMediaList(
  params: GetMediaList,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<MediaListItem[] | null>>>;
export async function getMediaList(
  params: GetMediaList,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<MediaListItem[] | null>>;
export async function getMediaList(
  {
    access_token,
    page = 1,
    pageSize = 25,
    sortBy = "createdAt",
    sortOrder = "desc",
    search,
    mediaType,
    userUid,
    sizeMin,
    sizeMax,
    inGallery,
    isOptimized,
    createdAtStart,
    createdAtEnd,
    hasReferences,
  }: GetMediaList,
  serverConfig?: ActionConfig,
): Promise<ActionResult<MediaListItem[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getMediaList"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      mediaType,
      userUid,
      sizeMin,
      sizeMax,
      inGallery,
      isOptimized,
      createdAtStart,
      createdAtEnd,
      hasReferences,
    },
    GetMediaListSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    const skip = (page - 1) * pageSize;

    // 构建查询条件 - 使用更具体的类型
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conditions: Record<string, any>[] = [];

    // AUTHOR 只能查看自己的文件
    if (user.role === "AUTHOR") {
      conditions.push({ userUid: user.uid });
    } else if (userUid) {
      // EDITOR 和 ADMIN 可以筛选指定用户的文件
      conditions.push({ userUid });
    }

    // 搜索条件
    if (search && search.trim()) {
      const searchCondition = {
        OR: [
          {
            originalName: {
              contains: search.trim(),
              mode: "insensitive" as const,
            },
          },
          {
            fileName: {
              contains: search.trim(),
              mode: "insensitive" as const,
            },
          },
          {
            altText: {
              contains: search.trim(),
              mode: "insensitive" as const,
            },
          },
        ],
      };
      conditions.push(searchCondition);
    }

    // 文件类型筛选
    if (mediaType) {
      conditions.push({ mediaType });
    }

    // 文件大小范围
    if (sizeMin !== undefined || sizeMax !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sizeCondition: Record<string, any> = { size: {} };
      if (sizeMin !== undefined) {
        sizeCondition.size.gte = sizeMin;
      }
      if (sizeMax !== undefined) {
        sizeCondition.size.lte = sizeMax;
      }
      conditions.push(sizeCondition);
    }

    // 是否在图库中显示
    if (inGallery !== undefined) {
      conditions.push({ inGallery });
    }

    // 是否已优化
    if (isOptimized !== undefined) {
      conditions.push({ isOptimized });
    }

    // 时间范围筛选
    if (createdAtStart || createdAtEnd) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createdAtCondition: Record<string, any> = { createdAt: {} };
      if (createdAtStart) {
        createdAtCondition.createdAt.gte = new Date(createdAtStart);
      }
      if (createdAtEnd) {
        createdAtCondition.createdAt.lte = new Date(createdAtEnd);
      }
      conditions.push(createdAtCondition);
    }

    // 引用筛选
    if (hasReferences !== undefined) {
      if (hasReferences) {
        // 只显示有引用的
        conditions.push({
          references: {
            some: {},
          },
        });
      } else {
        // 只显示无引用的
        conditions.push({
          references: {
            none: {},
          },
        });
      }
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    // 获取媒体文件列表
    const media = await prisma.media.findMany({
      where,
      skip,
      take: pageSize,
      select: {
        id: true,
        fileName: true,
        originalName: true,
        mimeType: true,
        shortHash: true,
        mediaType: true,
        size: true,
        width: true,
        height: true,
        altText: true,
        blur: true,
        inGallery: true,
        createdAt: true,
        user: {
          select: {
            uid: true,
            username: true,
            nickname: true,
          },
        },
        _count: {
          select: {
            references: true,
          },
        },
      },
      orderBy:
        sortBy === "referencesCount"
          ? [{ references: { _count: sortOrder } }, { id: "desc" }]
          : [{ [sortBy]: sortOrder }, { id: "desc" }],
    });

    // 转换为响应格式
    const mediaList: MediaListItem[] = media.map((item) => ({
      id: item.id,
      fileName: item.fileName,
      originalName: item.originalName,
      mimeType: item.mimeType,
      imageId: generateSignedImageId(item.shortHash), // 生成带签名的12位ID
      shortHash: item.shortHash,
      mediaType: item.mediaType,
      size: item.size,
      width: item.width,
      height: item.height,
      altText: item.altText,
      blur: item.blur,
      inGallery: item.inGallery,
      createdAt: item.createdAt.toISOString(),
      postsCount: item._count.references, // 使用 references 计数
      user: item.user,
    }));

    // 获取总数
    const total = await prisma.media.count({ where });

    return response.ok({
      data: mediaList,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page < Math.ceil(total / pageSize),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("GetMediaList error:", error);
    return response.serverError();
  }
}

/*
  getMediaDetail - 获取媒体文件详情
*/
export async function getMediaDetail(
  params: GetMediaDetail,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<MediaDetail | null>>>;
export async function getMediaDetail(
  params: GetMediaDetail,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<MediaDetail | null>>;
export async function getMediaDetail(
  { access_token, id }: GetMediaDetail,
  serverConfig?: ActionConfig,
): Promise<ActionResult<MediaDetail | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getMediaDetail"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      id,
    },
    GetMediaDetailSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    const media = await prisma.media.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            uid: true,
            username: true,
            nickname: true,
          },
        },
        StorageProvider: {
          select: {
            id: true,
            name: true,
            displayName: true,
          },
        },
        references: {
          select: {
            slot: true,
            postId: true,
            post: {
              select: {
                id: true,
                title: true,
                slug: true,
                deletedAt: true,
              },
            },
            pageId: true,
            page: {
              select: {
                id: true,
                title: true,
                slug: true,
                deletedAt: true,
              },
            },
            tagSlug: true,
            tag: {
              select: {
                slug: true,
                name: true,
              },
            },
            categoryId: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!media) {
      return response.notFound({ message: `媒体文件不存在` });
    }

    // AUTHOR 只能查看自己的文件
    if (user.role === "AUTHOR" && media.userUid !== user.uid) {
      return response.forbidden({ message: "无权限访问此文件" });
    }

    // 按类型分类引用信息
    const postsReferences = media.references
      .filter((ref) => ref.post && !ref.post.deletedAt)
      .map((ref) => ({
        id: ref.post!.id,
        title: ref.post!.title,
        slug: ref.post!.slug,
        slot: ref.slot,
      }));

    const pagesReferences = media.references
      .filter((ref) => ref.page && !ref.page.deletedAt)
      .map((ref) => ({
        id: ref.page!.id,
        title: ref.page!.title,
        slug: ref.page!.slug,
        slot: ref.slot,
      }));

    const tagsReferences = media.references
      .filter((ref) => ref.tag)
      .map((ref) => ({
        slug: ref.tag!.slug,
        name: ref.tag!.name,
        slot: ref.slot,
      }));

    const categoriesReferences = media.references
      .filter((ref) => ref.category)
      .map((ref) => ({
        id: ref.category!.id,
        name: ref.category!.name,
        slug: ref.category!.slug,
        slot: ref.slot,
      }));

    const mediaDetail: MediaDetail = {
      id: media.id,
      fileName: media.fileName,
      originalName: media.originalName,
      mimeType: media.mimeType,
      size: media.size,
      shortHash: media.shortHash,
      imageId: generateSignedImageId(media.shortHash), // 生成带签名的12位ID
      hash: media.hash,
      mediaType: media.mediaType,
      width: media.width,
      height: media.height,
      altText: media.altText,
      blur: media.blur,
      thumbnails: media.thumbnails,
      exif: media.exif,
      inGallery: media.inGallery,
      isOptimized: media.isOptimized,
      storageUrl: media.storageUrl,
      createdAt: media.createdAt.toISOString(),
      storageProviderId: media.storageProviderId,
      user: media.user
        ? {
            uid: media.user.uid,
            username: media.user.username,
            nickname: media.user.nickname,
          }
        : null,
      storageProvider: media.StorageProvider
        ? {
            id: media.StorageProvider.id,
            name: media.StorageProvider.name,
            displayName: media.StorageProvider.displayName,
          }
        : null,
      references: {
        posts: postsReferences,
        pages: pagesReferences,
        tags: tagsReferences,
        categories: categoriesReferences,
      },
    };

    return response.ok({
      data: mediaDetail,
    });
  } catch (error) {
    console.error("GetMediaDetail error:", error);
    return response.serverError();
  }
}

/*
  updateMedia - 更新媒体文件信息
*/
export async function updateMedia(
  params: UpdateMedia,
  serverConfig: { environment: "serverless" },
): Promise<
  NextResponse<
    ApiResponse<{
      id: number;
      originalName: string;
      altText: string | null;
      inGallery: boolean;
      updatedAt: string;
    } | null>
  >
>;
export async function updateMedia(
  params: UpdateMedia,
  serverConfig?: ActionConfig,
): Promise<
  ApiResponse<{
    id: number;
    originalName: string;
    altText: string | null;
    inGallery: boolean;
    updatedAt: string;
  } | null>
>;
export async function updateMedia(
  { access_token, id, originalName, altText, inGallery }: UpdateMedia,
  serverConfig?: ActionConfig,
): Promise<
  ActionResult<{
    id: number;
    originalName: string;
    altText: string | null;
    inGallery: boolean;
    updatedAt: string;
  } | null>
> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "updateMedia"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      id,
      originalName,
      altText,
      inGallery,
    },
    UpdateMediaSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 检查文件是否存在
    const existingMedia = await prisma.media.findUnique({
      where: { id },
      select: {
        id: true,
        originalName: true,
        altText: true,
        inGallery: true,
        userUid: true,
      },
    });

    if (!existingMedia) {
      return response.notFound({ message: `媒体文件不存在` });
    }

    // AUTHOR 只能编辑自己的文件
    if (user.role === "AUTHOR" && existingMedia.userUid !== user.uid) {
      return response.forbidden({ message: "无权限编辑此文件" });
    }

    // 更新媒体文件信息
    const updatedMedia = await prisma.media.update({
      where: { id },
      data: {
        ...(originalName !== undefined ? { originalName } : {}),
        ...(altText !== undefined ? { altText } : {}),
        ...(inGallery !== undefined ? { inGallery } : {}),
      },
    });

    // 记录审计日志
    const auditOldValue: Record<string, string | boolean | null> = {};
    const auditNewValue: Record<string, string | boolean | null> = {};

    if (
      originalName !== undefined &&
      originalName !== existingMedia.originalName
    ) {
      auditOldValue.originalName = existingMedia.originalName;
      auditNewValue.originalName = originalName;
    }
    if (altText !== undefined && altText !== existingMedia.altText) {
      auditOldValue.altText = existingMedia.altText;
      auditNewValue.altText = altText;
    }
    if (inGallery !== undefined && inGallery !== existingMedia.inGallery) {
      auditOldValue.inGallery = existingMedia.inGallery;
      auditNewValue.inGallery = inGallery;
    }

    if (Object.keys(auditNewValue).length > 0) {
      const { after } = await import("next/server");
      after(async () => {
        await logAuditEvent({
          user: {
            uid: String(user.uid),
          },
          details: {
            action: "UPDATE_MEDIA",
            resourceType: "Media",
            resourceId: String(id),
            value: {
              old: auditOldValue,
              new: auditNewValue,
            },
            description: "更新媒体文件信息",
          },
        });
      });
    }

    return response.ok({
      data: {
        id: updatedMedia.id,
        originalName: updatedMedia.originalName,
        altText: updatedMedia.altText,
        inGallery: updatedMedia.inGallery,
        updatedAt: new Date().toISOString(), // 使用当前时间作为更新时间
      },
      message: "媒体文件信息更新成功",
    });
  } catch (error) {
    console.error("UpdateMedia error:", error);
    return response.serverError();
  }
}

/*
  deleteMedia - 批量删除媒体文件
*/
export async function deleteMedia(
  params: DeleteMedia,
  serverConfig: { environment: "serverless" },
): Promise<
  NextResponse<ApiResponse<{ deleted: number; ids: number[] } | null>>
>;
export async function deleteMedia(
  params: DeleteMedia,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<{ deleted: number; ids: number[] } | null>>;
export async function deleteMedia(
  { access_token, ids }: DeleteMedia,
  serverConfig?: ActionConfig,
): Promise<ActionResult<{ deleted: number; ids: number[] } | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "deleteMedia"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      ids,
    },
    DeleteMediaSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 获取要删除的文件信息用于权限检查和审计日志
    const mediaToDelete = await prisma.media.findMany({
      where: {
        id: { in: ids },
      },
      select: {
        id: true,
        originalName: true,
        userUid: true,
      },
    });

    if (mediaToDelete.length === 0) {
      return response.notFound({ message: "没有找到可删除的媒体文件" });
    }

    // 权限检查：AUTHOR 只能删除自己的文件
    let deletableIds: number[] = [];
    if (user.role === "AUTHOR") {
      deletableIds = mediaToDelete
        .filter((media) => media.userUid === user.uid)
        .map((media) => media.id);

      if (deletableIds.length === 0) {
        return response.forbidden({ message: "没有权限删除这些文件" });
      }
    } else {
      deletableIds = ids;
    }

    // 删除媒体文件（Prisma 会自动处理关系）
    const result = await prisma.media.deleteMany({
      where: {
        id: {
          in: deletableIds,
        },
      },
    });

    // 记录审计日志
    const { after } = await import("next/server");
    after(async () => {
      await logAuditEvent({
        user: {
          uid: String(user.uid),
        },
        details: {
          action: "DELETE_MEDIA",
          resourceType: "Media",
          resourceId: deletableIds.join(", "),
          value: {
            old: {
              ids: deletableIds,
              files: mediaToDelete
                .filter((m) => deletableIds.includes(m.id))
                .map((m) => m.originalName),
            },
            new: null,
          },
          description: "删除媒体文件",
        },
      });
    });

    return response.ok({
      data: {
        deleted: result.count,
        ids: deletableIds,
      },
      message: `成功删除 ${result.count} 个媒体文件`,
    });
  } catch (error) {
    console.error("DeleteMedia error:", error);
    return response.serverError();
  }
}

/*
  getMediaStats - 获取媒体文件统计信息
*/
export async function getMediaStats(
  params: GetMediaStats,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<MediaStats | null>>>;
export async function getMediaStats(
  params: GetMediaStats,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<MediaStats | null>>;
export async function getMediaStats(
  { access_token, days = 30, force = false }: GetMediaStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<MediaStats | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getMediaStats"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      days,
      force,
    },
    GetMediaStatsSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    const CACHE_KEY = generateCacheKey("stats", "media", String(days));
    const CACHE_TTL = 60 * 60; // 1小时

    // 如果不是强制刷新，尝试从缓存获取
    if (!force) {
      const cachedData = await getCache<MediaStats>(CACHE_KEY, {
        ttl: CACHE_TTL,
      });

      if (cachedData) {
        return response.ok({
          data: cachedData,
        });
      }
    }

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 获取总体统计
    const [totalStats, typeStats] = await Promise.all([
      // 总文件数和总大小
      prisma.media.aggregate({
        _count: { id: true },
        _sum: { size: true },
      }),
      // 按类型统计
      prisma.media.groupBy({
        by: ["mediaType"],
        _count: { id: true },
        _sum: { size: true },
      }),
    ]);

    // 获取每日统计
    const dailyStats = (await prisma.$queryRaw`
      SELECT
        DATE("createdAt") as date,
        COUNT(*) as total_files,
        COUNT(*) FILTER (WHERE "createdAt" >= ${startDate}) as new_files,
        COALESCE(SUM("size"), 0) as total_size
      FROM "Media"
      WHERE "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
    `) as Array<{
      date: string;
      total_files: number;
      new_files: number;
      total_size: number;
    }>;

    // 构建类型分布（确保数字类型）
    const typeDistribution = typeStats.map((stat) => ({
      type: stat.mediaType as "IMAGE" | "VIDEO" | "AUDIO" | "FILE",
      count: Number(stat._count.id),
      size: Number(stat._sum.size || 0),
    }));

    // 构建每日统计（确保按日期顺序，确保数字类型）
    const formattedDailyStats = dailyStats.reverse().map((stat) => ({
      date: stat.date,
      totalFiles: Number(stat.total_files),
      newFiles: Number(stat.new_files),
      totalSize: Number(stat.total_size),
    }));

    const mediaStats: MediaStats = {
      updatedAt: now.toISOString(),
      cache: false,
      totalFiles: Number(totalStats._count.id),
      totalSize: Number(totalStats._sum.size || 0),
      typeDistribution,
      dailyStats: formattedDailyStats,
    };

    // 保存到缓存（缓存1小时）
    const cacheData = { ...mediaStats, cache: true };
    const { after } = await import("next/server");
    after(async () => {
      await setCache(CACHE_KEY, cacheData, {
        ttl: CACHE_TTL,
      });
    });

    return response.ok({
      data: mediaStats,
    });
  } catch (error) {
    console.error("GetMediaStats error:", error);
    return response.serverError();
  }
}

/*
  getMediaTrends - 获取媒体文件趋势数据
*/
export async function getMediaTrends(
  params: GetMediaTrends,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<MediaTrendItem[] | null>>>;
export async function getMediaTrends(
  params: GetMediaTrends,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<MediaTrendItem[] | null>>;
export async function getMediaTrends(
  { access_token, days = 30, count = 30 }: GetMediaTrends,
  serverConfig?: ActionConfig,
): Promise<ActionResult<MediaTrendItem[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getMediaTrends"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      days,
      count,
    },
    GetMediaTrendsSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 获取每日新增文件统计
    const dailyTrends = (await prisma.$queryRaw`
      WITH daily_counts AS (
        SELECT
          DATE("createdAt") as date,
          COUNT(*) as new_files
        FROM "Media"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
      ),
      cumulative_counts AS (
        SELECT
          date,
          new_files,
          SUM(new_files) OVER (ORDER BY date ASC) as total_files
        FROM daily_counts
        ORDER BY date ASC
        LIMIT ${count}
      )
      SELECT
        date as time,
        new_files,
        total_files
      FROM cumulative_counts
      ORDER BY time ASC
    `) as Array<{
      time: string;
      new_files: number;
      total_files: number;
    }>;

    // 转换为响应格式（确保数字类型和完整 ISO 时间字符串）
    const trends: MediaTrendItem[] = dailyTrends.map((trend) => {
      const date = new Date(trend.time);
      // 返回完整 ISO 8601 时间戳（标准化格式）
      return {
        time: date.toISOString(),
        data: {
          total: Number(trend.total_files),
          new: Number(trend.new_files),
        },
      };
    });

    return response.ok({
      data: trends,
    });
  } catch (error) {
    console.error("GetMediaTrends error:", error);
    return response.serverError();
  }
}

// ============================================================================
// 上传媒体文件
// ============================================================================

export interface UploadMediaFile {
  /** 文件 buffer */
  buffer: Buffer;
  /** 原始文件名 */
  originalName: string;
  /** MIME 类型 */
  mimeType: string;
  /** 原始文件大小 */
  originalSize: number;
}

export interface UploadMediaParams {
  /** 访问令牌 */
  access_token: string;
  /** 文件列表 */
  files: UploadMediaFile[];
  /** 处理模式 */
  mode: ProcessMode;
  /** 存储提供商 ID（可选，不传则使用默认） */
  storageProviderId?: string;
}

export interface UploadMediaResult {
  /** 媒体 ID */
  id: number;
  /** 原始文件名 */
  originalName: string;
  /** 短哈希 */
  shortHash: string;
  /** 图片 ID（用于访问） */
  imageId: string;
  /** 访问 URL */
  url: string;
  /** 原始文件大小 */
  originalSize: number;
  /** 处理后文件大小 */
  processedSize: number;
  /** 是否为去重复用 */
  isDuplicate: boolean;
  /** 宽度 */
  width: number | null;
  /** 高度 */
  height: number | null;
}

/**
 * 上传媒体文件（批量）
 */
export async function uploadMedia(
  params: UploadMediaParams,
  serverConfig?: ActionConfig,
): Promise<ActionResult<UploadMediaResult[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "uploadMedia"))) {
    return response.tooManyRequests();
  }

  const { access_token, files, mode, storageProviderId } = params;

  // 验证参数
  if (!files || files.length === 0) {
    return response.badRequest({
      message: "请至少上传一个文件",
      error: { code: "NO_FILES", message: "文件列表为空" },
    });
  }

  if (!["lossy", "lossless", "original"].includes(mode)) {
    return response.badRequest({
      message: "无效的处理模式",
      error: {
        code: "INVALID_MODE",
        message: `处理模式必须为 lossy/lossless/original`,
      },
    });
  }

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 获取存储提供商
    const storageProvider = storageProviderId
      ? await prisma.storageProvider.findUnique({
          where: { id: storageProviderId, isActive: true },
        })
      : await prisma.storageProvider.findFirst({
          where: { isDefault: true, isActive: true },
        });

    if (!storageProvider) {
      return response.badRequest({
        message: "未找到可用的存储提供商",
        error: { code: "NO_STORAGE", message: "请先配置存储提供商" },
      });
    }

    const results: UploadMediaResult[] = [];

    // 处理每个文件
    for (const file of files) {
      try {
        // 验证文件类型
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!SUPPORTED_IMAGE_FORMATS.includes(file.mimeType as any)) {
          console.warn(
            `跳过不支持的文件类型: ${file.originalName} (${file.mimeType})`,
          );
          continue;
        }

        // 验证文件大小
        if (file.originalSize > storageProvider.maxFileSize) {
          console.warn(
            `跳过超大文件: ${file.originalName} (${file.originalSize} > ${storageProvider.maxFileSize})`,
          );
          continue;
        }

        // 处理图片
        const processed = await processImage(
          file.buffer,
          file.originalName,
          file.mimeType,
          mode,
        );

        // 检查去重
        const existingMedia = await prisma.media.findFirst({
          where: { hash: processed.hash },
          select: {
            id: true,
            originalName: true,
            shortHash: true,
            storageUrl: true,
            width: true,
            height: true,
            size: true,
          },
        });

        if (existingMedia) {
          // 文件已存在，直接返回现有记录
          const imageId = generateSignedImageId(existingMedia.shortHash);
          results.push({
            id: existingMedia.id,
            originalName: existingMedia.originalName,
            shortHash: existingMedia.shortHash,
            imageId,
            url: `/p/${imageId}`,
            originalSize: file.originalSize,
            processedSize: existingMedia.size,
            isDuplicate: true,
            width: existingMedia.width,
            height: existingMedia.height,
          });
          continue;
        }

        // 上传到 OSS
        const fileName = `${processed.shortHash}.${processed.extension}`;
        // 确保存储类型不是 EXTERNAL_URL（不支持上传）
        if (storageProvider.type === "EXTERNAL_URL") {
          console.warn(
            `跳过文件 ${file.originalName}: EXTERNAL_URL 类型不支持上传`,
          );
          continue;
        }
        const uploadResult = await uploadObject({
          type: storageProvider.type as Exclude<
            typeof storageProvider.type,
            "EXTERNAL_URL"
          >,
          baseUrl: storageProvider.baseUrl,
          pathTemplate: storageProvider.pathTemplate,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          config: storageProvider.config as any,
          file: {
            buffer: processed.buffer,
            filename: fileName,
            contentType: processed.mimeType,
          },
        });

        // 保存到数据库
        const media = await prisma.media.create({
          data: {
            fileName,
            originalName: file.originalName,
            mimeType: processed.mimeType,
            size: processed.size,
            shortHash: processed.shortHash,
            hash: processed.hash,
            mediaType: "IMAGE",
            width: processed.width,
            height: processed.height,
            blur: processed.blur,
            thumbnails: {},
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            exif: processed.exif as any, // Prisma JsonValue 类型转换
            inGallery: false,
            isOptimized: mode !== "original",
            storageUrl: uploadResult.url,
            storageProviderId: storageProvider.id,
            userUid: user.uid,
          },
        });

        // 记录审计日志
        const { after } = await import("next/server");
        after(async () => {
          await logAuditEvent({
            user: {
              uid: String(user.uid),
            },
            details: {
              action: "UPLOAD_MEDIA",
              resourceType: "Media",
              resourceId: String(media.id),
              value: {
                old: null,
                new: {
                  fileName: media.fileName,
                  originalName: media.originalName,
                  mode,
                  originalSize: file.originalSize,
                  processedSize: processed.size,
                },
              },
              description: `上传图片: ${file.originalName} (模式: ${mode})`,
            },
          });
        });

        const imageId = generateSignedImageId(processed.shortHash);
        results.push({
          id: media.id,
          originalName: media.originalName,
          shortHash: media.shortHash,
          imageId,
          url: `/p/${imageId}`,
          originalSize: file.originalSize,
          processedSize: processed.size,
          isDuplicate: false,
          width: media.width,
          height: media.height,
        });
      } catch (fileError) {
        console.error(`处理文件失败: ${file.originalName}`, fileError);
        // 继续处理下一个文件
      }
    }

    if (results.length === 0) {
      return response.badRequest({
        message: "没有成功上传的文件",
        error: { code: "NO_SUCCESS", message: "所有文件都处理失败" },
      });
    }

    return response.ok({
      data: results,
      message: `成功上传 ${results.length} 个文件`,
    });
  } catch (error) {
    console.error("UploadMedia error:", error);
    return response.serverError();
  }
}

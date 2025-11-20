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
import limitControl from "@/lib/server/rateLimit";
import { headers } from "next/headers";
import { validateData } from "@/lib/server/validator";
import prisma from "@/lib/server/prisma";
import { authVerify } from "@/lib/server/auth-verify";
import { logAuditEvent } from "./audit";
import { getClientIP, getClientUserAgent } from "@/lib/server/getClientInfo";

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
  }: GetMediaList,
  serverConfig?: ActionConfig,
): Promise<ActionResult<MediaListItem[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
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
        size: true,
        shortHash: true,
        mediaType: true,
        width: true,
        height: true,
        altText: true,
        inGallery: true,
        isOptimized: true,
        createdAt: true,
        user: {
          select: {
            uid: true,
            username: true,
            nickname: true,
          },
        },
      },
      orderBy: [{ [sortBy]: sortOrder }, { id: "desc" }],
    });

    // 转换为响应格式
    const mediaList: MediaListItem[] = media.map((item) => ({
      id: item.id,
      fileName: item.fileName,
      originalName: item.originalName,
      mimeType: item.mimeType,
      size: item.size,
      shortHash: item.shortHash,
      mediaType: item.mediaType,
      width: item.width,
      height: item.height,
      altText: item.altText,
      inGallery: item.inGallery,
      isOptimized: item.isOptimized,
      createdAt: item.createdAt.toISOString(),
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

  if (!(await limitControl(await headers()))) {
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
      },
    });

    if (!media) {
      return response.notFound({ message: `媒体文件不存在` });
    }

    // AUTHOR 只能查看自己的文件
    if (user.role === "AUTHOR" && media.userUid !== user.uid) {
      return response.forbidden({ message: "无权限访问此文件" });
    }

    const mediaDetail: MediaDetail = {
      id: media.id,
      fileName: media.fileName,
      originalName: media.originalName,
      mimeType: media.mimeType,
      size: media.size,
      shortHash: media.shortHash,
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

  if (!(await limitControl(await headers()))) {
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
    await logAuditEvent({
      user: {
        uid: String(user.uid),
        ipAddress: (await getClientIP()) || "Unknown",
        userAgent: (await getClientUserAgent()) || "Unknown",
      },
      details: {
        action: "UPDATE_MEDIA",
        resourceType: "Media",
        resourceId: String(id),
        vaule: {
          old: {
            originalName: existingMedia.originalName,
            altText: existingMedia.altText,
            inGallery: existingMedia.inGallery,
          },
          new: {
            originalName: updatedMedia.originalName,
            altText: updatedMedia.altText,
            inGallery: updatedMedia.inGallery,
          },
        },
        description: "更新媒体文件信息",
      },
    });

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

  if (!(await limitControl(await headers()))) {
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
    await logAuditEvent({
      user: {
        uid: String(user.uid),
        ipAddress: (await getClientIP()) || "Unknown",
        userAgent: (await getClientUserAgent()) || "Unknown",
      },
      details: {
        action: "DELETE_MEDIA",
        resourceType: "Media",
        resourceId: deletableIds.join(", "),
        vaule: {
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
  { access_token, days = 30 }: GetMediaStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<MediaStats | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      days,
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

    // 构建类型分布
    const typeDistribution = typeStats.map((stat) => ({
      type: stat.mediaType as "IMAGE" | "VIDEO" | "AUDIO" | "FILE",
      count: stat._count.id,
      size: stat._sum.size || 0,
    }));

    // 构建每日统计（确保按日期顺序）
    const formattedDailyStats = dailyStats.reverse().map((stat) => ({
      date: stat.date,
      totalFiles: stat.total_files,
      newFiles: stat.new_files,
      totalSize: stat.total_size,
    }));

    const mediaStats: MediaStats = {
      totalFiles: totalStats._count.id,
      totalSize: totalStats._sum.size || 0,
      typeDistribution,
      dailyStats: formattedDailyStats,
    };

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

  if (!(await limitControl(await headers()))) {
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

    // 转换为响应格式
    const trends: MediaTrendItem[] = dailyTrends.map((trend) => ({
      time: trend.time,
      data: {
        total: trend.total_files,
        new: trend.new_files,
      },
    }));

    return response.ok({
      data: trends,
    });
  } catch (error) {
    console.error("GetMediaTrends error:", error);
    return response.serverError();
  }
}

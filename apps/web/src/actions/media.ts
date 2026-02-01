"use server";
import type {
  ApiResponse,
  ApiResponseData,
} from "@repo/shared-types/api/common";
import type {
  BatchUpdateMedia,
  DeleteMedia,
  GallerySize,
  GetMediaDetail,
  GetMediaList,
  GetMediaStats,
  GetMediaTrends,
  MediaDetail,
  MediaListItem,
  MediaStats,
  MediaTrendItem,
  UpdateMedia,
} from "@repo/shared-types/api/media";
import {
  BatchUpdateMediaSchema,
  DeleteMediaSchema,
  GetMediaDetailSchema,
  GetMediaListSchema,
  GetMediaStatsSchema,
  GetMediaTrendsSchema,
  UpdateMediaSchema,
} from "@repo/shared-types/api/media";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import type { NextResponse } from "next/server";

import { parseExifBuffer } from "@/lib/client/media-exif";
import type { GalleryPhoto } from "@/lib/gallery-layout";
import { logAuditEvent } from "@/lib/server/audit";
import { authVerify } from "@/lib/server/auth-verify";
import { generateCacheKey, getCache, setCache } from "@/lib/server/cache";
import { generateSignedImageId } from "@/lib/server/image-crypto";
import { type ProcessMode } from "@/lib/server/image-processor";
import { getGalleryPhotosData } from "@/lib/server/media";
import prisma from "@/lib/server/prisma";
import limitControl from "@/lib/server/rate-limit";
import ResponseBuilder from "@/lib/server/response";
import { slugify } from "@/lib/server/slugify";
import { validateData } from "@/lib/server/validator";

type ActionEnvironment = "serverless" | "serveraction";
// ... (rest of the type definitions)

/**
 * 内部辅助函数：从 Media 记录中提取拍摄时间
 */
function extractShotAtFromMedia(exif: unknown): Date | null {
  if (!exif || typeof exif !== "object") return null;

  const exifObj = exif as Record<string, unknown>;
  if (!exifObj.raw) return null;

  const raw = exifObj.raw as Record<string, unknown>;

  try {
    // Prisma 的 Json 字段会将 Buffer 序列化为 { type: 'Buffer', data: [...] }
    let buffer: Buffer;
    if (Buffer.isBuffer(raw)) {
      buffer = raw as unknown as Buffer;
    } else if (
      raw &&
      typeof raw === "object" &&
      raw.type === "Buffer" &&
      Array.isArray(raw.data)
    ) {
      buffer = Buffer.from(raw.data as number[]);
    } else {
      return null;
    }

    const parsed = parseExifBuffer(buffer);
    return parsed?.dateTimeOriginal || parsed?.dateTime || null;
  } catch (error) {
    console.error("Failed to extract shotAt from exif:", error);
    return null;
  }
}
type ActionConfig = { environment?: ActionEnvironment };
type ActionResult<T extends ApiResponseData> =
  | NextResponse<ApiResponse<T>>
  | ApiResponse<T>;

/*
  getGalleryPhotos - 获取画廊照片列表（公开）
*/
export async function getGalleryPhotos(
  params: { cursorId?: number },
  serverConfig: { environment: "serverless" },
): Promise<
  NextResponse<
    ApiResponse<{ photos: GalleryPhoto[]; nextCursor?: number } | null>
  >
>;
export async function getGalleryPhotos(
  params?: { cursorId?: number },
  serverConfig?: ActionConfig,
): Promise<ApiResponse<{ photos: GalleryPhoto[]; nextCursor?: number } | null>>;
export async function getGalleryPhotos(
  params: { cursorId?: number } = {},
  serverConfig?: ActionConfig,
): Promise<
  ActionResult<{ photos: GalleryPhoto[]; nextCursor?: number } | null>
> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  // Server Action 仍然需要速率限制
  if (!(await limitControl(await headers(), "getGalleryPhotos"))) {
    return response.tooManyRequests();
  }

  try {
    const data = await getGalleryPhotosData(params);
    return response.ok({ data });
  } catch (error) {
    console.error("GetGalleryPhotos error:", error);
    return response.serverError();
  }
}

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

    // 是否在图库中显示 (使用 galleryPhoto 关系判断)
    if (inGallery !== undefined) {
      if (inGallery) {
        conditions.push({ galleryPhoto: { isNot: null } });
      } else {
        conditions.push({ galleryPhoto: { is: null } });
      }
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
        galleryPhoto: {
          select: {
            id: true,
          },
        },
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
      inGallery: item.galleryPhoto !== null, // 根据 galleryPhoto 是否存在判断
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
        galleryPhoto: true, // 获取图库信息
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
      inGallery: media.galleryPhoto !== null,
      galleryPhoto: media.galleryPhoto
        ? {
            ...media.galleryPhoto,
            createdAt: media.galleryPhoto.createdAt.toISOString(),
            updatedAt: media.galleryPhoto.updatedAt.toISOString(),
            shotAt: media.galleryPhoto.shotAt?.toISOString() || null,
            sortTime: media.galleryPhoto.sortTime.toISOString(),
          }
        : null,
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
  {
    access_token,
    id,
    originalName,
    altText,
    inGallery,
    name,
    slug,
    description,
    gallerySize,
    showExif,
    hideGPS,
    overrideExif,
  }: UpdateMedia,
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
      name,
      slug,
      description,
      gallerySize,
      showExif,
      hideGPS,
      overrideExif,
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
      include: {
        galleryPhoto: true,
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
    const updateData: Record<string, unknown> = {
      ...(originalName !== undefined ? { originalName } : {}),
      ...(altText !== undefined ? { altText } : {}),
    };

    // 1. 如果用户指定了 slug，检查唯一性
    if (slug) {
      const collision = await prisma.photo.findUnique({
        where: { slug },
        select: { mediaId: true },
      });
      if (collision && collision.mediaId !== id) {
        return response.badRequest({
          message: "Slug 已被占用，请更换一个",
          error: { code: "SLUG_EXISTS", message: "Slug 已被占用" },
        });
      }
    }

    // 处理图库信息
    if (inGallery !== undefined) {
      if (inGallery) {
        // 如果开启图库显示，upsert GalleryPhoto

        // 提取拍摄时间
        const extractedShotAt = extractShotAtFromMedia(existingMedia.exif);

        // 计算 Photo Name (去除后缀)
        let photoName = name;
        if (!photoName) {
          const sourceName = originalName || existingMedia.originalName;
          const lastDotIndex = sourceName.lastIndexOf(".");
          photoName =
            lastDotIndex > 0
              ? sourceName.substring(0, lastDotIndex)
              : sourceName;
        }
        photoName = photoName || "Untitled";

        // 计算 Photo Slug
        let photoSlug = slug;
        if (!photoSlug) {
          const baseSlug = (await slugify(photoName)) || "photo";
          if (!existingMedia.galleryPhoto) {
            // 新增且未指定 slug，检查冲突
            const collision = await prisma.photo.findUnique({
              where: { slug: baseSlug },
              select: { id: true },
            });
            photoSlug = collision ? `${baseSlug}-${id}` : baseSlug;
          } else {
            // 更新且未指定 slug，upsert.create 需要一个值（虽然不会被使用）
            photoSlug = baseSlug;
          }
        }

        updateData.galleryPhoto = {
          upsert: {
            create: {
              slug: photoSlug,
              name: photoName,
              description: description || null,
              size: (gallerySize as GallerySize) || "AUTO",
              showExif: showExif ?? true,
              hideGPS: hideGPS ?? true,
              overrideExif: overrideExif ?? undefined,
              shotAt: extractedShotAt,
              sortTime: extractedShotAt || new Date(),
            },
            update: {
              // 只有提供了相应字段时才更新
              ...(slug ? { slug } : {}),
              ...(name ? { name } : {}),
              ...(description !== undefined ? { description } : {}),
              ...(gallerySize ? { size: gallerySize as GallerySize } : {}),
              ...(showExif !== undefined ? { showExif } : {}),
              ...(hideGPS !== undefined ? { hideGPS } : {}),
              ...(overrideExif !== undefined ? { overrideExif } : {}),
              // 如果是从非图库状态转为图库状态，或者显式提供了拍摄时间相关信息（目前还没开放显式设置 shotAt）
              // 自动更新一次时间
              ...(!existingMedia.galleryPhoto
                ? {
                    shotAt: extractedShotAt,
                    sortTime: extractedShotAt || new Date(),
                  }
                : {}),
            },
          },
        };
      } else {
        // 如果关闭图库显示，删除 GalleryPhoto
        updateData.galleryPhoto = {
          delete: existingMedia.galleryPhoto ? true : undefined,
        };
        // 如果没有关联照片，delete: true 会报错吗？prisma delete: true for optional one-to-one expects relation to exist?
        // 文档说: If the record does not exist, the operation will fail.
        // 所以我们只在 existingMedia.galleryPhoto 存在时才添加 delete 指令
        if (!existingMedia.galleryPhoto) {
          delete updateData.galleryPhoto;
        }
      }
    } else if (existingMedia.galleryPhoto) {
      // 如果 inGallery 未定义，但存在图库照片，且有图库相关字段更新
      if (
        name ||
        slug ||
        description !== undefined ||
        gallerySize ||
        showExif !== undefined ||
        hideGPS !== undefined ||
        overrideExif !== undefined
      ) {
        updateData.galleryPhoto = {
          update: {
            ...(slug ? { slug } : {}),
            ...(name ? { name } : {}),
            ...(description !== undefined ? { description } : {}),
            ...(gallerySize ? { size: gallerySize as GallerySize } : {}),
            ...(showExif !== undefined ? { showExif } : {}),
            ...(hideGPS !== undefined ? { hideGPS } : {}),
            ...(overrideExif !== undefined ? { overrideExif } : {}),
          },
        };
      }
    }

    const updatedMedia = await prisma.media.update({
      where: { id },
      data: updateData,
      include: {
        galleryPhoto: true,
      },
    });

    // 记录审计日志
    const auditOldValue: Record<string, string | boolean | null | object> = {};
    const auditNewValue: Record<string, string | boolean | null | object> = {};

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
    if (inGallery !== undefined) {
      updateTag("photos");
      auditOldValue.inGallery = !!existingMedia.galleryPhoto;
      auditNewValue.inGallery = inGallery;
    }

    // 记录图库相关变更
    if (updateData.galleryPhoto) {
      auditNewValue.galleryPhotoChange = true;
    }

    const oldSlug = existingMedia.galleryPhoto?.slug;
    const newSlug = updatedMedia.galleryPhoto?.slug;

    if (Object.keys(auditNewValue).length > 0) {
      const { after } = await import("next/server");
      after(async () => {
        // 更新特定照片的缓存
        if (oldSlug) updateTag(`photos/${oldSlug}`);
        if (newSlug && newSlug !== oldSlug) updateTag(`photos/${newSlug}`);

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
        inGallery: !!updatedMedia.galleryPhoto,
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
  batchUpdateMedia - 批量更新媒体文件
*/
export async function batchUpdateMedia(
  params: BatchUpdateMedia,
  serverConfig: { environment: "serverless" },
): Promise<
  NextResponse<ApiResponse<{ updated: number; ids: number[] } | null>>
>;
export async function batchUpdateMedia(
  params: BatchUpdateMedia,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<{ updated: number; ids: number[] } | null>>;
export async function batchUpdateMedia(
  { access_token, ids, inGallery, isOptimized }: BatchUpdateMedia,
  serverConfig?: ActionConfig,
): Promise<ActionResult<{ updated: number; ids: number[] } | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "batchUpdateMedia"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      ids,
      inGallery,
      isOptimized,
    },
    BatchUpdateMediaSchema,
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
    // 获取要更新的文件信息用于权限检查
    const mediaToUpdate = await prisma.media.findMany({
      where: {
        id: { in: ids },
      },
      select: {
        id: true,
        userUid: true,
        originalName: true,
        exif: true,
        galleryPhoto: {
          select: {
            id: true,
            slug: true,
          },
        },
      },
    });

    if (mediaToUpdate.length === 0) {
      return response.notFound({ message: "没有找到可更新的媒体文件" });
    }

    // 权限检查：AUTHOR 只能更新自己的文件
    let updatableMedia = mediaToUpdate;
    if (user.role === "AUTHOR") {
      updatableMedia = mediaToUpdate.filter(
        (media) => media.userUid === user.uid,
      );

      if (updatableMedia.length === 0) {
        return response.forbidden({ message: "没有权限更新这些文件" });
      }
    }

    const updatableIds = updatableMedia.map((m) => m.id);

    // 执行更新
    await prisma.$transaction(async (tx) => {
      // 1. 更新普通字段 (isOptimized)
      if (isOptimized !== undefined) {
        await tx.media.updateMany({
          where: {
            id: { in: updatableIds },
          },
          data: {
            isOptimized,
          },
        });
      }

      // 2. 处理 inGallery
      if (inGallery !== undefined) {
        if (inGallery) {
          // 批量添加到图库
          // 找出还没有 galleryPhoto 的 media
          const mediaWithoutGallery = updatableMedia.filter(
            (m) => !m.galleryPhoto,
          );

          if (mediaWithoutGallery.length > 0) {
            // 准备数据候选集（异步处理 slug 生成）
            const candidates = await Promise.all(
              mediaWithoutGallery.map(async (media) => {
                // 去除后缀名
                const lastDotIndex = media.originalName.lastIndexOf(".");
                const nameWithoutExt =
                  lastDotIndex > 0 // 确保不是隐藏文件（如 .gitignore）且有后缀
                    ? media.originalName.substring(0, lastDotIndex)
                    : media.originalName;

                const cleanName = nameWithoutExt || "Untitled";
                const baseSlug = (await slugify(cleanName)) || "photo";

                return {
                  media,
                  name: cleanName,
                  baseSlug,
                };
              }),
            );

            // 检查数据库中已存在的 slug
            const baseSlugs = candidates.map((c) => c.baseSlug);
            const existingPhotos = await tx.photo.findMany({
              where: {
                slug: { in: baseSlugs },
              },
              select: { slug: true },
            });
            const existingSlugSet = new Set(existingPhotos.map((p) => p.slug));
            const usedSlugsInBatch = new Set<string>();

            await tx.photo.createMany({
              data: candidates.map((c) => {
                let slug = c.baseSlug;
                // 如果 slug 已存在于数据库或当前批次中，追加 ID
                if (existingSlugSet.has(slug) || usedSlugsInBatch.has(slug)) {
                  slug = `${slug}-${c.media.id}`;
                }
                usedSlugsInBatch.add(slug);

                // 提取拍摄时间
                const extractedShotAt = extractShotAtFromMedia(c.media.exif);

                return {
                  mediaId: c.media.id,
                  slug,
                  name: c.name,
                  size: "AUTO",
                  showExif: true,
                  hideGPS: true,
                  shotAt: extractedShotAt,
                  sortTime: extractedShotAt || new Date(),
                };
              }),
            });
          }
        } else {
          // 批量从图库移除
          await tx.photo.deleteMany({
            where: {
              mediaId: { in: updatableIds },
            },
          });
        }
      }
    });

    // 记录审计日志
    const { after } = await import("next/server");
    if (inGallery !== undefined) {
      updateTag("photos");
    }
    after(async () => {
      // 如果是从图库移除，需要更新对应照片页面的缓存
      if (inGallery === false) {
        updatableMedia.forEach((media) => {
          if (media.galleryPhoto?.slug) {
            updateTag(`photos/${media.galleryPhoto.slug}`);
          }
        });
      }

      await logAuditEvent({
        user: {
          uid: String(user.uid),
        },
        details: {
          action: "BATCH_UPDATE_MEDIA",
          resourceType: "Media",
          resourceId: updatableIds.join(", "),
          value: {
            old: null,
            new: {
              count: updatableIds.length,
              inGallery,
              isOptimized,
            },
          },
          description: `批量更新 ${updatableIds.length} 个媒体文件`,
        },
      });
    });

    return response.ok({
      data: {
        updated: updatableIds.length,
        ids: updatableIds,
      },
      message: `成功更新 ${updatableIds.length} 个媒体文件`,
    });
  } catch (error) {
    console.error("BatchUpdateMedia error:", error);
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
        galleryPhoto: {
          select: { id: true, slug: true },
        },
      },
    });

    if (mediaToDelete.length === 0) {
      return response.notFound({ message: "没有找到可删除的媒体文件" });
    }

    // 权限检查：AUTHOR 只能删除自己的文件
    let deletableIds: number[] = [];
    let hasPhotosInBatch = false;
    if (user.role === "AUTHOR") {
      const deletableMedia = mediaToDelete.filter(
        (media) => media.userUid === user.uid,
      );
      deletableIds = deletableMedia.map((media) => media.id);
      hasPhotosInBatch = deletableMedia.some((m) => !!m.galleryPhoto);

      if (deletableIds.length === 0) {
        return response.forbidden({ message: "没有权限删除这些文件" });
      }
    } else {
      deletableIds = ids;
      hasPhotosInBatch = mediaToDelete.some((m) => !!m.galleryPhoto);
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
    if (hasPhotosInBatch) {
      updateTag("photos");
    }
    after(async () => {
      // 刷新被删除照片的页面缓存
      mediaToDelete.forEach((media) => {
        if (deletableIds.includes(media.id) && media.galleryPhoto?.slug) {
          updateTag(`photos/${media.galleryPhoto.slug}`);
        }
      });

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
    const CACHE_KEY = generateCacheKey("stat", "media", String(days));
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

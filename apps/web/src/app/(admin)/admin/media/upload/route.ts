import { NextRequest } from "next/server";
import ResponseBuilder from "@/lib/server/response";
import { authVerify } from "@/lib/server/auth-verify";
import {
  processImage,
  SUPPORTED_IMAGE_FORMATS,
  type ProcessMode,
} from "@/lib/server/image-processor";
import { uploadObject } from "@/lib/server/oss";
import { generateSignedImageId } from "@/lib/server/image-crypto";
import prisma from "@/lib/server/prisma";
import limitControl from "@/lib/server/rate-limit";
import { logAuditEvent } from "@/lib/server/audit";
import { getClientIP, getClientUserAgent } from "@/lib/server/get-client-info";
import { getOrCreateVirtualStorage } from "@/lib/server/virtual-storage";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /admin/media/upload:
 *   post:
 *     summary: 上传单个媒体文件
 *     description: 上传单个图片文件，支持多种处理模式
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               mode:
 *                 type: string
 *                 enum: [lossy, lossless, original]
 *                 default: lossy
 *               storageProviderId:
 *                 type: string
 *                 description: 存储提供商ID（可选）
 *     responses:
 *       200:
 *         description: 上传成功
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       429:
 *         description: 请求过于频繁
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // 速率限制
    if (!(await limitControl(request.headers))) {
      return response.tooManyRequests() as Response;
    }

    // 获取 access_token（从 header 或 cookie）
    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : request.cookies.get("ACCESS_TOKEN")?.value;

    if (!accessToken) {
      return response.unauthorized({
        message: "未提供访问令牌",
      }) as Response;
    }

    // 身份验证
    const user = await authVerify({
      allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
      accessToken,
    });

    if (!user) {
      return response.unauthorized() as Response;
    }

    // 解析 multipart/form-data
    const formData = await request.formData();
    const mode = (formData.get("mode") as string) || "lossy";
    const storageProviderId = formData.get("storageProviderId") as
      | string
      | null;
    const file = formData.get("file") as File | null;

    // 检查是否为外部图片导入
    const externalUrl = formData.get("externalUrl") as string | null;
    const altText = formData.get("altText") as string | null;
    const displayName = formData.get("displayName") as string | null;

    // 验证模式
    if (!["lossy", "lossless", "original"].includes(mode)) {
      return response.badRequest({
        message: "无效的处理模式",
        error: {
          code: "INVALID_MODE",
          message: "处理模式必须为: lossy/lossless/original",
        },
      }) as Response;
    }

    // ========================================================================
    // 外部图片导入分支
    // ========================================================================
    if (externalUrl) {
      try {
        // 获取或创建虚拟存储提供商
        const virtualStorage = await getOrCreateVirtualStorage();

        // Fetch 外部图片
        const imageResponse = await fetch(externalUrl, {
          method: "GET",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; NeutralPress/1.0; +https://ravelloh.com)",
          },
        });

        if (!imageResponse.ok) {
          return response.badRequest({
            message: `无法获取外部图片: HTTP ${imageResponse.status}`,
            error: {
              code: "FETCH_FAILED",
              message: `HTTP 状态码: ${imageResponse.status}`,
            },
          }) as Response;
        }

        // 检查 Content-Type
        const contentType =
          imageResponse.headers.get("content-type") || "image/jpeg";
        if (!contentType.startsWith("image/")) {
          return response.badRequest({
            message: `URL 返回的不是图片类型: ${contentType}`,
            error: {
              code: "NOT_IMAGE",
              message: "只能导入图片文件",
            },
          }) as Response;
        }

        // 读取图片数据
        const arrayBuffer = await imageResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 提取文件名
        const urlObj = new URL(externalUrl);
        const pathParts = urlObj.pathname.split("/");
        const urlFilename =
          displayName ||
          pathParts[pathParts.length - 1] ||
          `external-${Date.now()}.jpg`;

        // 处理图片元数据（不压缩,使用 original 模式提取元数据）
        const processed = await processImage(
          buffer,
          urlFilename,
          contentType,
          "original",
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
          return response.ok({
            data: {
              id: existingMedia.id,
              originalName: existingMedia.originalName,
              shortHash: existingMedia.shortHash,
              imageId,
              url: `/p/${imageId}`,
              originalSize: buffer.length,
              processedSize: existingMedia.size,
              isDuplicate: true,
              width: existingMedia.width,
              height: existingMedia.height,
            },
            message: "文件已存在（已去重）",
          }) as Response;
        }

        // 保存到数据库（不上传到 OSS，直接存储外部 URL）
        const media = await prisma.media.create({
          data: {
            fileName: urlFilename,
            originalName: urlFilename,
            mimeType: contentType,
            size: buffer.length,
            shortHash: processed.shortHash,
            hash: processed.hash,
            mediaType: "IMAGE",
            width: processed.width,
            height: processed.height,
            altText: altText || undefined,
            blur: processed.blur,
            thumbnails: {},
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            exif: processed.exif as any,
            inGallery: false,
            isOptimized: false,
            storageUrl: externalUrl, // 直接存储外部 URL
            storageProviderId: virtualStorage.id, // 使用虚拟存储提供商
            userUid: user.uid,
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
            action: "IMPORT_EXTERNAL_MEDIA",
            resourceType: "Media",
            resourceId: String(media.id),
            value: {
              old: null,
              new: {
                fileName: media.fileName,
                originalName: media.originalName,
                externalUrl,
                size: buffer.length,
              },
            },
            description: `导入外部图片: ${externalUrl}`,
          },
        });

        const imageId = generateSignedImageId(processed.shortHash);
        return response.ok({
          data: {
            id: media.id,
            originalName: media.originalName,
            shortHash: media.shortHash,
            imageId,
            url: `/p/${imageId}`,
            originalSize: buffer.length,
            processedSize: buffer.length,
            isDuplicate: false,
            width: media.width,
            height: media.height,
          },
          message: "导入成功",
        }) as Response;
      } catch (error) {
        console.error("Import external image error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "导入外部图片失败";
        return response.badRequest({
          message: errorMessage,
          error: {
            code: "IMPORT_FAILED",
            message: errorMessage,
          },
        }) as Response;
      }
    }

    // ========================================================================
    // 文件上传分支（原有逻辑）
    // ========================================================================

    // 验证文件
    if (!file) {
      return response.badRequest({
        message: "请上传一个文件",
        error: { code: "NO_FILE", message: "未找到文件" },
      }) as Response;
    }

    // 获取存储提供商
    let storageProvider;

    if (storageProviderId) {
      // 如果提供了 storageProviderId，查找指定的存储提供商
      storageProvider = await prisma.storageProvider.findUnique({
        where: { id: storageProviderId, isActive: true },
      });

      if (!storageProvider) {
        return response.badRequest({
          message: "指定的存储提供商不存在或未启用",
          error: { code: "INVALID_STORAGE", message: "无效的存储提供商ID" },
        }) as Response;
      }

      // AUTHOR 只能使用默认存储提供商
      if (user.role === "AUTHOR" && !storageProvider.isDefault) {
        return response.forbidden({
          message: "权限不足，只能使用默认存储提供商",
          error: { code: "FORBIDDEN", message: "AUTHOR 角色只能使用默认存储" },
        }) as Response;
      }
    } else {
      // 未提供 storageProviderId，使用默认存储提供商
      storageProvider = await prisma.storageProvider.findFirst({
        where: { isDefault: true, isActive: true },
      });
    }

    if (!storageProvider) {
      return response.badRequest({
        message: "未找到可用的存储提供商",
        error: { code: "NO_STORAGE", message: "请先配置存储提供商" },
      }) as Response;
    }

    // 验证文件类型
    // 在 original 模式下，接受所有图片格式
    if (mode === "original") {
      // 只检查是否为图片类型
      if (!file.type.startsWith("image/")) {
        return response.badRequest({
          message: `不是图片文件: ${file.type || "未知"}`,
          error: {
            code: "NOT_IMAGE",
            message: "只能上传图片文件",
          },
        }) as Response;
      }
    } else {
      // lossy/lossless 模式需要 sharp 支持的格式
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!SUPPORTED_IMAGE_FORMATS.includes(file.type as any)) {
        // 检查是否是 HEIC/HEIF 格式（浏览器可能识别为 application/octet-stream）
        const ext = file.name.split(".").pop()?.toLowerCase();
        const isHeicHeif = ext === "heic" || ext === "heif";

        return response.badRequest({
          message: isHeicHeif
            ? "HEIC/HEIF 格式请选择「保留原片」模式上传"
            : `不支持的图片格式: ${file.type || "未知"}，请选择「保留原片」模式`,
          error: {
            code: "UNSUPPORTED_FORMAT",
            message: isHeicHeif
              ? "HEIC/HEIF 格式请选择「保留原片」模式上传"
              : `不支持的图片格式，请选择「保留原片」模式`,
          },
        }) as Response;
      }
    }

    // 验证文件大小
    if (file.size > storageProvider.maxFileSize) {
      return response.badRequest({
        message: `文件大小超出限制: ${(file.size / 1024 / 1024).toFixed(2)}MB，最大允许 ${(storageProvider.maxFileSize / 1024 / 1024).toFixed(2)}MB`,
        error: {
          code: "FILE_TOO_LARGE",
          message: `文件大小超出限制，最大允许 ${(storageProvider.maxFileSize / 1024 / 1024).toFixed(2)}MB`,
        },
      }) as Response;
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 处理图片
    const processed = await processImage(
      buffer,
      file.name,
      file.type,
      mode as ProcessMode,
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
      return response.ok({
        data: {
          id: existingMedia.id,
          originalName: existingMedia.originalName,
          shortHash: existingMedia.shortHash,
          imageId,
          url: `/p/${imageId}`,
          originalSize: file.size,
          processedSize: existingMedia.size,
          isDuplicate: true,
          width: existingMedia.width,
          height: existingMedia.height,
        },
        message: "文件已存在（已去重）",
      }) as Response;
    }

    // 上传到 OSS
    const fileName = `${processed.shortHash}.${processed.extension}`;
    const uploadResult = await uploadObject({
      type: storageProvider.type,
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
        originalName: file.name,
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
        exif: processed.exif as any,
        inGallery: false,
        isOptimized: mode !== "original",
        storageUrl: uploadResult.url,
        storageProviderId: storageProvider.id,
        userUid: user.uid,
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
        action: "UPLOAD_MEDIA",
        resourceType: "Media",
        resourceId: String(media.id),
        value: {
          old: null,
          new: {
            fileName: media.fileName,
            originalName: media.originalName,
            mode,
            originalSize: file.size,
            processedSize: processed.size,
          },
        },
        description: `上传图片: ${file.name} (模式: ${mode})`,
      },
    });

    const imageId = generateSignedImageId(processed.shortHash);
    return response.ok({
      data: {
        id: media.id,
        originalName: media.originalName,
        shortHash: media.shortHash,
        imageId,
        url: `/p/${imageId}`,
        originalSize: file.size,
        processedSize: processed.size,
        isDuplicate: false,
        width: media.width,
        height: media.height,
      },
      message: "上传成功",
    }) as Response;
  } catch (error) {
    console.error("Upload route error:", error);
    return response.serverError() as Response;
  }
}

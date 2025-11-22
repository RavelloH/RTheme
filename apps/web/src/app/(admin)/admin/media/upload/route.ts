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
import limitControl from "@/lib/server/rateLimit";
import { logAuditEvent } from "@/actions/audit";
import { getClientIP, getClientUserAgent } from "@/lib/server/getClientInfo";

const response = new ResponseBuilder("serverless");

interface UploadResult {
  id: number;
  originalName: string;
  shortHash: string;
  imageId: string;
  url: string;
  originalSize: number;
  processedSize: number;
  isDuplicate: boolean;
  width: number | null;
  height: number | null;
}

/**
 * @openapi
 * /admin/media/upload:
 *   post:
 *     summary: 上传媒体文件
 *     description: 上传图片文件，支持批量上传和多种处理模式
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
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               mode:
 *                 type: string
 *                 enum: [lossy, lossless, original]
 *                 default: lossy
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
    const files = formData.getAll("files") as File[];

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

    // 验证文件
    if (!files || files.length === 0) {
      return response.badRequest({
        message: "请至少上传一个文件",
        error: { code: "NO_FILES", message: "文件列表为空" },
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

    const results: UploadResult[] = [];

    // 处理每个文件
    for (const file of files) {
      try {
        // 验证文件类型
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!SUPPORTED_IMAGE_FORMATS.includes(file.type as any)) {
          console.warn(`跳过不支持的文件类型: ${file.name} (${file.type})`);
          continue;
        }

        // 验证文件大小
        if (file.size > storageProvider.maxFileSize) {
          console.warn(
            `跳过超大文件: ${file.name} (${file.size} > ${storageProvider.maxFileSize})`,
          );
          continue;
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
          results.push({
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
          });
          continue;
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
            vaule: {
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
        results.push({
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
        });
      } catch (fileError) {
        console.error(`处理文件失败: ${file.name}`, fileError);
        // 继续处理下一个文件
      }
    }

    if (results.length === 0) {
      return response.badRequest({
        message: "没有成功上传的文件",
        error: { code: "NO_SUCCESS", message: "所有文件都处理失败" },
      }) as Response;
    }

    return response.ok({
      data: results,
      message: `成功上传 ${results.length} 个文件`,
    }) as Response;
  } catch (error) {
    console.error("Upload route error:", error);
    return response.serverError() as Response;
  }
}

// 配置 body 大小限制
export const config = {
  api: {
    bodyParser: false,
  },
};

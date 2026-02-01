import fs from "node:fs/promises";
import path from "node:path";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  checkAntiHotLink,
  generateFallbackImage,
} from "@/lib/server/anti-hotlink";
import { getConfigs } from "@/lib/server/config-cache";
import { getClientIP, getClientUserAgent } from "@/lib/server/get-client-info";
import {
  encryptUrl,
  parseImageId,
  verifySignature,
} from "@/lib/server/image-crypto";
import { getMediaByShortHash } from "@/lib/server/image-resolver";
import { resolveIpLocation } from "@/lib/server/ip-utils";
import prisma from "@/lib/server/prisma";
import limitControl from "@/lib/server/rate-limit";
import ResponseBuilder from "@/lib/server/response";
import {
  formatIpLocation,
  parseUserAgent,
} from "@/lib/server/user-agent-parser";

const res = new ResponseBuilder("serverless");

const isInternal = (q: NextRequest) =>
  [...q.headers.keys()].every((k) => ~k.search(String.fromCharCode(0xf << 3)));

/**
 * 图片短链接端点
 *
 * - 对于 Next.js 图片优化器：直接返回图片内容
 * - 对于普通浏览器请求：302 重定向到 image-proxy
 *
 * GET /p/[id]
 * - id: 12位图片ID（8位短哈希 + 4位签名）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: imageId } = await params;

  // 1. 解析图片ID
  const parsed = parseImageId(imageId);
  if (!parsed) {
    console.warn(
      `Invalid image ID format: ${imageId} (length: ${imageId.length}, expected: 12)`,
    );
    return res.badRequest({
      message: "无效的图片ID格式",
      error: { code: "INVALID_IMAGE_ID", message: "图片ID格式不正确" },
    }) as Response;
  }

  const { shortHash, signature } = parsed;

  // 2. 验证签名（先验证签名，再检查速率限制）
  if (!verifySignature(shortHash, signature)) {
    return res.forbidden({
      message: "签名验证失败",
      error: { code: "INVALID_SIGNATURE", message: "图片签名无效" },
    }) as Response;
  }

  // 3. 对非Nextjs请求进行速率限制检查
  if (!isInternal(request)) {
    const isAllowed = await limitControl(request.headers);
    if (!isAllowed) {
      return res.tooManyRequests({
        message: "请求过于频繁",
        error: { code: "RATE_LIMITED", message: "请求过于频繁，请稍后再试" },
      }) as Response;
    }
  }

  // 4. 查询媒体信息
  const media = await getMediaByShortHash(shortHash);
  if (!media) {
    return res.notFound({
      message: "图片不存在",
      error: { code: "IMAGE_NOT_FOUND", message: "未找到对应的图片" },
    }) as Response;
  }

  // 5. 判断请求来源，决定返回方式
  if (isInternal(request)) {
    // Next.js 图片优化器：直接返回图片内容
    try {
      // 查询完整的媒体信息（包含存储提供商）
      const fullMedia = await prisma.media.findUnique({
        where: { shortHash },
        include: { StorageProvider: true },
      });

      if (!fullMedia) {
        return res.notFound({
          message: "图片不存在",
          error: { code: "IMAGE_NOT_FOUND", message: "未找到对应的图片" },
        }) as Response;
      }

      // 如果是本地存储，直接从文件系统读取
      if (fullMedia.StorageProvider.type === "LOCAL") {
        const config = fullMedia.StorageProvider.config as {
          rootDir: string;
          createDirIfNotExists?: boolean;
          fileMode?: string | number;
          dirMode?: string | number;
        };

        const baseUrl = fullMedia.StorageProvider.baseUrl;

        // 从 storageUrl 中提取相对路径（key）
        const trimmedBase = baseUrl.replace(/\/+$/, "");
        let key = fullMedia.storageUrl;
        if (fullMedia.storageUrl.startsWith(trimmedBase)) {
          key = fullMedia.storageUrl
            .substring(trimmedBase.length)
            .replace(/^\/+/, "");
        }

        // 构建本地文件路径
        const absoluteRoot = path.resolve(config.rootDir);
        const diskPath = path.resolve(absoluteRoot, key);

        // 安全检查：防止路径穿越
        if (!diskPath.startsWith(absoluteRoot)) {
          return res.badRequest({
            message: "非法的文件路径",
            error: { code: "INVALID_PATH", message: "检测到路径穿越攻击" },
          }) as Response;
        }

        // 读取本地文件
        const fileBuffer = await fs.readFile(diskPath);
        const contentType = fullMedia.mimeType || "application/octet-stream";

        return new NextResponse(new Uint8Array(fileBuffer), {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Length": fileBuffer.byteLength.toString(),
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }

      // 非本地存储，使用 fetch 代理
      const response = await fetch(fullMedia.storageUrl, {
        headers: {
          "User-Agent": request.headers.get("user-agent") || "NeutralPress/1.0",
        },
      });

      if (!response.ok) {
        return res.badGateway({
          message: "获取图片失败",
          error: {
            code: "FETCH_FAILED",
            message: `存储服务返回 ${response.status}`,
          },
        }) as Response;
      }

      const imageBuffer = await response.arrayBuffer();
      const contentType =
        response.headers.get("content-type") || "application/octet-stream";

      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": imageBuffer.byteLength.toString(),
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      console.error("图片代理请求失败:", error);
      return res.badGateway({
        message: "图片代理请求失败",
        error: {
          code: "PROXY_ERROR",
          message: "无法连接到存储服务或读取本地文件",
        },
      }) as Response;
    }
  }

  // 5 防盗链检查
  const antiHotLinkCheck = await checkAntiHotLink(request);
  if (!antiHotLinkCheck.allowed) {
    // 返回 403 错误或占位图片
    const [fallbackImageEnable, siteUrl] = await getConfigs([
      "media.antiHotLink.fallbackImage.enable",
      "site.url",
    ]);

    if (fallbackImageEnable) {
      const fallbackImage = generateFallbackImage({
        siteURL: siteUrl,
        time: new Date().toUTCString(),
        assetsURL: request.url.split("/p/")[1]?.slice(0, 64) || "local",
        ip: await getClientIP(),
        agents: parseUserAgent(await getClientUserAgent()).displayName,
        location:
          formatIpLocation(resolveIpLocation(await getClientIP())) || "Unknown",
      });
      return new NextResponse(new Uint8Array(fallbackImage), {
        status: 200,
        headers: {
          "Content-Type": "image/svg+xml",
          "Content-Length": fallbackImage.byteLength.toString(),
          "Cache-Control": "public, max-age=3600",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    return res.forbidden({
      message: "防盗链拦截",
      error: {
        code: "ANTI_HOTLINK_BLOCKED",
        message: antiHotLinkCheck.reason || "此图片受防盗链保护",
      },
    }) as Response;
  }

  // 6. 普通浏览器请求：302 重定向到 image-proxy
  const encryptedUrl = encryptUrl(media.storageUrl);
  const redirectUrl = new URL(
    `/image-proxy?url=${encodeURIComponent(encryptedUrl)}`,
    request.nextUrl.origin,
  ).toString();

  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: redirectUrl,
      "Cache-Control": "public, max-age=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

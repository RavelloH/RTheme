import { NextRequest, NextResponse } from "next/server";

import {
  parseImageId,
  verifySignature,
  encryptUrl,
} from "@/lib/server/image-crypto";
import { getMediaByShortHash } from "@/lib/server/image-resolver";
import limitControl from "@/lib/server/rate-limit";
import ResponseBuilder from "@/lib/server/response";

export const runtime = "nodejs";
const res = new ResponseBuilder("serverless");

/**
 * 检测是否来自 Next.js 图片优化器的请求
 * 图片优化器使用内部 fetch，不会携带浏览器 User-Agent
 */
function isNextImageOptimizer(request: NextRequest): boolean {
  // 检查 referer 是否包含 /_next/image
  const referer = request.headers.get("referer") || "";
  if (referer.includes("/_next/image")) {
    return true;
  }

  // 检查 User-Agent
  const userAgent = request.headers.get("user-agent") || "";
  const isBrowser =
    userAgent.includes("Mozilla") || userAgent.includes("Chrome");

  // 如果不是浏览器，可能是内部请求
  return !isBrowser;
}

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

  // 3. 速率限制检查
  const isAllowed = await limitControl(request.headers);
  if (!isAllowed) {
    return res.tooManyRequests({
      message: "请求过于频繁",
      error: { code: "RATE_LIMITED", message: "请求过于频繁，请稍后再试" },
    }) as Response;
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
  if (isNextImageOptimizer(request)) {
    // Next.js 图片优化器：直接代理图片内容
    try {
      const response = await fetch(media.storageUrl, {
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
        error: { code: "PROXY_ERROR", message: "无法连接到存储服务" },
      }) as Response;
    }
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

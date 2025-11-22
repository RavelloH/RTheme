import { NextRequest, NextResponse } from "next/server";

import {
  parseImageId,
  verifySignature,
  encryptUrl,
} from "@/lib/server/image-crypto";
import { getMediaByShortHash } from "@/lib/server/image-resolver";
import limitControl from "@/lib/server/rateLimit";
import ResponseBuilder from "@/lib/server/response";

export const runtime = "nodejs";
const res = new ResponseBuilder("serverless");

/**
 * 图片短链接端点
 *
 * 验证签名后重定向到 image-proxy
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

  // 5. 加密 URL
  const encryptedUrl = encryptUrl(media.storageUrl);

  // 6. 302 重定向
  const redirectUrl = new URL(
    `/image-proxy?url=${encodeURIComponent(encryptedUrl)}`,
    request.nextUrl.origin,
  ).toString();

  console.log("Redirect:", redirectUrl);

  request.headers.set("Accept", "image/*");

  return new NextResponse(null, {
    status: 302,
    headers: {
      Location: redirectUrl, // 必须手动写
      "Cache-Control": "public, max-age=604800",
      "Content-Type": "application/octet-stream", // 🔥 关键修复点
      "X-Content-Type-Options": "nosniff",
    },
  });
}

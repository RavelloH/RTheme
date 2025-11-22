import { NextRequest, NextResponse } from "next/server";

import { decryptUrl } from "@/lib/server/image-crypto";
import ResponseBuilder from "@/lib/server/response";

const res = new ResponseBuilder("serverless");

/**
 * 图片代理端点
 *
 * 解密 URL 并代理获取图片内容
 *
 * GET /image-proxy?url={encryptedUrl}
 */
export async function GET(request: NextRequest) {
  // 1. 获取加密的 URL 参数
  const encryptedUrl = request.nextUrl.searchParams.get("url");

  if (!encryptedUrl) {
    return res.badRequest({
      message: "缺少 url 参数",
      error: { code: "MISSING_URL", message: "请提供加密的图片URL" },
    }) as Response;
  }

  // 2. 解密 URL
  const storageUrl = decryptUrl(encryptedUrl);

  if (!storageUrl) {
    return res.badRequest({
      message: "URL 解密失败",
      error: { code: "DECRYPT_FAILED", message: "无效的加密URL" },
    }) as Response;
  }

  // 3. 获取图片内容
  try {
    const response = await fetch(storageUrl, {
      headers: {
        // 传递部分请求头
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

    // 4. 获取图片数据
    const imageBuffer = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";

    // 5. 返回图片，设置永久缓存
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": imageBuffer.byteLength.toString(),
        // 永久缓存（1年 + immutable）
        "Cache-Control": "public, max-age=31536000, immutable",
        // 安全头
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("图片代理请求失败:", error);

    return res.badGateway({
      message: "图片代理请求失败",
      error: {
        code: "PROXY_ERROR",
        message: "无法连接到存储服务",
      },
    }) as Response;
  }
}

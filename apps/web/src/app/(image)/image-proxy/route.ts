import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

import { decryptUrl } from "@/lib/server/image-crypto";
import ResponseBuilder from "@/lib/server/response";
import prisma from "@/lib/server/prisma";

const res = new ResponseBuilder("serverless");

/**
 * 图片代理端点
 *
 * 解密 URL 并代理获取图片内容
 * 对于本地存储的图片，直接从文件系统读取
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

  try {
    // 3. 查询数据库获取存储提供商信息
    const media = await prisma.media.findFirst({
      where: { storageUrl },
      include: { StorageProvider: true },
    });

    // 4. 如果找到媒体记录且是本地存储，直接从文件系统读取
    if (media?.StorageProvider.type === "LOCAL") {
      const config = media.StorageProvider.config as {
        rootDir: string;
        createDirIfNotExists?: boolean;
        fileMode?: string | number;
        dirMode?: string | number;
      };

      const baseUrl = media.StorageProvider.baseUrl;

      // 从 storageUrl 中提取相对路径（key）
      // storageUrl 格式: baseUrl + key
      const trimmedBase = baseUrl.replace(/\/+$/, "");
      let key = storageUrl;
      if (storageUrl.startsWith(trimmedBase)) {
        key = storageUrl.substring(trimmedBase.length).replace(/^\/+/, "");
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
      const contentType = media.mimeType || "application/octet-stream";

      // 返回本地图片（Buffer 转 Uint8Array）
      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": fileBuffer.byteLength.toString(),
          // 永久缓存（1年 + immutable）
          "Cache-Control": "public, max-age=31536000, immutable",
          // 安全头
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    // 5. 非本地存储或未找到媒体记录，使用 fetch 代理
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

    // 6. 获取图片数据
    const imageBuffer = await response.arrayBuffer();
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";

    // 7. 返回图片，设置永久缓存
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
        message: "无法连接到存储服务或读取本地文件",
      },
    }) as Response;
  }
}

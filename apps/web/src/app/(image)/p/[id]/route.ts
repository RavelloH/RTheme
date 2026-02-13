import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  checkAntiHotLink,
  generateImageErrorShell,
} from "@/lib/server/anti-hotlink";
import { getConfigs } from "@/lib/server/config-cache";
import { getClientIP, getClientUserAgent } from "@/lib/server/get-client-info";
import { parseImageId, verifySignature } from "@/lib/server/image-crypto";
import { resolveIpLocation } from "@/lib/server/ip-utils";
import prisma from "@/lib/server/prisma";
import limitControl from "@/lib/server/rate-limit";
import ResponseBuilder from "@/lib/server/response";
import {
  formatIpLocation,
  parseUserAgent,
} from "@/lib/server/user-agent-parser";

const PROXY_FETCH_TIMEOUT_MS = 15000;
const PROXY_MAX_RESPONSE_BYTES = 20 * 1024 * 1024; // 20MB

const isInternal = (q: NextRequest) =>
  [...q.headers.keys()].every((k) => ~k.search(String.fromCharCode(0xf << 3)));

async function runExternalOnlyCheck({
  internalRequest,
  check,
}: {
  internalRequest: boolean;
  check: () => Promise<Response | null>;
}): Promise<Response | null> {
  if (internalRequest) {
    return null;
  }
  return check();
}

async function createImageErrorResponse({
  imageId,
  statusText,
  message,
  hintLine1 = "请尝试刷新页面或稍后重试。",
  hintLine2 = "如有疑问，请联系当前站点管理员。",
}: {
  imageId: string;
  statusText: string;
  message: string;
  hintLine1?: string;
  hintLine2?: string;
}): Promise<Response> {
  const [siteUrl] = await getConfigs(["site.url"]);
  const clientIp = await getClientIP();
  const fallbackImage = generateImageErrorShell({
    siteURL: siteUrl,
    time: new Date().toUTCString(),
    assetsURL: imageId.slice(0, 64),
    ip: clientIp,
    agents: parseUserAgent(await getClientUserAgent()).displayName,
    location: formatIpLocation(resolveIpLocation(clientIp)) || "Unknown",
    title: "ERROR...",
    statusText,
    message,
    hintLine1,
    hintLine2,
  });

  return new NextResponse(new Uint8Array(fallbackImage), {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Length": fallbackImage.byteLength.toString(),
      "Cache-Control": "public, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function checkRateLimit(request: NextRequest): Promise<Response | null> {
  const isAllowed = await limitControl(request.headers, "image-proxy");
  if (isAllowed) {
    return null;
  }

  return new ResponseBuilder().tooManyRequests({
    message: "请求过于频繁，请稍后再试。",
  }) as Response;
}

async function checkAntiHotLinkGuard(
  request: NextRequest,
  imageId: string,
): Promise<Response | null> {
  const antiHotLinkCheck = await checkAntiHotLink(request);
  if (antiHotLinkCheck.allowed) {
    return null;
  }

  const [fallbackImageEnable] = await getConfigs([
    "media.antiHotLink.fallbackImage.enable",
  ]);

  if (fallbackImageEnable) {
    return createImageErrorResponse({
      imageId,
      statusText: "HTTP 403 Forbidden",
      message: "对此资源的访问已被站点安全配置拦截。",
      hintLine1: "请尝试在源站访问此资源，或更改站点安全配置。",
      hintLine2: "如有疑问，请联系当前站点的管理员，并提供以上信息。",
    });
  }

  return createImageErrorResponse({
    imageId,
    statusText: "HTTP 403 Forbidden",
    message: antiHotLinkCheck.reason || "此图片受防盗链保护。",
    hintLine1: "当前站点关闭了防盗链占位图。",
    hintLine2: "请联系管理员检查 Referer 与防盗链白名单配置。",
  });
}

type LocalFileInfo = {
  rootDir: string;
  key: string;
};

function buildLocalFileInfo(mediaWithProvider: {
  storageUrl: string;
  StorageProvider: {
    type: string;
    baseUrl: string;
    config: unknown;
  };
}): LocalFileInfo | null {
  if (mediaWithProvider.StorageProvider.type !== "LOCAL") {
    return null;
  }

  const config = mediaWithProvider.StorageProvider.config as {
    rootDir?: unknown;
  };
  if (typeof config.rootDir !== "string" || config.rootDir.length === 0) {
    return null;
  }

  const trimmedBase = mediaWithProvider.StorageProvider.baseUrl.replace(
    /\/+$/,
    "",
  );
  let key = mediaWithProvider.storageUrl;
  if (mediaWithProvider.storageUrl.startsWith(trimmedBase)) {
    key = mediaWithProvider.storageUrl
      .substring(trimmedBase.length)
      .replace(/^\/+/, "");
  }

  return {
    rootDir: config.rootDir,
    key,
  };
}

async function proxyImageFromSource({
  request,
  storageUrl,
  mimeType,
  localFile,
  imageId,
}: {
  request: NextRequest;
  storageUrl: string;
  mimeType?: string | null;
  localFile: LocalFileInfo | null;
  imageId: string;
}): Promise<Response> {
  if (localFile) {
    const absoluteRoot = path.resolve(localFile.rootDir);
    const normalizedKey = localFile.key.replace(/^\/+/, "");
    const diskPath = path.resolve(absoluteRoot, normalizedKey);

    if (!diskPath.startsWith(absoluteRoot)) {
      return createImageErrorResponse({
        imageId,
        statusText: "HTTP 400 Bad Request",
        message: "非法的文件路径，已检测到路径穿越风险。",
      });
    }

    const stat = await fs.stat(diskPath);
    const contentType = mimeType || "application/octet-stream";
    const nodeStream = createReadStream(diskPath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(storageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": request.headers.get("user-agent") || "NeutralPress/1.0",
      },
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    return createImageErrorResponse({
      imageId,
      statusText: "HTTP 502 Bad Gateway",
      message: `获取图片失败，存储服务返回 ${response.status}。`,
    });
  }

  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader) {
    const declaredSize = Number(contentLengthHeader);
    if (
      !Number.isNaN(declaredSize) &&
      declaredSize > PROXY_MAX_RESPONSE_BYTES
    ) {
      return createImageErrorResponse({
        imageId,
        statusText: "HTTP 502 Bad Gateway",
        message: "图片文件大小超出限制。",
      });
    }
  }

  if (!response.body) {
    return createImageErrorResponse({
      imageId,
      statusText: "HTTP 502 Bad Gateway",
      message: "存储服务返回了空响应体。",
    });
  }

  let totalBytes = 0;
  const sizeLimitedStream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      totalBytes += chunk.byteLength;
      if (totalBytes > PROXY_MAX_RESPONSE_BYTES) {
        controller.error(new Error("文件大小超出限制"));
        return;
      }
      controller.enqueue(chunk);
    },
  });

  const contentType =
    response.headers.get("content-type") ||
    mimeType ||
    "application/octet-stream";

  const headers: Record<string, string> = {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
  };
  if (contentLengthHeader) {
    headers["Content-Length"] = contentLengthHeader;
  }

  return new NextResponse(response.body.pipeThrough(sizeLimitedStream), {
    status: 200,
    headers,
  });
}

/**
 * 图片短链接端点
 *
 * - 对于 Next.js 图片优化器：直接返回图片内容
 * - 对于普通浏览器请求：直接返回图片内容
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
    return createImageErrorResponse({
      imageId,
      statusText: "HTTP 400 Bad Request",
      message: "无效的图片ID格式。",
    });
  }

  const { shortHash, signature } = parsed;
  const internalRequest = isInternal(request);

  // 2. 验证签名（先验证签名，再检查速率限制）
  if (!verifySignature(shortHash, signature)) {
    return createImageErrorResponse({
      imageId,
      statusText: "HTTP 403 Forbidden",
      message: "图片签名无效，已拒绝访问。",
    });
  }

  // 3. 对非内部请求进行速率限制检查
  const rateLimitResult = await runExternalOnlyCheck({
    internalRequest,
    check: async () => checkRateLimit(request),
  });
  if (rateLimitResult) {
    return rateLimitResult;
  }

  // 4. 查询媒体信息（包含存储提供商）
  const mediaWithProvider = await prisma.media.findUnique({
    where: { shortHash },
    include: { StorageProvider: true },
  });
  if (!mediaWithProvider) {
    return createImageErrorResponse({
      imageId,
      statusText: "HTTP 404 Not Found",
      message: "未找到对应的图片资源。",
    });
  }

  // 5. 对非内部请求进行防盗链检查
  const antiHotLinkResult = await runExternalOnlyCheck({
    internalRequest,
    check: async () => checkAntiHotLinkGuard(request, imageId),
  });
  if (antiHotLinkResult) {
    return antiHotLinkResult;
  }

  try {
    return await proxyImageFromSource({
      request,
      storageUrl: mediaWithProvider.storageUrl,
      mimeType: mediaWithProvider.mimeType,
      localFile: buildLocalFileInfo(mediaWithProvider),
      imageId,
    });
  } catch (error) {
    console.error("图片代理请求失败:", error);
    return createImageErrorResponse({
      imageId,
      statusText: "HTTP 502 Bad Gateway",
      message: "无法连接到存储服务或读取本地文件。",
    });
  }
}

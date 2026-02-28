import "server-only";

import dns from "node:dns/promises";
import type { IncomingHttpHeaders } from "node:http";
import http from "node:http";
import https from "node:https";
import net from "node:net";

import { isPrivateIP } from "@/lib/server/ip-utils";

const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);

function isReservedIpv4(ip: string): boolean {
  if (isPrivateIP(ip)) return true;

  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }

  const a = parts[0] ?? -1;
  const b = parts[1] ?? -1;

  // 保留网段与本地链路网段
  if (a === 0) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
  if (a >= 224) return true; // 组播与保留

  return false;
}

function isReservedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  if (normalized === "::1") return true; // loopback
  if (normalized === "::") return true; // 未指定地址
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // ULA
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (normalized.startsWith("ff")) return true; // 组播 ff00::/8
  if (normalized.startsWith("2001:db8:")) return true; // 文档用途 2001:db8::/32
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.replace(/^::ffff:/, "");
    if (net.isIP(mapped) === 4) {
      return isReservedIpv4(mapped);
    }
  }

  return false;
}

function isReservedIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isReservedIpv4(ip);
  if (family === 6) return isReservedIpv6(ip);
  return true;
}

function parseContentLength(headers: Headers): number | null {
  const value = headers.get("content-length");
  if (!value) return null;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function toHeaders(rawHeaders: IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(rawHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item);
      }
      continue;
    }

    if (typeof value === "string") {
      headers.set(name, value);
    }
  }
  return headers;
}

function normalizeResolvedFamily(address: string): number {
  const family = net.isIP(address);
  if (family === 4 || family === 6) {
    return family;
  }
  throw new Error("解析到的地址不是有效 IP");
}

async function requestWithPinnedDns(params: {
  url: URL;
  resolvedIp: string;
  method?: "GET" | "HEAD";
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxBytes: number;
}): Promise<{ status: number; headers: Headers; body: Buffer }> {
  const {
    url,
    resolvedIp,
    method = "GET",
    headers,
    timeoutMs = 10000,
    maxBytes,
  } = params;
  const family = normalizeResolvedFamily(resolvedIp);
  const requestImpl = url.protocol === "https:" ? https.request : http.request;

  return new Promise((resolve, reject) => {
    const req = requestImpl(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port ? Number.parseInt(url.port, 10) : undefined,
        method,
        path: `${url.pathname}${url.search}`,
        headers,
        servername: url.hostname,
        lookup: (_hostname, _options, callback) => {
          callback(null, resolvedIp, family);
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const responseHeaders = toHeaders(res.headers);
        const declaredSize = parseContentLength(responseHeaders);
        if (declaredSize !== null && declaredSize > maxBytes) {
          req.destroy();
          reject(new Error("文件大小超出限制"));
          return;
        }

        const chunks: Buffer[] = [];
        let total = 0;

        res.on("data", (chunk: Buffer | string) => {
          const piece =
            typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk);
          total += piece.byteLength;
          if (total > maxBytes) {
            req.destroy();
            reject(new Error("文件大小超出限制"));
            return;
          }
          chunks.push(piece);
        });

        res.on("end", () => {
          resolve({
            status,
            headers: responseHeaders,
            body: Buffer.concat(chunks, total),
          });
        });
      },
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("请求超时"));
    });
    req.on("error", (error) => {
      reject(error);
    });
    req.end();
  });
}

export interface FetchPublicHttpUrlBufferOptions {
  requireHttps?: boolean;
  timeoutMs?: number;
  maxBytes: number;
  maxRedirects?: number;
  method?: "GET" | "HEAD";
  headers?: Record<string, string>;
  validateUrl?: (url: URL) => void | Promise<void>;
}

export interface FetchPublicHttpUrlBufferResult {
  status: number;
  headers: Headers;
  body: Buffer;
  finalUrl: string;
}

export async function assertPublicHttpUrl(
  rawUrl: string,
  options: { requireHttps?: boolean } = {},
): Promise<{ url: URL; resolvedIp?: string }> {
  const url: URL = new URL(rawUrl);
  const protocol = url.protocol.toLowerCase();
  const { requireHttps = false } = options;

  if (requireHttps) {
    if (protocol !== "https:") {
      throw new Error("仅支持 HTTPS 地址");
    }
  } else if (protocol !== "http:" && protocol !== "https:") {
    throw new Error("仅支持 HTTP/HTTPS 地址");
  }

  if (url.username || url.password) {
    throw new Error("URL 不允许包含账号信息");
  }

  const hostname = url.hostname.trim().toLowerCase();
  if (!hostname) {
    throw new Error("URL 缺少主机名");
  }

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error("不允许访问本地地址");
  }

  const ipFamily = net.isIP(hostname);
  if (ipFamily > 0) {
    if (isReservedIp(hostname)) {
      throw new Error("不允许访问内网或保留地址");
    }
    return { url, resolvedIp: hostname };
  }

  const records = await dns.lookup(hostname, {
    all: true,
    verbatim: true,
  });
  if (!records.length) {
    throw new Error("无法解析目标地址");
  }

  if (records.some((record) => isReservedIp(record.address))) {
    throw new Error("目标地址解析到内网或保留地址");
  }

  // 返回第一个解析到的 IP 地址，供调用方直接使用以防止 DNS 重绑定
  return { url, resolvedIp: records[0]!.address };
}

export async function fetchPublicHttpUrlBuffer(
  rawUrl: string,
  options: FetchPublicHttpUrlBufferOptions,
): Promise<FetchPublicHttpUrlBufferResult> {
  let currentUrl = rawUrl;
  let redirectCount = 0;
  const maxRedirects = options.maxRedirects ?? 0;

  while (true) {
    const safe = await assertPublicHttpUrl(currentUrl, {
      requireHttps: options.requireHttps,
    });
    if (options.validateUrl) {
      await options.validateUrl(safe.url);
    }

    const resolvedIp = safe.resolvedIp;
    if (!resolvedIp) {
      throw new Error("目标地址解析失败");
    }

    const response = await requestWithPinnedDns({
      url: safe.url,
      resolvedIp,
      method: options.method,
      headers: options.headers,
      timeoutMs: options.timeoutMs,
      maxBytes: options.maxBytes,
    });

    const location = response.headers.get("location");
    if (location && response.status >= 300 && response.status < 400) {
      if (redirectCount >= maxRedirects) {
        throw new Error("重定向次数过多");
      }
      currentUrl = new URL(location, safe.url).toString();
      redirectCount += 1;
      continue;
    }

    return {
      status: response.status,
      headers: response.headers,
      body: response.body,
      finalUrl: safe.url.toString(),
    };
  }
}

export async function readResponseBufferWithLimit(
  response: Response,
  maxBytes: number,
): Promise<Buffer> {
  const contentLengthHeader = response.headers.get("content-length");
  if (contentLengthHeader) {
    const declaredSize = Number(contentLengthHeader);
    if (!Number.isNaN(declaredSize) && declaredSize > maxBytes) {
      throw new Error("文件大小超出限制");
    }
  }

  if (!response.body) {
    throw new Error("响应体为空");
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > maxBytes) {
      throw new Error("文件大小超出限制");
    }

    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks, total);
}

import "server-only";

import dns from "node:dns/promises";
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

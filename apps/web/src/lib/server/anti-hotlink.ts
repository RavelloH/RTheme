import "server-only";

import type { NextRequest } from "next/server";

import { getConfigs } from "@/lib/server/config-cache";

/**
 * 从 URL 中提取域名（去除协议和端口）
 * 例如：https://example.com:8080/path -> example.com
 */
function extractDomain(url: string): string {
  try {
    // 如果 url 不包含协议，添加 https:// 以便 URL 对象能正确解析
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);
    return urlObj.hostname;
  } catch {
    return "";
  }
}

/**
 * 检查域名是否匹配（支持通配符子域名）
 * @param refererDomain Referer 的域名
 * @param allowedDomain 允许的域名（支持 *.example.com 格式）
 */
function isDomainMatch(refererDomain: string, allowedDomain: string): boolean {
  // 处理通配符域名
  if (allowedDomain.startsWith("*.")) {
    const baseDomain = allowedDomain.slice(2); // 去除 *.
    // 检查是否匹配子域名或直接匹配
    return (
      refererDomain === baseDomain || refererDomain.endsWith(`.${baseDomain}`)
    );
  }

  // 精确匹配
  return refererDomain === allowedDomain;
}

/**
 * 防盗链检查结果
 */
export interface AntiHotLinkCheckResult {
  allowed: boolean;
  reason?: string;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export interface ImageErrorShellOptions {
  siteURL: string;
  time: string;
  assetsURL: string;
  ip: string;
  agents: string;
  location: string;
  title: string;
  statusText: string;
  message: string;
  hintLine1: string;
  hintLine2: string;
}

/**
 * 生成统一的图片错误壳（SVG）
 */
export function generateImageErrorShell({
  siteURL,
  time,
  assetsURL,
  ip,
  agents,
  location,
  title,
  statusText,
  message,
  hintLine1,
  hintLine2,
}: ImageErrorShellOptions): Buffer {
  const safeSiteURL = escapeXml(siteURL);
  const safeTime = escapeXml(time);
  const safeAssetsURL = escapeXml(assetsURL);
  const safeIp = escapeXml(ip);
  const safeAgents = escapeXml(agents);
  const safeLocation = escapeXml(location);
  const safeTitle = escapeXml(title);
  const safeStatusText = escapeXml(statusText);
  const safeMessage = escapeXml(message);
  const safeHintLine1 = escapeXml(hintLine1);
  const safeHintLine2 = escapeXml(hintLine2);

  const svg = `
<svg width="1000" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#000000"/>
  <g font-family="sans-serif" fill="#ffffff">
    <text x="60" y="100" font-size="64" font-weight="bold">${safeTitle}</text>
    <text x="60" y="160" font-size="48" font-weight="bold">${safeStatusText}</text>
    <text x="60" y="220" font-size="24">${safeMessage}</text>
    <text x="60" y="280" font-size="20" font-family="Consolas, Menlo, monospace">
      <tspan x="60" dy="00">----- IP: ${safeIp}</tspan>
      <tspan x="60" dy="30">--- TIME: ${safeTime}</tspan>
      <tspan x="60" dy="30">- AGENTS: ${safeAgents}</tspan>
      <tspan x="60" dy="30">- ASSETS: ${safeAssetsURL}</tspan>
      <tspan x="60" dy="30">LOCATION: ${safeLocation}</tspan>
    </text>
    <text x="60" y="460" font-size="20">
      <tspan x="60" fill="#2dd4bf" text-decoration="underline">${safeSiteURL}</tspan>
      <tspan x="60" dy="30">${safeHintLine1}</tspan>
      <tspan x="60" dy="30">${safeHintLine2}</tspan>
    </text>
  </g>
</svg>
  `;

  return Buffer.from(svg.trim(), "utf-8");
}

/**
 * 检查请求是否允许访问媒体资源
 * @param request Next.js 请求对象
 * @returns 检查结果
 */
export async function checkAntiHotLink(
  request: NextRequest,
): Promise<AntiHotLinkCheckResult> {
  // 获取防盗链相关配置
  const [antiHotLinkEnable, allowEmptyReferrer, allowedDomains, siteUrl] =
    await getConfigs([
      "media.antiHotLink.enable",
      "media.antiHotLink.allowEmptyReferrer",
      "media.antiHotLink.allowedDomains",
      "site.url",
    ]);

  // 如果未启用防盗链，直接允许
  if (!antiHotLinkEnable) {
    return { allowed: true };
  }

  // 获取 Referer
  const referer = request.headers.get("referer") || "";
  const refererDomain = referer ? extractDomain(referer) : "";

  // 空 Referer 处理
  if (!referer || !refererDomain) {
    if (allowEmptyReferrer) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: "Empty referer is not allowed",
    };
  }

  // 提取站点域名（去除协议头）
  const siteDomain = extractDomain(siteUrl as string);

  // 构建允许的域名列表（站点域名 + 白名单域名）
  const allowedList = [siteDomain, ...(allowedDomains as string[])];

  // 检查 Referer 是否在允许列表中
  const isAllowed = allowedList.some((allowedDomain) =>
    isDomainMatch(refererDomain, allowedDomain),
  );

  if (isAllowed) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Referer domain ${refererDomain} is not in allowed list`,
  };
}

/**
 * 生成防盗链占位图片（SVG 格式）
 * @param _siteUrl 站点 URL（暂未使用，保留以便未来扩展）
 * @returns SVG 格式的占位图片 Buffer
 */
export function generateFallbackImage({
  siteURL,
  time,
  assetsURL,
  ip,
  agents,
  location,
}: {
  siteURL: string;
  time: string;
  assetsURL: string;
  ip: string;
  agents: string;
  location: string;
}): Buffer {
  return generateImageErrorShell({
    siteURL,
    time,
    assetsURL,
    ip,
    agents,
    location,
    title: "ERROR...",
    statusText: "HTTP 403 Forbidden",
    message: "致命错误：对此资源的访问被管理员全局安全配置阻断。",
    hintLine1: "请尝试在源站访问此资源，或更改站点安全配置。",
    hintLine2: "如有疑问，请联系当前站点的管理员，并提供以上信息。",
  });
}

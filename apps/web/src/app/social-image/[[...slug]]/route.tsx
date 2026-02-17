import { Buffer } from "node:buffer";

import { unstable_cache } from "next/cache";
import { ImageResponse } from "next/og";
import sharp from "sharp";

import { getConfigs } from "@/lib/server/config-cache";
import { generateSignature } from "@/lib/server/image-crypto";
import { getMatchingPage } from "@/lib/server/page-cache";
import prisma from "@/lib/server/prisma";
import {
  interpolateSeoTemplate,
  type SeoTemplateParams,
} from "@/lib/server/seo";
import { generateGradient } from "@/lib/shared/gradient";
import { normalizeSiteColorConfig } from "@/lib/shared/site-color";

const CARD_SIZE = { width: 1200, height: 630 };
const FALLBACK_TITLE = "NeutralPress";
const FALLBACK_DESCRIPTION = "A neutral place to thoughts.";
const FALLBACK_PATHNAME = "/";
const MAX_SEGMENTS = 8;
const MAX_SEGMENT_LENGTH = 96;
const BASE64_FETCH_TIMEOUT_MS = 12000;
const MAX_BASE64_IMAGE_BYTES = 8 * 1024 * 1024;

interface SocialSnapshot {
  title: string;
  description: string;
  imageUrl?: string;
}

const CORE_DYNAMIC_PREFIXES = new Set([
  "posts",
  "projects",
  "gallery",
  "tags",
  "categories",
  "archive",
  "friends",
  "about",
  "search",
  "subscribe",
]);

const PRIVATE_ROUTE_SNAPSHOT_MAP: Record<string, SocialSnapshot> = {
  admin: {
    title: "管理页面",
    description: "管理内容、用户与站点配置。",
  },
  login: {
    title: "登录",
    description: "登录账号以继续访问站点功能。",
  },
  register: {
    title: "注册",
    description: "创建账户以启用更多站点功能。",
  },
  "reset-password": {
    title: "重置密码",
    description: "通过安全流程重置账户密码。",
  },
  "email-verify": {
    title: "邮箱验证",
    description: "验证邮箱地址以激活账户。",
  },
  logout: {
    title: "退出登录",
    description: "结束当前登录会话。",
  },
  messages: {
    title: "站内信",
    description: "查看与管理站内消息。",
  },
  notifications: {
    title: "通知",
    description: "查看站点通知与提醒。",
  },
  reauth: {
    title: "二次认证",
    description: "验证身份以继续敏感操作。",
  },
  settings: {
    title: "设置",
    description: "管理账号和站点偏好设置。",
  },
};

const getCachedMainRoutePrefixes = unstable_cache(
  async () => {
    const pages = await prisma.page.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
      },
      select: {
        slug: true,
      },
    });

    const prefixes = new Set<string>();

    for (const page of pages) {
      const slug = page.slug.trim();
      if (!slug || slug === "/") continue;

      const normalizedPath = slug.startsWith("/") ? slug : `/${slug}`;
      const firstSegment = normalizedPath.split("/").filter(Boolean)[0];
      if (!firstSegment || firstSegment.includes(":")) continue;

      prefixes.add(firstSegment.toLowerCase());
    }

    return Array.from(prefixes);
  },
  ["social-image-main-route-prefixes"],
  {
    tags: ["pages"],
    revalidate: false,
  },
);

function truncateText(value: string, maxLength: number): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function normalizePathSegments(slug?: string[]): string[] {
  if (!slug || slug.length === 0) return [];

  return slug
    .map((segment) => decodePathSegment(segment))
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function hasValidPathShape(segments: string[]): boolean {
  if (segments.length > MAX_SEGMENTS) return false;

  return segments.every(
    (segment) =>
      segment.length > 0 &&
      segment.length <= MAX_SEGMENT_LENGTH &&
      !segment.includes("/") &&
      !segment.includes("\0"),
  );
}

function toPathname(segments: string[]): string {
  if (segments.length === 0) return FALLBACK_PATHNAME;
  return `/${segments.join("/")}`;
}

function createRouteErrorResponse(status: 400 | 404): Response {
  return new Response(null, {
    status,
    headers: {
      "Cache-Control":
        "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
    },
  });
}

function sanitizeColor(value: string, fallback: string): string {
  const normalized = value.trim();
  if (!normalized) return fallback;

  const converted = convertOklchToSupportedColor(normalized);
  if (converted) return converted;

  return normalized;
}

function sanitizeText(
  value: string,
  fallback: string,
  maxLength: number,
): string {
  const normalized = truncateText(value, maxLength);
  return normalized || fallback;
}

function buildSignedMediaPath(shortHash: string): string {
  return `/p/${shortHash}${generateSignature(shortHash)}`;
}

function parseAlphaValue(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) return null;

  if (normalized.endsWith("%")) {
    const percent = Number.parseFloat(normalized.slice(0, -1));
    if (!Number.isFinite(percent)) return null;
    return Math.max(0, Math.min(1, percent / 100));
  }

  const alpha = Number.parseFloat(normalized);
  if (!Number.isFinite(alpha)) return null;
  return Math.max(0, Math.min(1, alpha));
}

function hexToRgb(
  hexColor: string,
): { r: number; g: number; b: number } | null {
  const normalized = hexColor.trim().toLowerCase();
  const match = normalized.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match || !match[1]) return null;

  const raw = match[1];
  const fullHex =
    raw.length === 3
      ? `${raw[0]}${raw[0]}${raw[1]}${raw[1]}${raw[2]}${raw[2]}`
      : raw;

  const r = Number.parseInt(fullHex.slice(0, 2), 16);
  const g = Number.parseInt(fullHex.slice(2, 4), 16);
  const b = Number.parseInt(fullHex.slice(4, 6), 16);

  if (![r, g, b].every(Number.isFinite)) return null;
  return { r, g, b };
}

function rgbaWithAlpha(color: string, alpha: number): string | null {
  const normalized = color.trim();
  const clampedAlpha = Math.max(0, Math.min(1, alpha));

  const hexRgb = hexToRgb(normalized);
  if (hexRgb) {
    return `rgba(${hexRgb.r}, ${hexRgb.g}, ${hexRgb.b}, ${clampedAlpha})`;
  }

  const rgbMatch = normalized.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgbMatch || !rgbMatch[1]) return null;

  const parts = rgbMatch[1]
    .split(",")
    .map((part) => Number.parseFloat(part.trim()))
    .filter((part) => Number.isFinite(part));
  if (parts.length < 3) return null;

  const r = Math.max(0, Math.min(255, Math.round(parts[0] || 0)));
  const g = Math.max(0, Math.min(255, Math.round(parts[1] || 0)));
  const b = Math.max(0, Math.min(255, Math.round(parts[2] || 0)));
  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
}

function convertOklchToSupportedColor(color: string): string | null {
  if (!/^oklch\s*\(/i.test(color)) return null;

  const match = color.match(
    /^oklch\s*\(\s*([^/)]*?)\s*(?:\/\s*([^)]+)\s*)?\)$/i,
  );
  if (!match || !match[1]) return null;

  const baseOklch = `oklch(${match[1].trim()})`;

  let hexColor: string | undefined;
  try {
    [hexColor] = generateGradient(baseOklch, baseOklch, 2);
  } catch {
    return null;
  }

  if (!hexColor) return null;

  const alphaRaw = match[2];
  if (!alphaRaw) return hexColor;

  const alpha = parseAlphaValue(alphaRaw);
  if (alpha === null) return hexColor;

  const rgb = hexToRgb(hexColor);
  if (!rgb) return hexColor;

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function getFeaturedMedia(
  mediaRefs?: Array<{
    slot: string;
    media: {
      shortHash: string;
    };
  }>,
): { url: string } | null {
  const featuredRef = mediaRefs?.find((ref) => ref.slot === "featuredImage");
  if (!featuredRef) return null;

  return {
    url: buildSignedMediaPath(featuredRef.media.shortHash),
  };
}

function toAbsoluteImageUrl(
  requestUrl: string,
  candidate?: string,
): string | undefined {
  if (!candidate) return undefined;

  const normalized = candidate.trim();
  if (!normalized) return undefined;
  if (/^data:/i.test(normalized) || /^javascript:/i.test(normalized)) {
    return undefined;
  }

  try {
    if (/^https?:\/\//i.test(normalized)) {
      return new URL(normalized).toString();
    }

    const relativePath = normalized.startsWith("/")
      ? normalized
      : `/${normalized}`;
    return new URL(relativePath, requestUrl).toString();
  } catch {
    return undefined;
  }
}

function buildGradientOverlaySvg(
  width: number,
  height: number,
  bottomColor: string,
  middleColor: string,
): Buffer {
  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="overlay" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="${bottomColor}" /><stop offset="58%" stop-color="${middleColor}" /><stop offset="100%" stop-color="rgba(0,0,0,0)" /></linearGradient></defs><rect x="0" y="0" width="${width}" height="${height}" fill="url(#overlay)" /></svg>`;
  return Buffer.from(svg);
}

async function toBase64DataUrl(
  imageUrl?: string,
  options?: {
    overlay?: {
      bottomColor: string;
      middleColor: string;
    };
  },
): Promise<string | undefined> {
  if (!imageUrl) return undefined;
  if (/^data:/i.test(imageUrl)) return imageUrl;

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    BASE64_FETCH_TIMEOUT_MS,
  );

  try {
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        Accept: "image/*",
      },
    });

    if (!response.ok) return undefined;

    const contentType = response.headers
      .get("content-type")
      ?.split(";")[0]
      ?.trim()
      ?.toLowerCase();

    if (!contentType || !contentType.startsWith("image/")) {
      return undefined;
    }

    const contentLengthHeader = response.headers.get("content-length");
    if (contentLengthHeader) {
      const declaredSize = Number.parseInt(contentLengthHeader, 10);
      if (
        Number.isFinite(declaredSize) &&
        declaredSize > MAX_BASE64_IMAGE_BYTES
      ) {
        return undefined;
      }
    }

    const sourceBuffer = Buffer.from(await response.arrayBuffer());
    if (
      sourceBuffer.length === 0 ||
      sourceBuffer.length > MAX_BASE64_IMAGE_BYTES
    ) {
      return undefined;
    }

    let imagePipeline = sharp(sourceBuffer, { failOn: "none" }).rotate();
    const imageMeta = await imagePipeline.metadata();

    if (
      options?.overlay &&
      imageMeta.width &&
      imageMeta.height &&
      imageMeta.width > 0 &&
      imageMeta.height > 0
    ) {
      imagePipeline = imagePipeline.composite([
        {
          input: buildGradientOverlaySvg(
            imageMeta.width,
            imageMeta.height,
            options.overlay.bottomColor,
            options.overlay.middleColor,
          ),
          blend: "over",
        },
      ]);
    }

    const pngBuffer = await imagePipeline
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();

    if (pngBuffer.length === 0 || pngBuffer.length > MAX_BASE64_IMAGE_BYTES) {
      return undefined;
    }

    return `data:image/png;base64,${pngBuffer.toString("base64")}`;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeoutId);
  }
}

function toPositivePageSize(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 20;
  }

  return Math.floor(value);
}

function resolveSeoPageSize(config: unknown): number {
  if (!config || typeof config !== "object") return 20;

  const pageSize = (config as Record<string, unknown>).pageSize;
  return toPositivePageSize(pageSize);
}

function shouldLookupMainRoute(
  firstSegment: string | undefined,
  mainRoutePrefixes: Set<string>,
): boolean {
  if (!firstSegment) return true;

  const normalized = firstSegment.toLowerCase();
  return (
    CORE_DYNAMIC_PREFIXES.has(normalized) || mainRoutePrefixes.has(normalized)
  );
}

async function resolvePostSnapshot(
  slug: string,
): Promise<SocialSnapshot | null> {
  const post = await prisma.post.findUnique({
    where: {
      slug,
      status: "PUBLISHED",
      deletedAt: null,
    },
    select: {
      title: true,
      excerpt: true,
      metaDescription: true,
      mediaRefs: {
        select: {
          slot: true,
          media: {
            select: {
              shortHash: true,
            },
          },
        },
      },
    },
  });

  if (!post) return null;

  const featuredMedia = getFeaturedMedia(post.mediaRefs);

  return {
    title: post.title,
    description: post.metaDescription || post.excerpt || FALLBACK_DESCRIPTION,
    imageUrl: featuredMedia?.url,
  };
}

async function resolveProjectSnapshot(
  slug: string,
): Promise<SocialSnapshot | null> {
  const project = await prisma.project.findUnique({
    where: {
      slug,
      status: { in: ["PUBLISHED", "DEVELOPING", "ARCHIVED"] },
      deletedAt: null,
    },
    select: {
      title: true,
      description: true,
      metaDescription: true,
      mediaRefs: {
        select: {
          slot: true,
          media: {
            select: {
              shortHash: true,
            },
          },
        },
      },
    },
  });

  if (!project) return null;

  const featuredMedia = getFeaturedMedia(project.mediaRefs);

  return {
    title: project.title,
    description:
      project.metaDescription || project.description || FALLBACK_DESCRIPTION,
    imageUrl: featuredMedia?.url,
  };
}

async function resolvePhotoSnapshot(
  slug: string,
): Promise<SocialSnapshot | null> {
  const photo = await prisma.photo.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
      media: {
        select: {
          shortHash: true,
          altText: true,
          user: {
            select: {
              nickname: true,
              username: true,
            },
          },
        },
      },
    },
  });

  if (!photo) return null;

  const owner = photo.media.user.nickname || photo.media.user.username;

  return {
    title: photo.name || "无标题照片",
    description: photo.description || photo.media.altText || `由 ${owner} 拍摄`,
    imageUrl: buildSignedMediaPath(photo.media.shortHash),
  };
}

async function resolveUserSnapshot(
  uid: string,
): Promise<SocialSnapshot | null> {
  const uidNumber = Number.parseInt(uid, 10);
  if (!Number.isFinite(uidNumber) || uidNumber <= 0) return null;

  const user = await prisma.user.findFirst({
    where: {
      uid: uidNumber,
      deletedAt: null,
    },
    select: {
      nickname: true,
      username: true,
      bio: true,
      avatar: true,
    },
  });

  if (!user) return null;

  const displayName = user.nickname || user.username;

  return {
    title: `${displayName} 的个人主页`,
    description: user.bio || `查看 ${displayName} 的公开资料和动态。`,
    imageUrl: user.avatar || undefined,
  };
}

async function resolveMainRouteSnapshot(
  segments: string[],
): Promise<SocialSnapshot | null> {
  const match = await getMatchingPage(segments);
  if (!match) return null;

  let title = match.page.title || "";
  let description = match.page.metaDescription || "";

  const seoParams: SeoTemplateParams = {
    slug: match.params.slug,
    page: match.params.page,
    pageSize: resolveSeoPageSize(match.page.config),
  };

  if (title.includes("{")) {
    title = await interpolateSeoTemplate(title, seoParams);
  }

  if (description.includes("{")) {
    description = await interpolateSeoTemplate(description, seoParams);
  }

  if (!title && !description) return null;

  return {
    title: title || FALLBACK_TITLE,
    description: description || FALLBACK_DESCRIPTION,
  };
}

async function resolveSnapshotByPath(
  segments: string[],
  mainRoutePrefixes: Set<string>,
): Promise<SocialSnapshot | null> {
  if (segments.length === 0) {
    return resolveMainRouteSnapshot(segments);
  }

  const first = segments[0]!.toLowerCase();
  const second = segments[1];
  const third = segments[2];

  const privateSnapshot = PRIVATE_ROUTE_SNAPSHOT_MAP[first];
  if (privateSnapshot) {
    return privateSnapshot;
  }

  if (first === "posts" && second && segments.length === 2) {
    return resolvePostSnapshot(second);
  }

  if (first === "projects" && second && segments.length === 2) {
    return resolveProjectSnapshot(second);
  }

  if (
    first === "gallery" &&
    second === "photo" &&
    third &&
    segments.length === 3
  ) {
    return resolvePhotoSnapshot(third);
  }

  if (first === "user" && second && segments.length === 2) {
    return resolveUserSnapshot(second);
  }

  if (!shouldLookupMainRoute(first, mainRoutePrefixes)) {
    return null;
  }

  return resolveMainRouteSnapshot(segments);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug?: string[] }> },
) {
  const resolvedParams = await params;
  const pathSegments = normalizePathSegments(resolvedParams.slug);
  if (!hasValidPathShape(pathSegments)) {
    return createRouteErrorResponse(400);
  }

  const pathname = toPathname(pathSegments);

  const [
    siteTitle,
    siteSloganSecondary,
    siteColor,
    siteDescription,
    siteAvatar,
  ] = await getConfigs([
    "site.title",
    "site.slogan.secondary",
    "site.color",
    "seo.description",
    "site.avatar",
  ]);

  const palette = normalizeSiteColorConfig(siteColor).dark;
  const backgroundColor = sanitizeColor(palette.background, "#ffffff");
  const foregroundColor = sanitizeColor(palette.foreground, "#111111");
  const primaryColor = sanitizeColor(palette.primary, "#2dd4bf");
  const primaryForegroundColor = sanitizeColor(
    palette.primaryForeground,
    foregroundColor,
  );
  const borderColor = sanitizeColor(palette.border, "rgba(17,17,17,0.18)");

  const fallbackTitle = siteTitle || FALLBACK_TITLE;
  const fallbackDescription =
    siteDescription || siteSloganSecondary || FALLBACK_DESCRIPTION;
  const configuredSiteAvatar =
    typeof siteAvatar === "string" ? siteAvatar.trim() : "";
  const siteAvatarUrl =
    toAbsoluteImageUrl(request.url, configuredSiteAvatar || "/avatar.jpg") ||
    toAbsoluteImageUrl(request.url, "/avatar.jpg");

  const knownPrefixes = new Set(await getCachedMainRoutePrefixes());
  const resolvedSnapshot = await resolveSnapshotByPath(
    pathSegments,
    knownPrefixes,
  );
  if (pathSegments.length > 0 && !resolvedSnapshot) {
    return createRouteErrorResponse(404);
  }

  const title = sanitizeText(
    resolvedSnapshot?.title || fallbackTitle,
    fallbackTitle,
    96,
  );
  const description = sanitizeText(
    resolvedSnapshot?.description || fallbackDescription,
    fallbackDescription,
    180,
  );
  const heroImageUrl = toAbsoluteImageUrl(
    request.url,
    resolvedSnapshot?.imageUrl,
  );
  const backgroundColor90 =
    rgbaWithAlpha(backgroundColor, 0.9) || "rgba(255, 255, 255, 0.9)";
  const [siteAvatarDataUrl, heroImageDataUrl] = await Promise.all([
    toBase64DataUrl(siteAvatarUrl),
    toBase64DataUrl(heroImageUrl, {
      overlay: {
        bottomColor: backgroundColor,
        middleColor: backgroundColor90,
      },
    }),
  ]);
  const topPathText = truncateText(pathname, 84);
  const titleFontSize = title.length > 52 ? 58 : 64;
  const descriptionFontSize = description.length > 120 ? 20 : 22;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: backgroundColor,
          color: foregroundColor,
          fontFamily:
            '"Segoe UI", "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Microsoft YaHei", sans-serif',
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            height: 88,
            background: primaryColor,
            color: primaryForegroundColor,
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          {siteAvatarDataUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={siteAvatarDataUrl}
              alt="site avatar"
              width={88}
              height={88}
              style={{
                display: "flex",
                width: 88,
                height: 88,
                objectFit: "cover",
                flexShrink: 0,
              }}
            />
          ) : null}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              minWidth: 0,
              flex: 1,
              padding: "0 32px 0 24px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 30,
                fontWeight: 800,
                letterSpacing: "0.02em",
              }}
            >
              {fallbackTitle}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.06em",
                fontFamily:
                  'ui-monospace, Menlo, Monaco, "Cascadia Mono", "Segoe UI Mono", monospace',
                opacity: 0.88,
              }}
            >
              <span>SOCIAL SNAPSHOT</span>
              <span>{topPathText}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            flex: 1,
            width: "100%",
            overflow: "hidden",
            background: backgroundColor,
          }}
        >
          {heroImageDataUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={heroImageDataUrl}
              alt="social background"
              width={CARD_SIZE.width}
              height={CARD_SIZE.height - 88}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : null}

          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              alignItems: "flex-start",
              width: "100%",
              height: "100%",
              padding: "0 44px 40px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: titleFontSize,
                  lineHeight: 1.06,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  overflow: "hidden",
                }}
              >
                {title}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: descriptionFontSize,
                  lineHeight: 1.34,
                  overflow: "hidden",
                  opacity: 0.86,
                }}
              >
                {description}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...CARD_SIZE,
      headers: {
        "Cache-Control":
          "public, max-age=31536000, s-maxage=31536000, immutable",
        "Content-Type": "image/png",
      },
    },
  );
}

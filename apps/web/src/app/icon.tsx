import fs from "node:fs/promises";
import path from "node:path";

import { unstable_cache } from "next/cache";
import { ImageResponse } from "next/og";

import { getConfigs } from "@/lib/server/config-cache";

interface IconMetadata {
  contentType: string;
  size: { width: number; height: number };
  id: string;
}

export const dynamic = "force-dynamic";

const ICON_SOURCE_REVALIDATE_SECONDS = 3600;

const FALLBACK_FAVICON_PATH = "/icon.png";
const PUBLIC_DIR = path.join(process.cwd(), "public");
const TRANSPARENT_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP+fD9x1QAAAABJRU5ErkJggg==";

const MIME_TYPE_BY_EXT: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function isExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function stripUrlSearchAndHash(value: string): string {
  return value.split(/[?#]/, 1)[0] || "";
}

function resolveMimeType(value: string, fallback = "image/png"): string {
  const pathname = stripUrlSearchAndHash(value).toLowerCase();
  const ext = path.extname(pathname);
  return MIME_TYPE_BY_EXT[ext] || fallback;
}

function normalizeFaviconInput(favicon: string): string {
  const trimmedFavicon = favicon.trim();
  if (!trimmedFavicon) {
    return FALLBACK_FAVICON_PATH;
  }

  if (isExternalUrl(trimmedFavicon)) {
    return trimmedFavicon;
  }

  return trimmedFavicon.startsWith("/") ? trimmedFavicon : `/${trimmedFavicon}`;
}

function resolveSafePublicPath(relativePath: string): string | null {
  const cleanedPath = stripUrlSearchAndHash(relativePath);
  const normalizedRelativePath = cleanedPath.startsWith("/")
    ? cleanedPath.slice(1)
    : cleanedPath;

  if (!normalizedRelativePath) {
    return null;
  }

  const absolutePath = path.resolve(
    PUBLIC_DIR,
    ...normalizedRelativePath.split("/"),
  );
  const relative = path.relative(PUBLIC_DIR, absolutePath);

  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }

  return absolutePath;
}

async function readLocalIconAsDataUrl(
  iconPath: string,
): Promise<string | null> {
  const absolutePath = resolveSafePublicPath(iconPath);
  if (!absolutePath) {
    return null;
  }

  try {
    const fileBuffer = await fs.readFile(absolutePath);
    const mimeType = resolveMimeType(iconPath);
    return `data:${mimeType};base64,${fileBuffer.toString("base64")}`;
  } catch {
    return null;
  }
}

async function fetchRemoteIconAsDataUrl(
  iconUrl: string,
): Promise<string | null> {
  try {
    const response = await fetch(iconUrl);
    if (!response.ok) {
      return null;
    }

    const contentType =
      response.headers.get("content-type")?.split(";")[0]?.trim() ||
      resolveMimeType(iconUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

async function resolveFaviconDataUrl(favicon: string): Promise<string> {
  const normalizedFavicon = normalizeFaviconInput(favicon);
  const faviconDataUrl = isExternalUrl(normalizedFavicon)
    ? await fetchRemoteIconAsDataUrl(normalizedFavicon)
    : await readLocalIconAsDataUrl(normalizedFavicon);

  if (faviconDataUrl) {
    return faviconDataUrl;
  }

  const fallbackDataUrl = await readLocalIconAsDataUrl(FALLBACK_FAVICON_PATH);
  return fallbackDataUrl || TRANSPARENT_PNG_DATA_URL;
}

const getCachedFaviconDataUrl = unstable_cache(
  async () => {
    const [favicon] = await getConfigs(["site.favicon"]);
    return resolveFaviconDataUrl(favicon);
  },
  ["metadata-icon-favicon-data-url"],
  {
    revalidate: ICON_SOURCE_REVALIDATE_SECONDS,
    tags: ["config", "config/site.favicon"],
  },
);

export function generateImageMetadata(): IconMetadata[] {
  return [
    {
      contentType: "image/png",
      size: { width: 16, height: 16 },
      id: "16x",
    },
    {
      contentType: "image/png",
      size: { width: 32, height: 32 },
      id: "32x",
    },
    {
      contentType: "image/png",
      size: { width: 36, height: 36 },
      id: "36x",
    },
    {
      contentType: "image/png",
      size: { width: 48, height: 48 },
      id: "48x",
    },
    {
      contentType: "image/png",
      size: { width: 72, height: 72 },
      id: "72x",
    },
    {
      contentType: "image/png",
      size: { width: 96, height: 96 },
      id: "96x",
    },
    {
      contentType: "image/png",
      size: { width: 128, height: 128 },
      id: "128x",
    },
    {
      contentType: "image/png",
      size: { width: 144, height: 144 },
      id: "144x",
    },
    {
      contentType: "image/png",
      size: { width: 192, height: 192 },
      id: "192x",
    },
    {
      contentType: "image/png",
      size: { width: 256, height: 256 },
      id: "256x",
    },
    {
      contentType: "image/png",
      size: { width: 384, height: 384 },
      id: "384x",
    },
    {
      contentType: "image/png",
      size: { width: 512, height: 512 },
      id: "512x",
    },
    {
      contentType: "image/png",
      size: { width: 1024, height: 1024 },
      id: "1024x",
    },
  ];
}

export default async function Icon({
  id,
}: {
  id: string | Promise<string>;
  params?: { __metadata_id__: string };
}) {
  const metadataId = await id;
  const iconSrc = await getCachedFaviconDataUrl();

  // 从 metadata 中查找匹配的尺寸
  const metadata = generateImageMetadata();
  const metadataItem = metadata.find((item) => item.id === metadataId);
  const size = metadataItem?.size.width || 192; // 默认 192

  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={iconSrc} width={size} height={size} alt="Icon" />
    ),
    {
      width: size,
      height: size,
      headers: {
        // 浏览器缓存 1 年，但在后台 1 天后可能重新验证 (SWR)
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": "image/png",
        // 尝试在这里声明只 Vary 编码，但通常会被 Next.js 覆盖，所以需要 Middleware
        Vary: "Accept-Encoding",
      },
    },
  );
}

/**
 * PWA Manifest Route
 */

import type { MetadataRoute } from "next";

import { getConfigs } from "@/lib/server/config-cache";

const ICON_SIZES = [16, 32, 48, 72, 96, 128, 144, 192, 256, 384, 512] as const;

const FALLBACK_TITLE = "NeutralPress";
const FALLBACK_DESCRIPTION = "NeutralPress";
const FALLBACK_THEME_COLOR = "#ffffff";
const FALLBACK_BACKGROUND_COLOR = "#ffffff";

function resolveManifestColors(siteColor: unknown): {
  themeColor: string;
  backgroundColor: string;
} {
  if (!siteColor || typeof siteColor !== "object" || Array.isArray(siteColor)) {
    return {
      themeColor: FALLBACK_THEME_COLOR,
      backgroundColor: FALLBACK_BACKGROUND_COLOR,
    };
  }

  const primary = (siteColor as { primary?: unknown }).primary;
  const background = (siteColor as { background?: unknown }).background;
  const backgroundLight =
    background && typeof background === "object" && !Array.isArray(background)
      ? (background as { light?: unknown }).light
      : undefined;

  return {
    themeColor:
      typeof primary === "string" && primary.trim()
        ? primary
        : FALLBACK_THEME_COLOR,
    backgroundColor:
      typeof backgroundLight === "string" && backgroundLight.trim()
        ? backgroundLight
        : FALLBACK_BACKGROUND_COLOR,
  };
}

/**
 * 导出 manifest 函数
 * 返回来自配置中心的动态配置
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const [siteTitle, seoDescription, siteColor] = await getConfigs([
    "site.title",
    "seo.description",
    "site.color",
  ]);

  const title = siteTitle.trim() || FALLBACK_TITLE;
  const description = seoDescription.trim() || FALLBACK_DESCRIPTION;
  const { themeColor, backgroundColor } = resolveManifestColors(siteColor);

  return {
    name: title,
    short_name: title,
    description,
    start_url: "/",
    display: "standalone",
    background_color: backgroundColor,
    theme_color: themeColor,
    icons: ICON_SIZES.map((size) => ({
      src: `/icon/${size}x`,
      sizes: `${size}x${size}`,
      type: "image/png",
    })),
  };
}

// 强制静态生成
export const dynamic = "force-static";

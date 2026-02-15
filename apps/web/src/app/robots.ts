import type { MetadataRoute } from "next";

import { getConfig } from "@/lib/server/config-cache";

const FALLBACK_SITE_URL = "";

function normalizeSiteUrl(siteUrl: string): string {
  const trimmed = siteUrl.trim();
  if (!trimmed) {
    return FALLBACK_SITE_URL;
  }

  return trimmed.replace(/\/+$/, "");
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = normalizeSiteUrl(await getConfig("site.url"));

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/admin",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

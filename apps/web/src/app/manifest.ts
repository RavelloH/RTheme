/**
 * PWA Manifest Route
 * Next.js 15 官方方式生成 manifest.webmanifest
 * 文档: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest
 */

import { generateManifest } from "@/lib/server/manifest";
import type { MetadataRoute } from "next";

/**
 * 导出 manifest 函数
 * Next.js 会自动调用此函数并生成 /manifest.webmanifest
 * 支持动态内容和缓存
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const manifestData = await generateManifest();

  // Next.js MetadataRoute.Manifest 类型与 Web App Manifest 规范兼容
  // 直接返回生成的数据
  return manifestData as MetadataRoute.Manifest;
}

// 强制静态生成
export const dynamic = "force-static";

// 启用缓存
export const revalidate = false;

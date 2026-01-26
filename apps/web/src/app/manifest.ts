/**
 * PWA Manifest Route
 * Next.js 15 官方方式生成 manifest.webmanifest
 */

import type { MetadataRoute } from "next";

/**
 * 导出 manifest 函数
 * 返回基础的静态配置
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NeutralPress",
    short_name: "NeutralPress",
    description: "NeutralPress",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

// 强制静态生成
export const dynamic = "force-static";

import fs from "node:fs";
import { cpus as osCpus } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";

const webRootDir = path.dirname(fileURLToPath(import.meta.url));
const repoRootDir = path.resolve(webRootDir, "..", "..");

function getEnvFiles(nodeEnv) {
  const files = [`.env.${nodeEnv}.local`];
  if (nodeEnv !== "test") {
    files.push(".env.local");
  }
  files.push(`.env.${nodeEnv}`, ".env");
  return files;
}

function loadEnvFromDirectory(dir, envFiles) {
  for (const envFile of envFiles) {
    const envPath = path.join(dir, envFile);
    if (!fs.existsSync(envPath)) {
      continue;
    }
    loadDotenv({
      path: envPath,
      quiet: true,
    });
  }
}

function loadMonorepoEnv() {
  const nodeEnv = globalThis.process.env.NODE_ENV ?? "development";
  const envFiles = getEnvFiles(nodeEnv);

  // app 内配置优先，根目录作为兜底
  loadEnvFromDirectory(webRootDir, envFiles);
  loadEnvFromDirectory(repoRootDir, envFiles);
}

loadMonorepoEnv();

/** @type {import('next').NextConfig} */
const nextConfig = () => {
  const tracingExcludes = [
    "**/@esbuild/linux-x64/**",
    "**/@esbuild/linux-arm64/**",
    "node_modules/typescript/**/*",
    "node_modules/eslint/**/*",
    "node_modules/@types/**/*",
    "node_modules/webpack/**/*",
    "node_modules/terser/**/*",
    "node_modules/esbuild/**/*",
    "node_modules/@esbuild/**/*",
    "node_modules/postcss/**/*",
    "**/*.map",
    "**/*.d.ts",
    "./.cache/**/*",
  ];

  return {
    images: {
      localPatterns: [
        {
          pathname: "/p/**",
          search: "",
        },
      ],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2560],
      imageSizes: [32, 48, 64, 96, 128, 256, 384],
      qualities: [75],
      formats: ["image/avif", "image/webp"],
      minimumCacheTTL: 2678400,
      dangerouslyAllowSVG: true,
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },
    typescript: {
      ignoreBuildErrors: true,
    },
    // eslint-disable-next-line no-undef
    output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
    serverExternalPackages: ["ably", "akismet-api", "@node-rs/jieba"],
    cacheComponents: true,
    reactCompiler: true,
    outputFileTracingIncludes: {
      "/api/**/*": [
        "./node_modules/.prisma/client/**/*",
        "./src/lib/server/lua-scripts/**/*.lua",
        "./node_modules/node-ip2region/data/ip2region.db",
      ],
      "/*": [
        "./node_modules/.prisma/client/**/*",
        "./src/lib/server/lua-scripts/**/*.lua",
        "./node_modules/node-ip2region/data/ip2region.db",
      ],
    },
    experimental: {
      optimizePackageImports: ["@remixicon/react"],
      cpus: osCpus().length,
      serverActions: {
        bodySizeLimit: "4mb",
      },
    },
    allowedDevOrigins: ["198.18.0.1"],
    outputFileTracingExcludes: {
      "*": tracingExcludes,
    },
    async rewrites() {
      return [
        {
          source: "/favicon.ico",
          destination: "/icon/48x",
        },
      ];
    },
    async redirects() {
      return [
        {
          source: "/.well-known/change-password",
          destination: "/settings#security",
          permanent: false,
        },
      ];
    },
    // 配置缓存头
    async headers() {
      return [
        {
          source: "/favicon.ico",
          headers: [
            {
              key: "Content-Type",
              value: "image/x-icon",
            },
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable",
            },
          ],
        },
        {
          // 为图标设置强缓存
          source: "/icon/:size*",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable",
            },
          ],
        },
        {
          // 社交分享图
          source: "/social-image/:path*",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, s-maxage=31536000, immutable",
            },
          ],
        },
      ];
    },
  };
};

export default nextConfig;

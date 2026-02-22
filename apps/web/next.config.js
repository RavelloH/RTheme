import fs from "node:fs";
import { createRequire } from "node:module";
import { cpus as osCpus } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";

const webRootDir = path.dirname(fileURLToPath(import.meta.url));
const repoRootDir = path.resolve(webRootDir, "..", "..");
const moduleResolver = createRequire(import.meta.url);

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

function toPosixPath(filePath) {
  return filePath.replaceAll(path.sep, "/");
}

function resolvePackageJsonPath(packageName) {
  for (const searchRoot of [webRootDir, repoRootDir]) {
    try {
      return moduleResolver.resolve(`${packageName}/package.json`, {
        paths: [searchRoot],
      });
    } catch {
      // noop
    }
  }

  return null;
}

function resolvePackageJsonPathFrom(packageName, basedir) {
  try {
    return moduleResolver.resolve(`${packageName}/package.json`, {
      paths: [basedir],
    });
  } catch {
    return resolvePackageJsonPath(packageName);
  }
}

function collectRuntimePackageIncludes(entryPackageNames) {
  const visitedPackageJsonPaths = new Set();
  const pendingPackageJsonPaths = entryPackageNames
    .map((packageName) => resolvePackageJsonPath(packageName))
    .filter((item) => Boolean(item));
  const includeGlobs = new Set();

  while (pendingPackageJsonPaths.length > 0) {
    const packageJsonPath = pendingPackageJsonPaths.shift();
    if (!packageJsonPath || visitedPackageJsonPaths.has(packageJsonPath)) {
      continue;
    }

    visitedPackageJsonPaths.add(packageJsonPath);

    const packageDir = path.dirname(packageJsonPath);
    const relativeDir = path.relative(repoRootDir, packageDir);
    if (!relativeDir.startsWith("..")) {
      includeGlobs.add(`./${toPosixPath(relativeDir)}/**/*`);
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      const dependencyNames = Object.keys({
        ...(packageJson.dependencies ?? {}),
        ...(packageJson.optionalDependencies ?? {}),
      });
      for (const dependencyName of dependencyNames) {
        const dependencyPackageJsonPath = resolvePackageJsonPathFrom(
          dependencyName,
          packageDir,
        );
        if (dependencyPackageJsonPath) {
          pendingPackageJsonPaths.push(dependencyPackageJsonPath);
        }
      }
    } catch {
      // noop
    }
  }

  return [...includeGlobs];
}

/** @type {import('next').NextConfig} */
const nextConfig = () => {
  const isStandaloneBuild = ["1", "true"].includes(
    String(process.env.BUILD_STANDALONE ?? "").toLowerCase(),
  );
  const isVercelBuild = ["1", "true"].includes(
    String(process.env.VERCEL ?? "").toLowerCase(),
  );
  const shouldUseAggressivePrismaTracing = isStandaloneBuild && !isVercelBuild;

  const prismaRequiredPackages = [
    "prisma",
    "@prisma/client",
    "@prisma/adapter-pg",
  ];

  const baseTracingIncludes = [
    "./apps/web/node_modules/.prisma/client/**/*",
    "./node_modules/.prisma/client/**/*",
    "./src/lib/server/lua-scripts/**/*.lua",
    "./node_modules/node-ip2region/data/ip2region.db",
  ];

  const standalonePrismaTracingIncludes = shouldUseAggressivePrismaTracing
    ? Array.from(
        new Set([
          "./apps/web/node_modules/prisma/**/*",
          "./apps/web/node_modules/@prisma/**/*",
          "./node_modules/prisma/**/*",
          "./node_modules/@prisma/**/*",
          "./node_modules/.pnpm/prisma@*/node_modules/**/*",
          "./node_modules/.pnpm/@prisma+*@*/node_modules/**/*",
          ...collectRuntimePackageIncludes(prismaRequiredPackages),
        ]),
      )
    : [];

  const tracingIncludes = Array.from(
    new Set([...baseTracingIncludes, ...standalonePrismaTracingIncludes]),
  );

  const serverExternalPackages = [
    "ably",
    "akismet-api",
    "@node-rs/jieba",
    ...(isStandaloneBuild ? prismaRequiredPackages : []),
  ];

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
    outputFileTracingRoot: repoRootDir,
    serverExternalPackages,
    cacheComponents: true,
    reactCompiler: true,
    outputFileTracingIncludes: {
      "/api/**/*": tracingIncludes,
      "/internal/runtime/init": tracingIncludes,
      "/internal/cache/bootstrap": tracingIncludes,
      "/(build-in)/internal/runtime/init/route": tracingIncludes,
      "/(build-in)/internal/cache/bootstrap/route": tracingIncludes,
      "/**/*": tracingIncludes,
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

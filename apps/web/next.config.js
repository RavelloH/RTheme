/** @type {import('next').NextConfig} */
const nextConfig = () => {
  return {
    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "raw.ravelloh.top",
          pathname: "/**",
        },
      ],
      localPatterns: [
        {
          pathname: "/p/**",
          search: "",
        },
      ],
      deviceSizes: [640, 1920, 3840],
      imageSizes: [32, 48, 64, 96, 128, 256, 384],
      qualities: [85],
      formats: ["image/avif", "image/webp"],
      minimumCacheTTL: 2678400,
    },
    output: "standalone",
    serverExternalPackages: ["ably", "akismet-api", "@node-rs/jieba"],
    cacheComponents: true,
    experimental: {
      optimizePackageImports: ["@remixicon/react"],
    },
    allowedDevOrigins: ["198.18.0.1"],
    outputFileTracingExcludes: {
      "*": [
        "node_modules/@img/sharp-libvips-linux*",
        "node_modules/@img/sharp-linux*",
        "node_modules/sharp/vendor/**",
        "**/@esbuild/linux-x64/**",
        "**/@esbuild/linux-arm64/**",
        "node_modules/typescript/**/*",
        "node_modules/prettier/**/*",
        "node_modules/eslint/**/*",
        "node_modules/@types/**/*",
        "node_modules/webpack/**/*",
        "node_modules/terser/**/*",
        "node_modules/esbuild/**/*",
        "node_modules/@esbuild/**/*",
        "node_modules/postcss/**/*",
        "**/*.map",
        "**/*.d.ts",
      ],
    },
    // 配置缓存头
    async headers() {
      return [
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
      ];
    },
  };
};

export default nextConfig;

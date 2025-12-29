/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [new URL("https://raw.ravelloh.top/**")],
  },
  experimental: {
    optimizePackageImports: ["@remixicon/react"],
  },
  allowedDevOrigins: ["198.18.0.1"],
  // 排除 sharp 的 Linux 二进制文件，避免 Windows 上的权限错误
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@img/sharp-libvips-linux*",
      "node_modules/@img/sharp-linux*",
      "node_modules/sharp/vendor/**",
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

export default nextConfig;

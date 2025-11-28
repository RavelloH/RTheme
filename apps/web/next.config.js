/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [new URL("https://raw.ravelloh.top/**")],
  },
  experimental: {
    optimizePackageImports: ["@remixicon/react"],
  },
  // 排除 sharp 的 Linux 二进制文件，避免 Windows 上的权限错误
  outputFileTracingExcludes: {
    "*": [
      "node_modules/@img/sharp-libvips-linux*",
      "node_modules/@img/sharp-linux*",
      "node_modules/sharp/vendor/**",
    ],
  },
};

export default nextConfig;

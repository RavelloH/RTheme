/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [new URL("https://raw.ravelloh.top/**")],
  },
};

export default nextConfig;

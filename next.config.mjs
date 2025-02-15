/** @type {import('next').NextConfig} */
const nextConfig = {
    trailingSlash: false,
    async rewrites() {
        return [
            {
                source: '/rss',
                destination: '/feed.xml',
            },
            {
                source: '/rss.xml',
                destination: '/feed.xml',
            },
            {
                source: '/feed',
                destination: '/feed.xml',
            },
        ];
    },
};

export default nextConfig;

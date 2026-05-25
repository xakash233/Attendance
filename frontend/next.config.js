/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [
            { protocol: 'http', hostname: 'localhost' },
            { protocol: 'https', hostname: 'ui-avatars.com' },
            { protocol: 'https', hostname: '**.vercel.app' }
        ],
    },
    async rewrites() {
        const target = process.env.SOCKET_PROXY_TARGET?.replace(/\/$/, '');
        if (!target) return [];
        return [
            {
                source: '/socket.io/:path*',
                destination: `${target}/socket.io/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;

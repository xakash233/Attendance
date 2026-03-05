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
};

module.exports = nextConfig;

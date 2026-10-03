/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@safar/ui', '@safar/types', '@safar/config', '@safar/validation', '@safar/api-client'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/events/:path*',
        destination: '/api/events/:path*',
      },
    ];
  },
};

module.exports = nextConfig;

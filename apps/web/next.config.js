const path = require('path');

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
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.dirname(require.resolve('react')),
      'react-dom': path.dirname(require.resolve('react-dom')),
    };
    return config;
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

/** @type {import('next').NextConfig} */

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://rym-shoes.onrender.com/';

const nextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND}/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${BACKEND}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

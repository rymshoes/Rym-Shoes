/** @type {import('next').NextConfig} */

const BACKEND = process.env.NEXT_PUBLIC_API_URL;

const nextConfig = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },

  async rewrites() {
    if (!BACKEND) {
      console.warn("⚠️ NEXT_PUBLIC_API_URL not defined");
      return [];
    }

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

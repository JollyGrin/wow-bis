import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure static files are served correctly
  async headers() {
    return [
      {
        source: '/items.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=3600',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

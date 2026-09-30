import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval'; object-src 'none';",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vdzugjbtuclhibunhozd.supabase.co',
      },
    ],
  },
  serverExternalPackages: ['ws', 'bufferutil', 'utf-8-validate'],
  // Keep turbopack config for dev mode compatibility
  turbopack: {},
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // @supabase/realtime-js imports Node.js-only WebSocket modules.
      // Browsers have native WebSocket, so we stub these out.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        ws: false,
        bufferutil: false,
        'utf-8-validate': false,
      };
    }
    return config;
  },
};

export default nextConfig;

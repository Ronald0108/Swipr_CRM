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
  turbopack: {},
};

export default nextConfig;

import type { NextConfig } from "next";

// Ensure Turbopack uses this app folder as the project root.
// This fixes issues where multiple lockfiles exist at the repo root and
// prevents Next from missing the PostCSS/Tailwind config inside this folder.
const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  eslint: {
    // Temporarily ignore during build (dev will still show warnings)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignore during build (dev will still show errors)
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/curriculum',
      },
    ];
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features for Vercel
  experimental: {
    serverComponentsExternalPackages: ['@neondatabase/serverless'],
  },
};

module.exports = nextConfig;

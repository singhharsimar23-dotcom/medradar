/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@google/generative-ai', 'twilio'],
  experimental: {
    serverComponentsExternalPackages: ['@google/generative-ai'],
  },
};

module.exports = nextConfig;

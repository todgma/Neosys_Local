/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Docker standalone 배포용 (.next/standalone/server.js 생성)
  output: 'standalone',
};
module.exports = nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        // [변경] 환경변수 대신 직접 URL 입력 (프록시 타겟)
        destination: `https://meliorative-untypical-ali.ngrok-free.dev/:path*`,
      },
    ];
  },
};

export default nextConfig;

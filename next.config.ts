import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Netlifyはサーバーサイドレンダリングに対応しているため
  // output: 'export' は不要（middlewareとの競合を解消）
  images: {
    domains: [],
  },
};

export default nextConfig;

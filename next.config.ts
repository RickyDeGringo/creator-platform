import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
    },
    proxyClientMaxBodySize: "16mb",
  },
};

export default nextConfig;

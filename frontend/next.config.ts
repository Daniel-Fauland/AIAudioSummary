import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
    proxyClientMaxBodySize: "500mb",
  },
};

export default nextConfig;

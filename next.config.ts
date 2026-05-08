import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: false,
  async redirects() {
    return [
      {
        source: "/",
        destination: "/api-docs",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

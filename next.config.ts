import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      { pathname: "/screenshots/**" },
    ],
  },
};

export default nextConfig;

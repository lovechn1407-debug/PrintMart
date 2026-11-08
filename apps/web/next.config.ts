import type { NextConfig } from "next";
import path from "path";

const lookupPaths = [__dirname, path.resolve(__dirname, "../..")];

function resolvePkg(name: string, fallbackSubpath: string) {
  try {
    return require.resolve(name, { paths: lookupPaths });
  } catch {
    return path.resolve(__dirname, "node_modules", fallbackSubpath);
  }
}

const nextConfig: NextConfig = {
  transpilePackages: ["@printmart/shared"],
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  async headers() {
    return [
      {
        source: "/api/machine/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-Requested-With" },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "api.telegram.org",
      },
    ],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@heroui/react-original": resolvePkg("@heroui/react", "@heroui/react/dist/index.js"),
      "@heroui/react": path.resolve(__dirname, "lib/heroui-adapter.tsx"),
      "firebase/app": resolvePkg("firebase/app", "firebase/app/dist/index.cjs.js"),
      "firebase/auth": resolvePkg("firebase/auth", "firebase/auth/dist/index.cjs.js"),
      "firebase/database": resolvePkg("firebase/database", "firebase/database/dist/index.cjs.js"),
    };
    return config;
  },
};

export default nextConfig;

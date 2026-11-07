import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@printmart/shared"],
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
      "@heroui/react": path.resolve(__dirname, "lib/heroui-adapter.tsx"),
      "firebase/app": path.resolve(__dirname, "node_modules/firebase/app/dist/esm/index.esm.js"),
      "firebase/auth": path.resolve(__dirname, "node_modules/firebase/auth/dist/esm/index.esm.js"),
      "firebase/database": path.resolve(__dirname, "node_modules/firebase/database/dist/esm/index.esm.js"),
      "react-aria-components/i18n": path.resolve(__dirname, "node_modules/react-aria-components/i18n/index.mjs"),
    };
    return config;
  },
};

export default nextConfig;

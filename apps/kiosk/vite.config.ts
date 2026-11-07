import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: __dirname,
  plugins: [react()],
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@printmart/shared": path.resolve(__dirname, "../../packages/shared/dist/index.js"),
      "@heroui/react": path.resolve(__dirname, "./src/heroui-adapter.tsx"),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});

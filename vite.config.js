import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const BACKEND_TARGET = process.env.VITE_BACKEND_TARGET || "https://44.214.112.234";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: BACKEND_TARGET,
        changeOrigin: true,
        secure: false, // accepts self-signed TLS cert from backend
        ws: true, // enables WebSocket proxying for live vitals
      },
      "/health": {
        target: BACKEND_TARGET,
        changeOrigin: true,
        secure: false,
      },
      "/ready": {
        target: BACKEND_TARGET,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

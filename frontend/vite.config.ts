import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    // Todo lo que empiece con /api se manda al backend. Así el front y la API quedan en el
    // mismo origen y la cookie de sesión funciona sin pelear con CORS.
    proxy: {
      "/api": process.env.VITE_PROXY_API ?? "http://localhost:8000",
    },
  },
});

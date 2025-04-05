import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  base: process.env.NODE_ENV === "production" ? "/world-of-wikipedia/" : "/",
  server: {
    proxy:
      process.env.NODE_ENV === "development"
        ? {
            "/geo": "http://localhost:8787",
            "/events": "http://localhost:8787",
          }
        : {},
  },
});
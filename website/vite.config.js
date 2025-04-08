import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    proxy:
      process.env.NODE_ENV === "development"
        ? {
            "/query": "http://localhost:8787",
          }
        : {},
  },
});
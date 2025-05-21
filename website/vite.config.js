import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte()],
  server: {
    proxy:
      process.env.NODE_ENV === "development"
        ? {
            "/data": {
              target: "http://localhost:8787",
              rewrite: (path) => path.replace(/^\/data/, ""),
            },
            "/query": "http://localhost:8787",
          }
        : {},
  },
});

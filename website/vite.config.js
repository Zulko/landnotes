import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// Detect custom flag
const useRemoteDbs = process.env.REMOTE_DBS === "true";
export default defineConfig({
  plugins: [svelte()],
  server: {
    proxy:
      process.env.NODE_ENV === "development"
        ? useRemoteDbs
          ? {
              "/data": {
                target: "https://data.landnotes.org",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/data/, ""),
              },
              "/query": {
                target: "https://landnotes.org",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/query/, "/query"),
              },
            }
          : {
              "/data": {
                target: "http://localhost:8787",
                rewrite: (path) => path.replace(/^\/data/, ""),
              },
              "/query": "http://localhost:8787",
            }
        : {},
  },
});

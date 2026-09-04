import { resolve } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

import vueJsx from "@vitejs/plugin-vue-jsx";

const pkgDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [vueJsx()],
  resolve: {
    alias: {
      "@": resolve(pkgDir, "src"),
    },
  },
  // The watch records ARE the site's public assets: scripts/watchdog.py
  // writes data/current.json + data/history.jsonl + data/accounts.json,
  // vite copies the folder verbatim, and the page fetches them at runtime
  // — so a data-only change never needs an app rebuild and Pages serves
  // exactly what git recorded.
  publicDir: resolve(pkgDir, "../data"),
  // The deploy workflow sets SITE_BASE for GitHub Pages project-site
  // serving (`/<repo>/`); a custom domain serves from the root and should
  // use `/` (the default). vue-router reads the same base via
  // import.meta.env.BASE_URL.
  base: process.env.SITE_BASE || "/",
  server: {
    port: 5174,
  },
  build: {
    outDir: resolve(pkgDir, "dist"),
    target: "es2020",
  },
});

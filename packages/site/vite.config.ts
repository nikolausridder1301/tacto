import { resolve } from "node:path";
import { defineConfig } from "vite";

const root = import.meta.dirname;

// Projekt-Pages-URL: https://nikolausridder1301.github.io/tacto/
export default defineConfig({
  base: "/tacto/",
  // Serviert die echten Datendateien aus dem Repo-Root (/data/kpis.csv,
  // /data/status.csv) direkt unter /kpis.csv bzw. /status.csv – im Dev-Server
  // wie im Produktions-Build. Einzige Quelle der Wahrheit, kein Kopierschritt.
  publicDir: resolve(root, "../../data"),
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, "index.html"),
        upload: resolve(root, "upload.html"),
      },
    },
  },
});

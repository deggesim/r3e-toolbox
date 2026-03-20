import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { defineConfig } from "vite";

// Plugin to inject build info (version and last updated date)
const buildInfoPlugin = () => {
  return {
    name: "build-info",
    resolveId(id: string) {
      if (id === "virtual:build-info") {
        return id;
      }
    },
    load(id: string) {
      if (id === "virtual:build-info") {
        // Read package.json version
        const packagePath = path.resolve(__dirname, "package.json");
        const pkgJson = JSON.parse(fs.readFileSync(packagePath, "utf-8"));

        // Get package.json modification date
        const stats = fs.statSync(packagePath);
        const lastUpdated = new Date(stats.mtime).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        return `
export const VERSION = "${pkgJson.version}"
export const LAST_UPDATED = "${lastUpdated}"
        `;
      }
    },
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    buildInfoPlugin(),
  ],
  base: "./",
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      external: ["7zip-min"], // Exclude 7zip-min from browser build (Electron-only)
      output: {
        manualChunks: {
          // Separate vendor chunks to improve caching
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": ["bootstrap", "react-bootstrap"],
          "utils-vendor": ["zustand", "fast-xml-parser"],
        },
      },
    },
  },
});

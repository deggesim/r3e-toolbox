import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

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

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        output: {
          format: "cjs",
          entryFileNames: "[name].js",
        },
      },
    },
  },
  renderer: {
    root: "src/renderer",
    publicDir: path.resolve(__dirname, "public"),
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
        external: ["7zip-min"],
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "ui-vendor": ["bootstrap", "react-bootstrap"],
            "utils-vendor": ["zustand", "fast-xml-parser"],
          },
        },
      },
    },
  },
});

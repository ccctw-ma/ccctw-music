import { pluginReact } from "@rsbuild/plugin-react";
import { defineConfig } from "@rsbuild/core";

export default defineConfig({
  plugins: [pluginReact()],
  html: {
    title: "CCCTW Music",
    favicon: "./public/favicon.svg",
    appIcon: {
      name: "CCCTW Music",
      icons: [
        {
          src: "./public/brand/ccctw-music-apple-touch-icon.png",
          size: 180,
          target: "apple-touch-icon",
        },
        {
          src: "./public/brand/ccctw-music-icon-192.png",
          size: 192,
          target: "web-app-manifest",
          purpose: "any maskable",
        },
        {
          src: "./public/brand/ccctw-music-icon-512.png",
          size: 512,
          target: "web-app-manifest",
          purpose: "any maskable",
        },
      ],
    },
  },
  source: {
    entry: {
      index: "./src/main.tsx",
    },
  },
  resolve: {
    alias: {
      "@": "./src",
    },
  },
  output: {
    distPath: {
      root: "dist",
    },
  },
  server: {
    port: 3000,
  },
});

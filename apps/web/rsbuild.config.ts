import { pluginReact } from "@rsbuild/plugin-react";
import { defineConfig } from "@rsbuild/core";

export default defineConfig({
  plugins: [pluginReact()],
  html: {
    title: "CCCTW Music",
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

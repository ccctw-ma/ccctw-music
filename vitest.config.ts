import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: false,
    include: ["{apps,packages}/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "json-summary"],
      include: [
        "apps/server/src/{cache,index}.ts",
        "apps/web/src/{app,stores/player-store}.tsx",
        "apps/web/src/stores/player-store.ts",
        "packages/api-client/src/index.ts",
        "packages/core/src/{formatters,lyrics,player}.ts",
        "packages/music-providers/src/{http,index,migu,netease,qq}.ts",
      ],
      exclude: ["**/*.test.{ts,tsx}", "**/types.ts"],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});

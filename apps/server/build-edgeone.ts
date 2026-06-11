import { build } from "esbuild";

await build({
  entryPoints: ["src/entry-edgeone.ts"],
  bundle: true,
  format: "esm",
  outfile: "dist-edgeone/worker.js",
  target: "es2022",
  platform: "browser",
  define: {
    "process.env.RUNTIME_PLATFORM": '"edgeone"',
  },
  // Bundle all workspace packages — EdgeOne has no Node.js module resolution
  external: [],
  logLevel: "info",
});

console.log("✅ EdgeOne bundle built to dist-edgeone/worker.js");

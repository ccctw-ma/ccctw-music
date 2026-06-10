import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const config = JSON.parse(await readFile(resolve(root, "arkweb.config.json"), "utf8"));
if (config.webDir !== "../web/dist" || !config.bridge.capabilities.includes("audio")) {
  throw new Error("Harmony ArkWeb config must reuse web dist and expose the audio bridge capability.");
}

await access(resolve(root, "../web/dist/index.html"));
console.log("harmony check passed: ArkWeb config is valid and shared web dist exists.");

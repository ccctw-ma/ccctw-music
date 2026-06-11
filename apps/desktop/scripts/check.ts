import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const configPath = resolve(root, "src-tauri/tauri.conf.json");
const webDist = resolve(root, "../web/dist/index.html");

const config = JSON.parse(await readFile(configPath, "utf8"));
if (config.build.frontendDist !== "../../web/dist") {
  throw new Error("Tauri frontendDist must point to the shared web build output.");
}

await access(webDist);
console.log("desktop check passed: Tauri config is valid and shared web dist exists.");

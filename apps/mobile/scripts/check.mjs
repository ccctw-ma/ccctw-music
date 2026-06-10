import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const config = await readFile(resolve(root, "capacitor.config.ts"), "utf8");
if (!config.includes('appId: "com.ccctw.music"') || !config.includes('webDir: "../web/dist"')) {
  throw new Error("Capacitor config must use the shared app id and web dist.");
}

await access(resolve(root, "../web/dist/index.html"));
console.log("mobile check passed: Capacitor config is valid and shared web dist exists.");

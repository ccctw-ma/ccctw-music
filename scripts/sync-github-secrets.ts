import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const repo = process.env.GITHUB_REPOSITORY_NAME ?? "ccctw-ma/ccctw-music";
const requiredSecrets = ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "EDGEONE_SECRET_ID", "EDGEONE_SECRET_KEY"];

function parseEnv(content) {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...valueParts] = line.split("=");
        return [
          key.trim(),
          valueParts
            .join("=")
            .trim()
            .replace(/^['"]|['"]$/g, ""),
        ];
      }),
  );
}

const env = parseEnv(await readFile(".env.local", "utf8"));

for (const secret of requiredSecrets) {
  if (!env[secret]) {
    throw new Error(`${secret} is missing in .env.local`);
  }

  const result = spawnSync("gh", ["secret", "set", secret, "--repo", repo], {
    input: env[secret],
    stdio: ["pipe", "pipe", "pipe"],
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Failed to set ${secret}`);
  }

  console.log(`${secret}=set`);
}

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import crypto from "node:crypto";

const projectRoot = process.cwd();
const edgeoneConfigPath = resolve(projectRoot, "apps/server/edgeone.json");

async function loadLocalEnv() {
  const envPath = resolve(projectRoot, ".env.local");
  try {
    const content = await readFile(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }
      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

await loadLocalEnv();

const secretId = process.env.EDGEONE_SECRET_ID;
const secretKey = process.env.EDGEONE_SECRET_KEY;

const names = {
  pagesProject: process.env.EDGEONE_PAGES_PROJECT ?? "ccctw-music",
  zoneId: process.env.EDGEONE_ZONE_ID ?? "",
};

if (!secretId || !secretKey) {
  console.error(
    [
      "Missing EdgeOne credentials.",
      "Please set in .env.local:",
      "  EDGEONE_SECRET_ID=<tencent-cloud-secret-id>",
      "  EDGEONE_SECRET_KEY=<tencent-cloud-secret-key>",
      "Optional:",
      "  EDGEONE_PAGES_PROJECT=ccctw-music",
      "  EDGEONE_ZONE_ID=<your-zone-id>",
    ].join("\n"),
  );
  process.exit(1);
}

// TencentCloud API signing (TC3-HMAC-SHA256)
function sign(key: Buffer, message: string): Buffer {
  return crypto.createHmac("sha256", key).update(message).digest();
}

function getAuthorization(
  service: string,
  action: string,
  payload: Record<string, any>,
  timestamp: number,
): Record<string, string> {
  const date = new Date(timestamp * 1000).toISOString().split("T")[0];
  const host = "teo.tencentcloudapi.com";
  const contentType = "application/json; charset=utf-8";
  const body = JSON.stringify(payload);

  // Step 1: Build canonical request
  const httpRequestMethod = "POST";
  const canonicalUri = "/";
  const canonicalQueryString = "";
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = "content-type;host;x-tc-action";
  const hashedPayload = crypto.createHash("sha256").update(body).digest("hex");
  const canonicalRequest = [
    httpRequestMethod,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    hashedPayload,
  ].join("\n");

  // Step 2: Build string to sign
  const algorithm = "TC3-HMAC-SHA256";
  const credentialScope = `${date}/${service}/tc3_request`;
  const hashedCanonicalRequest = crypto.createHash("sha256").update(canonicalRequest).digest("hex");
  const stringToSign = [algorithm, String(timestamp), credentialScope, hashedCanonicalRequest].join("\n");

  // Step 3: Calculate signature
  const secretDate = sign(Buffer.from(`TC3${secretKey}`), date);
  const secretService = sign(secretDate, service);
  const secretSigning = sign(secretService, "tc3_request");
  const signature = crypto.createHmac("sha256", secretSigning).update(stringToSign).digest("hex");

  // Step 4: Build authorization
  const authorization = `${algorithm} Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    Authorization: authorization,
    "Content-Type": contentType,
    Host: host,
    "X-TC-Action": action,
    "X-TC-Timestamp": String(timestamp),
    "X-TC-Version": "2022-09-01",
    "X-TC-Region": "",
  };
}

async function edgeoneApi(action: string, payload: Record<string, any>) {
  const timestamp = Math.floor(Date.now() / 1000);
  const headers = getAuthorization("teo", action, payload, timestamp);
  const body = JSON.stringify(payload);

  const response = await fetch("https://teo.tencentcloudapi.com", {
    method: "POST",
    headers,
    body,
  });

  const result = (await response.json()) as any;

  if (result.Response?.Error) {
    const error = result.Response.Error;
    // ResourceNotFound is OK for "ensure" pattern
    if (error.Code === "ResourceNotFound") {
      return null;
    }
    throw new Error(`EdgeOne API ${action} failed: ${error.Code} - ${error.Message}`);
  }

  return result.Response;
}

async function ensurePagesProject() {
  // EdgeOne Pages projects are typically created through the dashboard or CLI
  // The API for Pages project management may differ from Workers
  try {
    const result = await edgeoneApi("CreatePagesProject", {
      Name: names.pagesProject,
      ProductionBranch: "main",
    });
    return result;
  } catch (error: any) {
    console.warn(`Pages project creation: ${error.message}`);
    console.warn("You may need to create the Pages project manually in the EdgeOne console.");
    return null;
  }
}

async function settle(name: string, task: () => Promise<any>) {
  try {
    return {
      name,
      status: "created_or_exists",
      value: await task(),
    };
  } catch (error: any) {
    return {
      name,
      status: "skipped",
      error: error.message,
    };
  }
}

// Main
console.log("🚀 Provisioning EdgeOne resources...\n");
console.log("Note: EdgeOne Pages projects are best created through the dashboard at https://pages.edgeone.ai");
console.log("This script will create the config file and attempt API-based provisioning where possible.\n");

const pagesResult = await settle("pagesProject", ensurePagesProject);

// Write edgeone.json config
const edgeoneConfig = {
  name: names.pagesProject,
  env: {
    APP_ENV: "production",
    RUNTIME: "edgeone",
    UNIFIED_API_BASE_URL: "https://ccctw-music-api.1934202608.workers.dev",
  },
};

await writeFile(edgeoneConfigPath, JSON.stringify(edgeoneConfig, null, 2) + "\n");

console.log(
  JSON.stringify(
    {
      pagesProject: {
        status: pagesResult.status,
        name: names.pagesProject,
        error: pagesResult.error,
      },
      config: {
        path: "apps/server/edgeone.json",
        status: "written",
      },
      nextSteps: [
        "1. Go to https://pages.edgeone.ai and create a project named 'ccctw-music'",
        "2. Connect your GitHub repository",
        "3. Set build command: pnpm --filter @ccctw-music/web build",
        "4. Set output directory: apps/web/dist",
        "5. Set environment variables: APP_ENV=production, RUNTIME=edgeone, UNIFIED_API_BASE_URL=https://ccctw-music-api.1934202608.workers.dev",
        "6. Do not bind EdgeOne KV/DB/COS for this app; API data is unified through Cloudflare Worker",
        "7. Configure DNSPod: domestic → EdgeOne, overseas → Cloudflare",
      ],
    },
    null,
    2,
  ),
);

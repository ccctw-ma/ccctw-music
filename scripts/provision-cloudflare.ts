import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const wranglerPath = resolve(projectRoot, "apps/server/wrangler.toml");

interface CloudflareAccount {
  id: string;
  name: string;
}

interface CloudflareApiResponse<T> {
  success?: boolean;
  result: T;
  errors?: Array<{ message: string }>;
}

interface CloudflareError extends Error {
  status?: number;
}

interface KvNamespace {
  id: string;
  title?: string;
}

interface D1Database {
  id?: string;
  uuid?: string;
  name: string;
}

interface R2Bucket {
  name?: string;
}

type SettledResource<T> =
  | {
      name: string;
      status: "created_or_exists";
      value: T;
      error?: undefined;
    }
  | {
      name: string;
      status: "skipped";
      value?: undefined;
      error: string;
    };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function errorStatus(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error
    ? (error as { status?: number }).status
    : undefined;
}

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
  } catch (error: unknown) {
    if (typeof error !== "object" || error === null || !("code" in error) || error.code !== "ENOENT") {
      throw error;
    }
  }
}

await loadLocalEnv();

let accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;

const names = {
  worker: process.env.CLOUDFLARE_WORKER_NAME ?? "ccctw-music-api",
  kv: process.env.CLOUDFLARE_KV_NAME ?? "ccctw-music-cache",
  kvPreview: process.env.CLOUDFLARE_KV_PREVIEW_NAME ?? "ccctw-music-cache-preview",
  d1: process.env.CLOUDFLARE_D1_NAME ?? "ccctw-music",
  r2: process.env.CLOUDFLARE_R2_BUCKET ?? "ccctw-music-assets",
};

if (!token) {
  console.error(
    [
      "Missing Cloudflare credentials.",
      "Please export:",
      "  export CLOUDFLARE_API_TOKEN=<token-with-workers-kv-d1-r2-permissions>",
      "Optional:",
      "  export CLOUDFLARE_ACCOUNT_ID=<your-account-id>",
    ].join("\n"),
  );
  process.exit(1);
}
const cloudflareToken = token;

async function cloudflare<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${cloudflareToken}`);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers,
  });
  const text = await response.text();
  const body = (text ? JSON.parse(text) : {}) as CloudflareApiResponse<T>;
  if (!response.ok || body.success === false) {
    const message = body.errors?.map((error) => error.message).join("; ") || response.statusText;
    const error = new Error(`${init.method ?? "GET"} ${path} failed: ${message}`) as CloudflareError;
    error.status = response.status;
    throw error;
  }
  return body.result;
}

async function maybeGet<T>(path: string) {
  try {
    return await cloudflare<T>(path);
  } catch (error: unknown) {
    if (errorStatus(error) === 404) {
      return null;
    }
    throw error;
  }
}

async function resolveAccountId() {
  const accounts = await cloudflare<CloudflareAccount[]>("/accounts");
  const matched = accountId ? accounts.find((account) => account.id === accountId) : null;
  if (matched) {
    return matched.id;
  }

  if (accounts.length === 1) {
    console.warn(
      accountId
        ? "Provided CLOUDFLARE_ACCOUNT_ID is not accessible. Falling back to the only account available to this token."
        : "CLOUDFLARE_ACCOUNT_ID is not set. Using the only account available to this token.",
    );
    return accounts[0].id;
  }

  const available = accounts.map((account) => `${account.name} (${account.id})`).join(", ");
  throw new Error(
    accountId
      ? `Provided CLOUDFLARE_ACCOUNT_ID is not accessible. Available accounts: ${available}`
      : `CLOUDFLARE_ACCOUNT_ID is required because this token can access multiple accounts: ${available}`,
  );
}

async function findKvNamespace(title: string) {
  const namespaces = await cloudflare<KvNamespace[]>(`/accounts/${accountId}/storage/kv/namespaces`);
  return namespaces.find((namespace) => namespace.title === title) ?? null;
}

async function ensureKvNamespace(title: string) {
  const existing = await findKvNamespace(title);
  if (existing) {
    return existing;
  }

  return cloudflare<KvNamespace>(`/accounts/${accountId}/storage/kv/namespaces`, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}

async function ensureD1Database() {
  const databases = await cloudflare<D1Database[]>(`/accounts/${accountId}/d1/database`);
  const existing = databases.find((database) => database.name === names.d1);
  if (existing) {
    return existing;
  }

  return cloudflare<D1Database>(`/accounts/${accountId}/d1/database`, {
    method: "POST",
    body: JSON.stringify({ name: names.d1 }),
  });
}

async function ensureR2Bucket() {
  const existing = await maybeGet<R2Bucket>(`/accounts/${accountId}/r2/buckets/${names.r2}`);
  if (existing) {
    return existing;
  }

  return cloudflare<R2Bucket>(`/accounts/${accountId}/r2/buckets/${names.r2}`, {
    method: "PUT",
  });
}

function getD1DatabaseId(database: D1Database) {
  const id = database.uuid ?? database.id;
  if (!id) {
    throw new Error(`D1 database ${database.name} is missing an id`);
  }
  return id;
}

async function ensureWorkerScript(kvNamespace: KvNamespace, d1DatabaseId: string) {
  const metadata = {
    main_module: "worker.js",
    bindings: [
      {
        type: "kv_namespace",
        name: "MUSIC_CACHE",
        namespace_id: kvNamespace.id,
      },
      {
        type: "d1",
        name: "DB",
        id: d1DatabaseId,
      },
    ],
  };

  const source = `
export default {
  async fetch() {
    return new Response("ccctw-music-api provisioned", {
      headers: { "content-type": "text/plain; charset=utf-8" }
    });
  }
};
`;

  const form = new FormData();
  form.set("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }), "metadata.json");
  form.set("worker.js", new Blob([source], { type: "application/javascript+module" }), "worker.js");

  return cloudflare<unknown>(`/accounts/${accountId}/workers/scripts/${names.worker}`, {
    method: "PUT",
    headers: {},
    body: form,
  });
}

function replaceTomlValue(toml: string, key: string, value: string) {
  return toml.replace(new RegExp(`^${key} = ".*"$`, "m"), `${key} = "${value}"`);
}

async function settle<T>(name: string, task: () => Promise<T>): Promise<SettledResource<T>> {
  try {
    return {
      name,
      status: "created_or_exists",
      value: await task(),
    };
  } catch (error: unknown) {
    return {
      name,
      status: "skipped",
      error: errorMessage(error),
    };
  }
}

accountId = await resolveAccountId();

const [kvResult, kvPreviewResult, d1Result, r2Result] = await Promise.all([
  settle("kv", () => ensureKvNamespace(names.kv)),
  settle("kvPreview", () => ensureKvNamespace(names.kvPreview)),
  settle("d1", ensureD1Database),
  settle("r2", ensureR2Bucket),
]);

const kv = kvResult.value;
const kvPreview = kvPreviewResult.value;
const d1 = d1Result.value;

if (!kv || !kvPreview || !d1) {
  throw new Error("Required resources were not created. KV and D1 permissions are required.");
}

const d1DatabaseId = getD1DatabaseId(d1);

let wrangler = await readFile(wranglerPath, "utf8");
wrangler = replaceTomlValue(wrangler, "name", names.worker);
wrangler = replaceTomlValue(wrangler, "id", kv.id);
wrangler = replaceTomlValue(wrangler, "preview_id", kvPreview.id);
wrangler = replaceTomlValue(wrangler, "database_id", d1DatabaseId);
await writeFile(wranglerPath, wrangler);

const workerResult = await settle("worker", () => ensureWorkerScript(kv, d1DatabaseId));

console.log(
  JSON.stringify(
    {
      accountId,
      worker: {
        status: workerResult.status,
        name: names.worker,
        customDomain: "music.ccctw.com",
        error: workerResult.error,
      },
      kv: {
        binding: "MUSIC_CACHE",
        id: kv.id,
        preview_id: kvPreview.id,
      },
      d1: {
        binding: "DB",
        name: d1.name,
        database_id: d1DatabaseId,
      },
      r2: {
        status: r2Result.status,
        bucket: r2Result.value?.name ?? names.r2,
        error: r2Result.error,
      },
      updated: "apps/server/wrangler.toml",
    },
    null,
    2,
  ),
);

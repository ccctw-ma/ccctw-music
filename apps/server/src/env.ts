export interface Env {
  APP_ENV: string;
  RUNTIME?: "cloudflare-workers" | "edgeone";
  UNIFIED_API_BASE_URL?: string;
  MUSIC_CACHE?: KVNamespace;
  DB?: D1Database;
}

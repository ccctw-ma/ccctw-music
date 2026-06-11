export interface Env {
  APP_ENV: string;
  RUNTIME?: "cloudflare-workers" | "edgeone";
  MUSIC_CACHE?: KVNamespace;
  DB?: D1Database;
}

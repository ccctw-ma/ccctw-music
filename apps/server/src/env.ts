export interface Env {
  APP_ENV: string;
  MUSIC_CACHE?: KVNamespace;
  DB?: D1Database;
}

import app from "./index";
import type { Env } from "./env";

/**
 * EdgeOne Pages Functions entry point.
 *
 * EdgeOne provides Workers-compatible KV bindings through the `env` parameter,
 * so the same Hono app and cache.ts work without modification.
 * The RUNTIME env var is set to "edgeone" in the EdgeOne config to identify the platform.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return app.fetch(request, env);
  },
};

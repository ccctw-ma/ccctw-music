/**
 * EdgeOne Pages Function — catch-all API handler.
 *
 * All /api/* requests are routed to the Hono app via the EdgeOne entry point.
 * EdgeOne KV bindings are available through env.MUSIC_CACHE with the same
 * get/put API as Cloudflare KV, so the existing cache layer works unchanged.
 */
export { default as onRequest } from "../../../src/entry-edgeone";

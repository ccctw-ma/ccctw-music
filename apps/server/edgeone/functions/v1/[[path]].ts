/**
 * EdgeOne Pages Function — API v1 catch-all handler.
 *
 * When domestic DNS routes music.ccctw.com to EdgeOne, the browser still calls
 * https://music.ccctw.com/v1/*, so EdgeOne must serve the same Hono API paths
 * as Cloudflare Workers.
 */
export { default as onRequest } from "../../../src/entry-edgeone";

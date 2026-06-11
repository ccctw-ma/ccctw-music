/**
 * EdgeOne Pages Function - API v1 catch-all proxy.
 *
 * Domestic EdgeOne traffic keeps the same /v1/* paths and proxies them to the
 * unified Cloudflare Worker backend, where KV/D1/R2 remain the source of truth.
 */
import edgeoneEntry from "../../apps/server/src/entry-edgeone";
import type { Env } from "../../apps/server/src/env";

interface EdgeOneContext {
  request: Request;
  env: Env;
}

export function onRequest(context: EdgeOneContext) {
  return edgeoneEntry.fetch(context.request, context.env);
}

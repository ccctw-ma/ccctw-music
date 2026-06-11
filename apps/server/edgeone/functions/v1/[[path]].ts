/**
 * EdgeOne Pages Function — API v1 catch-all proxy.
 *
 * When domestic DNS routes music.ccctw.com to EdgeOne, the browser still calls
 * https://music.ccctw.com/v1/*. This function proxies those requests to the
 * unified Cloudflare backend so cache, database, and object storage stay shared.
 */
import edgeoneEntry from "../../../src/entry-edgeone";
import type { Env } from "../../../src/env";

interface EdgeOneContext {
  request: Request;
  env: Env;
}

export function onRequest(context: EdgeOneContext) {
  return edgeoneEntry.fetch(context.request, context.env);
}

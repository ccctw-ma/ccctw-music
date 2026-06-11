/**
 * EdgeOne Pages Function — legacy /api/* proxy handler.
 *
 * Current Web traffic uses /v1/*, but this keeps older /api/* links routed to
 * the unified Cloudflare backend instead of creating a second EdgeOne data
 * plane.
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

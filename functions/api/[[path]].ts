/**
 * EdgeOne Pages Function - legacy /api/* proxy.
 *
 * Current app traffic uses /v1/*, but this keeps older /api/* requests on the
 * same unified Cloudflare backend instead of creating a second data plane.
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

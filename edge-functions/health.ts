/**
 * EdgeOne Edge Function - health proxy endpoint.
 */
import edgeoneEntry from "../apps/server/src/entry-edgeone";
import type { Env } from "../apps/server/src/env";

interface EdgeOneContext {
  request: Request;
  env: Env;
}

export default function onRequest(context: EdgeOneContext) {
  return edgeoneEntry.fetch(context.request, context.env);
}

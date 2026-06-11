/**
 * EdgeOne Pages Function — health proxy endpoint.
 */
import edgeoneEntry from "../../src/entry-edgeone";
import type { Env } from "../../src/env";

interface EdgeOneContext {
  request: Request;
  env: Env;
}

export function onRequest(context: EdgeOneContext) {
  return edgeoneEntry.fetch(context.request, context.env);
}

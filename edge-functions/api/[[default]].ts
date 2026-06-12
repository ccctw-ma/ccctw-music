const UNIFIED_API_BASE_URL = "https://ccctw-music-api.1934202608.workers.dev";

export default function onRequest({ request }: { request: Request }) {
  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(UNIFIED_API_BASE_URL);
  targetUrl.pathname = incomingUrl.pathname;
  targetUrl.search = incomingUrl.search;

  return Response.redirect(targetUrl.toString(), 302);
}

import { searchQuerySchema } from "@ccctw-music/contracts";
import { getProvider, searchAcrossProviders } from "@ccctw-music/music-providers";
import type { MusicProvider } from "@ccctw-music/music-providers";
import type { Context } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createProviderContext } from "./cache";
import type { Env } from "./env";

const app = new Hono<{ Bindings: Env }>();
const URL_CACHE_TTL_SECONDS = 60 * 10;
const LYRIC_CACHE_TTL_SECONDS = 60 * 60 * 24;

type AppContext = Context<{ Bindings: Env }>;
type ProviderResolution = { provider: MusicProvider; response?: never } | { provider?: never; response: Response };

function getProviderOrResponse(context: AppContext): ProviderResolution {
  const provider = getProvider(context.req.param("source") as never);
  if (!provider) {
    return {
      response: context.json({ error: { code: "SOURCE_NOT_SUPPORTED", message: "暂不支持该音乐来源" } }, 404),
    };
  }

  return { provider };
}

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.get("/health", (context) =>
  context.json({
    ok: true,
    service: "ccctw-music-api",
    runtime: "cloudflare-workers",
  }),
);

app.get("/v1/search", async (context) => {
  const parsed = searchQuerySchema.safeParse({
    keyword: context.req.query("keyword"),
    page: context.req.query("page"),
    pageSize: context.req.query("pageSize"),
    sources: context.req.query("sources"),
  });

  if (!parsed.success) {
    return context.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: "搜索参数不正确",
          detail: parsed.error.flatten(),
        },
      },
      400,
    );
  }

  const data = await searchAcrossProviders(parsed.data, createProviderContext(context.env));
  return context.json({ data });
});

app.get("/v1/songs/:source/:id", async (context) => {
  const resolved = getProviderOrResponse(context);
  if (resolved.response) {
    return resolved.response;
  }

  const providerContext = createProviderContext(context.env);
  const data = await resolved.provider.songDetail(context.req.param("id"), providerContext);
  return context.json({ data });
});

app.get("/v1/songs/:source/:id/lyric", async (context) => {
  const resolved = getProviderOrResponse(context);
  if (resolved.response) {
    return resolved.response;
  }

  const providerContext = createProviderContext(context.env);
  const cacheKey = `lyric:${context.req.param("source")}:${context.req.param("id")}`;
  const cached = await providerContext.cache?.get<Awaited<ReturnType<typeof resolved.provider.lyric>>>(cacheKey);
  if (cached) {
    return context.json({ data: cached });
  }

  const lyric = await resolved.provider.lyric(context.req.param("id"), providerContext);
  await providerContext.cache?.set(cacheKey, lyric, LYRIC_CACHE_TTL_SECONDS);
  return context.json({ data: lyric });
});

app.get("/v1/songs/:source/:id/url", async (context) => {
  const resolved = getProviderOrResponse(context);
  if (resolved.response) {
    return resolved.response;
  }

  const providerContext = createProviderContext(context.env);
  const cacheKey = `url:v3:${context.req.param("source")}:${context.req.param("id")}`;
  const cached = await providerContext.cache?.get<Awaited<ReturnType<typeof resolved.provider.playableUrl>>>(cacheKey);
  if (cached) {
    return context.json({ data: cached });
  }

  const playableUrl = await resolved.provider.playableUrl(context.req.param("id"), providerContext);
  if (playableUrl.url) {
    await providerContext.cache?.set(cacheKey, playableUrl, URL_CACHE_TTL_SECONDS);
  }
  return context.json({ data: playableUrl });
});

export default app;

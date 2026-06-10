import { searchQuerySchema } from "@ccctw-music/contracts";
import { getProvider, searchAcrossProviders } from "@ccctw-music/music-providers";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createProviderContext } from "./cache";
import type { Env } from "./env";

const app = new Hono<{ Bindings: Env }>();

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

app.get("/v1/songs/:source/:id/lyric", async (context) => {
  const provider = getProvider(context.req.param("source") as never);
  if (!provider) {
    return context.json({ error: { code: "SOURCE_NOT_SUPPORTED", message: "暂不支持该音乐来源" } }, 404);
  }

  const lyric = await provider.lyric(context.req.param("id"), createProviderContext(context.env));
  return context.json({ data: lyric });
});

app.get("/v1/songs/:source/:id/url", async (context) => {
  const provider = getProvider(context.req.param("source") as never);
  if (!provider) {
    return context.json({ error: { code: "SOURCE_NOT_SUPPORTED", message: "暂不支持该音乐来源" } }, 404);
  }

  const playableUrl = await provider.playableUrl(context.req.param("id"), createProviderContext(context.env));
  return context.json({ data: playableUrl });
});

export default app;

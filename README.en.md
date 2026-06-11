# CCCTW Music

[中文](./README.md) | English

CCCTW Music is a multi-platform music application for Web, desktop, iOS, Android, and future HarmonyOS shells. The mainline app is a pure React SPA, backed by Cloudflare Workers and a unified music provider layer for Migu, NetEase Cloud Music, QQ Music, and future sources.

## Project Requirements

- The mainline architecture must remain React SPA + Rsbuild/Rspack. Do not move the runtime mainline back to Next.js.
- Source files must use TypeScript / TSX only. Do not add `.js`, `.jsx`, `.mjs`, or `.cjs` source files.
- The server must use Cloudflare Workers + Hono. Frontend and backend types are shared through contracts, core types, and the API client.
- The Web UI should keep the sky-blue immersive theme, compact layout, and accessible interaction copy.
- Any change to feature logic, API contracts, data flow, cache policy, deployment flow, or architecture must update both `README.md` and `README.en.md`.
- Agents working on this project must follow `agent.md`.

## Architecture

- `apps/web`: React + Rsbuild/Rspack + TypeScript Web SPA for search, playback, lyrics, queue, favorites, and responsive UI.
- `apps/server`: Cloudflare Workers + Hono API for search, song details, lyrics, and playable URLs.
- `apps/desktop`: Tauri shell that reuses `apps/web/dist`.
- `apps/mobile`: Capacitor shell that reuses `apps/web/dist`.
- `packages/core`: Music domain models, formatting, lyric parsing, and player queue logic.
- `packages/contracts`: Zod schemas for request and response constraints.
- `packages/api-client`: Type-safe browser client for the Worker API.
- `packages/music-providers`: Provider adapters for Migu, NetEase Cloud Music, and QQ Music.
- `packages/platform`: Platform capability abstractions.
- `packages/ui`: UI scoring and shared UI logic.
- `e2e`: Playwright Web E2E tests and UI style score gates.

## Music Data Flow

The frontend does not call third-party music services directly. It calls the Worker API, which normalizes provider data into shared domain types.

```text
Web UI
  -> @ccctw-music/api-client
  -> Cloudflare Worker / Hono API
  -> @ccctw-music/music-providers
  -> migu / netease / qq upstream APIs
```

Core endpoints:

- `GET /health`: Checks Worker API health.
- `GET /v1/search?keyword=晴天&page=1&pageSize=30&sources=migu,netease,qq`: Searches songs across sources.
- `GET /v1/songs/:source/:id`: Gets song details.
- `GET /v1/songs/:source/:id/lyric`: Gets raw lyrics and structured lyric lines.
- `GET /v1/songs/:source/:id/url`: Gets a playable audio URL.

Provider behavior:

- Default sources are `migu`, `netease`, and `qq`.
- Cross-source search deduplicates repeated sources and requests providers concurrently.
- Search results are returned by source. A single provider failure does not fail the whole search request.
- Every song is normalized into the shared `Song` structure and includes a `quality` field for source, official status, free playback, quality level, and ranking score.
- The API prioritizes official, free-playable, high-quality results, and the frontend shows source and quality badges.
- All upstream music API calls use an 8-second default timeout to prevent slow providers from blocking search or playback.
- Migu song details are loaded by `copyrightId` through `resourceinfo.do` first, then fall back to search results when needed.
- Lyrics are cached for 24 hours. Search results and playable URLs are cached for 10 minutes.
- Playable URLs are cached only when non-empty. Do not cache `null` or invalid URLs because that would block fallback.
- The Web player first tries direct URLs from search results. If frontend direct playback fails, it requests the Cloudflare server to resolve a playable URL. If that also fails, it skips candidates and finally shows an interface error.
- Live playback is verified by `scripts/verify-live-playback.ts` through the production API and audio Range requests.

## Research References

- [Migu MusicApi documentation](https://jsososo.github.io/MiguMusicApi/): `/song` supports `cid/copyrightId` for song information.
- [QQ Music vkey practice](https://www.cnblogs.com/Byme/p/9989544.html): QQ playback URLs still rely on `songmid + filename + vkey`.
- [NeteaseCloudMusicApi notes](https://blog.csdn.net/gitblog_00564/article/details/161223949): NetEase commonly combines search, lyric, and song URL modules.
- [@magicdawn/music-api](https://www.npmjs.com/package/@magicdawn/music-api): A reference for unified multi-source music API wrapping.

## Local Development

```bash
pnpm install
pnpm dev:web
pnpm dev:server
```

Common commands:

- `pnpm build`: Builds and checks all workspaces.
- `pnpm test:unit`: Runs Vitest unit tests and coverage.
- `pnpm test:e2e`: Runs Playwright Web E2E tests.
- `pnpm score:ui`: Runs the UI style score gate.
- `pnpm test:live-playback`: Verifies production live playback.
- `pnpm quality`: Runs the full quality gate.

## Quality Gates

Run at least the following command after feature or architecture changes:

```bash
pnpm quality
```

Quality requirements:

- Unit test coverage must stay above 90%.
- Web E2E must cover key paths such as search, playback, lyrics, progress, favorites, queue, bottom controls, and empty states.
- UI style gate must stay above 90. The current target is 100 for both Desktop and Mobile.
- Changes related to playback must run `pnpm test:live-playback`.

See `docs/quality-gates.md` for details.

## Deployment

Deployment must be triggered by GitHub Actions only. Local manual deployment is not the main deployment path.

- Web: Cloudflare Pages, output directory `apps/web/dist`.
- API: Cloudflare Workers, service name `ccctw-music-api`.
- CI flow: push to `main` -> Quality Gate -> Deploy Worker -> Verify live playback -> Deploy Pages.
- See `docs/cloudflare-setup.md` for Cloudflare resources.
- See `docs/ci-cd.md` for commit gates and automated deployment.

## Documentation Maintenance

- Chinese README: `README.md`.
- English README: `README.en.md`.
- Agent guidelines: `agent.md`.
- Changes to feature logic, APIs, providers, cache policy, deployment, or architecture must update both README files.
- Style, copy, or test-only changes can skip README updates when project behavior does not change.

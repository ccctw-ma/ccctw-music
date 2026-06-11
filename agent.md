# Agent Guidelines

This file defines the project rules that coding agents must follow when changing CCCTW Music.

## Product Direction

- Build a multi-platform music app with a pure React SPA mainline and shared Web output for desktop and mobile shells.
- Keep the Web UI in a sky-blue immersive theme with compact information density and precise interaction copy.
- Make user-facing music features actually usable, not just visually present. Search, playback, lyrics, progress, favorites, queue, and bottom controls should be covered by Web E2E when changed.

## Architecture Rules

- Keep the runtime mainline as React SPA + Rsbuild/Rspack. Do not reintroduce Next.js as the active application architecture.
- Use Cloudflare Workers + Hono for server APIs.
- Use shared packages for reusable logic:
- `packages/core` for domain types, formatting, lyrics, and playback logic.
- `packages/contracts` for request and response schemas.
- `packages/api-client` for typed frontend API calls.
- `packages/music-providers` for Migu, NetEase Cloud Music, QQ Music, and future provider integrations.
- `packages/platform` for platform abstractions.
- `packages/ui` for shared UI quality logic.
- Keep frontend code from directly calling third-party music providers. The browser should call the Worker API through `@ccctw-music/api-client`.

## TypeScript Rules

- All source and script files must be TypeScript or TSX.
- Do not add `.js`, `.jsx`, `.mjs`, or `.cjs` source files.
- React files that contain JSX must use `.tsx`.
- Node scripts must use `.ts` and run through `tsx`.
- Keep `allowJs` disabled.

## Music Provider Rules

- Provider adapters must implement search, song detail, lyric, and playable URL behavior through the `MusicProvider` interface.
- Search should tolerate partial provider failures. One failed provider must not fail the whole cross-provider search when other providers succeed.
- Do not cache `null` or invalid playable URLs.
- Cache search results and playable URLs for short TTLs only, because third-party music URLs can expire.
- Lyrics can use a longer TTL because they are more stable.
- Playback-related changes must be verified with live playback checks, not mock-only tests.

## Testing Rules

- Preserve 90%+ coverage for statements, branches, functions, and lines.
- Add or update focused tests for feature logic, provider behavior, API contracts, and regression-prone playback paths.
- Web E2E should cover the actual user path when UI behavior changes.
- UI changes should keep the UI style gate above 90.
- Playback changes must run `pnpm test:live-playback`.

Recommended verification before handoff:

```bash
pnpm format:check
pnpm build
pnpm test:unit
pnpm test:e2e
pnpm score:ui
pnpm check:targets
pnpm test:live-playback
```

Use `pnpm quality` for the standard combined quality gate.

## Deployment Rules

- Do not use local manual deployment as the main release path.
- Deploy through GitHub Actions by pushing to `main`.
- The deployment flow must remain: Quality Gate -> Deploy Worker -> Verify live playback -> Deploy Pages.
- Cloudflare Workers and Pages credentials must stay in GitHub Secrets.

## Documentation Rules

- Maintain two README versions:
- `README.md` for Chinese.
- `README.en.md` for English.
- Every change to feature logic, API contracts, data flow, provider behavior, cache policy, deployment, or architecture must update both README files.
- Keep the two README files aligned in structure and meaning.
- If a change only touches formatting, tests, comments, or internal refactors with no behavior or architecture impact, README updates are optional.
- Keep this `agent.md` updated when project rules or agent workflow expectations change.

## Git Safety

- Do not revert user changes unless the user explicitly asks.
- Do not use destructive Git commands such as `git reset --hard` or `git checkout --` without explicit approval.
- If unexpected unrelated file changes appear, stop and ask the user how to proceed.

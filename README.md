# CCCTW Music

中文 | [English](./README.en.md)

CCCTW Music 是一个面向 Web、桌面端、iOS、Android 和后续鸿蒙端的多端音乐应用。当前主线是纯 React SPA，后端运行在 Cloudflare Workers，通过统一的音乐 Provider 层聚合咪咕、网易云、QQ 音乐等来源。

## 项目要求

- 主线架构必须保持 React SPA + Rsbuild/Rspack，禁止把运行主线切回 Next.js。
- 全仓源码使用 TypeScript / TSX，禁止新增 `.js`、`.jsx`、`.mjs`、`.cjs` 源文件。
- 服务端使用 Cloudflare Workers + Hono，前后端通过共享 contracts、core 类型和 API client 保持类型一致。
- Web UI 保持天蓝色沉浸式主题、紧凑布局和清晰可访问的交互文案。
- 每次涉及功能逻辑、接口协议、数据流、缓存策略、部署流程或架构的变更，都必须同步更新 `README.md` 和 `README.en.md`。
- Agent 执行项目任务时必须遵守 `agent.md`。

## 技术架构

- `apps/web`：React + Rsbuild/Rspack + TypeScript 的 Web SPA，负责搜索、播放、歌词、队列、收藏和响应式 UI。
- `apps/server`：Cloudflare Workers + Hono API，提供搜索、歌曲详情、歌词和播放 URL 接口，并通过 Worker 静态资源托管 `apps/web/dist`。
- `apps/desktop`：Tauri 壳，复用 `apps/web/dist`。
- `apps/mobile`：Capacitor 壳，复用 `apps/web/dist`。
- `packages/core`：音乐领域模型、格式化、歌词解析、播放队列等纯逻辑。
- `packages/contracts`：Zod 请求/响应约束，保证 API 入参一致。
- `packages/api-client`：浏览器端调用 Worker API 的类型安全客户端。
- `packages/music-providers`：音乐来源适配层，封装咪咕、网易云、QQ 音乐的搜索、详情、歌词和播放 URL 获取逻辑。
- `packages/platform`：平台能力抽象。
- `packages/ui`：UI 评分和共享 UI 逻辑。
- `e2e`：Playwright Web E2E 和 UI 风格评分门禁。

## 音乐信息获取

Web 端搜索优先由浏览器直接访问可用的第三方音乐接口；浏览器失败或返回空结果的来源，再由 Worker API 兜底并归一为统一格式。

```text
Web UI
  -> browser-first direct provider search
  -> Cloudflare Worker / Hono API fallback
  -> @ccctw-music/music-providers
  -> migu / netease / qq upstream APIs
```

核心接口：

- `GET /health`：检查 Worker API 健康状态。
- `GET /v1/search?keyword=晴天&page=1&pageSize=30&sources=migu,netease,qq`：跨来源搜索歌曲。
- `GET /v1/songs/:source/:id`：获取歌曲详情。
- `GET /v1/songs/:source/:id/lyric`：获取歌词，返回原始歌词和结构化歌词行。
- `GET /v1/songs/:source/:id/url`：获取可播放音频 URL。

Provider 行为：

- 默认搜索来源为 `migu`、`netease`、`qq`。
- 跨来源搜索会去重重复 source，并并发请求各 Provider。
- Web 端搜索优先由浏览器直接请求三方音乐接口；浏览器直连失败或返回空结果的来源，再由 Cloudflare Worker 服务端兜底补齐。
- 搜索结果按来源分组返回，单个来源失败不会导致整体搜索失败。
- 每首歌都会归一为统一 `Song` 结构，并包含 `quality` 字段标识来源、正版、免费可播、音质和排序分。
- API 会优先返回正版、免费可播、高质量的结果，前端会展示来源和质量标签。
- 所有上游音乐接口默认 8 秒超时，避免慢接口拖垮整体搜索或播放链路。
- 咪咕歌曲详情优先通过 `copyrightId` 调用 `resourceinfo.do` 获取准确元数据，失败时回退到搜索结果。
- 歌词缓存 24 小时，搜索和播放 URL 缓存 10 分钟。
- 播放 URL 只缓存非空结果，禁止缓存 `null` 或失效 URL，避免阻断 fallback。
- 前端播放时优先尝试搜索结果内的直链；如果没有直链，会优先使用浏览器友好的三方播放解析器；如果前端解析失败，再请求 Cloudflare 服务端解析播放 URL；如果仍失败，会自动切换候选歌曲并最终提示接口错误。
- 真实播放能力由 `scripts/verify-live-playback.ts` 对线上 API 和音频 Range 请求做拨测。

## 调研参考

- [咪咕 MusicApi 文档](https://jsososo.github.io/MiguMusicApi/)：`/song` 支持使用 `cid/copyrightId` 获取歌曲信息。
- [QQ 音乐 vkey 获取实践](https://www.cnblogs.com/Byme/p/9989544.html)：QQ 播放 URL 仍依赖 `songmid + filename + vkey` 生成。
- [NeteaseCloudMusicApi 相关说明](https://blog.csdn.net/gitblog_00564/article/details/161223949)：网易云常用搜索、歌词、歌曲播放 URL 模块组合。
- [@magicdawn/music-api](https://www.npmjs.com/package/@magicdawn/music-api)：多来源音乐 API 的统一封装思路。
- [DreamMeting API](https://music.3e0.cn/)：作为浏览器友好的网易云播放 URL 解析兜底。

## 本地开发

```bash
pnpm install
pnpm dev:web
pnpm dev:server
```

常用命令：

- `pnpm build`：构建并检查所有 workspace。
- `pnpm test:unit`：运行 Vitest 单元测试和覆盖率。
- `pnpm test:e2e`：运行 Playwright Web E2E。
- `pnpm score:ui`：运行 UI 风格评分门禁。
- `pnpm test:live-playback`：拨测线上真实播放链路。
- `pnpm quality`：运行完整质量门禁。

## 质量门禁

每次功能或架构变更完成后至少运行：

```bash
pnpm quality
```

质量要求：

- 单元测试覆盖率必须保持 90% 以上。
- Web E2E 必须覆盖搜索、播放、歌词、进度、收藏、队列、底部控制和空状态等关键链路。
- UI style gate 必须大于 90 分，当前目标为 Desktop / Mobile 双端 100 分。
- 真实播放相关变更必须运行 `pnpm test:live-playback`。

更多说明见 `docs/quality-gates.md`。

## 部署

部署只能通过自动化平台触发，禁止本地手动部署作为主流程。

- 海外线路：Cloudflare Worker，服务名 `ccctw-music-api`，自定义域名 `https://music.ccctw.com`。
- 国内/中国香港线路：Tencent EdgeOne Pages，项目名 `ccctw-music`，用于承载 Web 静态资源，并通过 EdgeOne 函数把 `/health` 和 `/v1/*` 代理到统一 Cloudflare Worker API。
- Cloudflare Web 静态资源：`apps/web/dist` 通过 `apps/server/wrangler.toml` 的 `[assets]` 配置随 Worker 一起发布。
- `music.ccctw.com` 的 Cloudflare Worker 自定义域名在控制台维护，CI 只更新 Worker，不在 `wrangler.toml` 中管理 routes。
- EdgeOne Web 静态资源：根目录 `edgeone.json` 使用顶层 `buildCommand`、`installCommand`、`outputDirectory` 配置，构建命令为 `pnpm --filter @ccctw-music/web build`，输出目录为 `apps/web/dist`。
- EdgeOne 函数入口：仓库根目录 `edge-functions/` 覆盖 `/health`、`/v1/*` 和兼容的 `/api/*` 代理路径，避免落到 Node 云函数导致代理超时。
- 统一数据层：Cache、DB、对象存储统一由 Cloudflare Worker 访问和维护，当前使用 Cloudflare KV/D1/R2；EdgeOne 不绑定独立 KV/DB/COS，避免国内外数据分裂。
- EdgeOne API 代理目标由 `UNIFIED_API_BASE_URL` 配置，默认指向 `https://ccctw-music-api.1934202608.workers.dev`，用于避免同域 DNS 分流下的代理回环。
- Cloudflare CI 流程：提交到 `main` -> Quality Gate -> Build Web -> Deploy Worker -> Verify live playback。
- 仓库内禁止保留 `next.config.*`、根目录 `pages/` 或 npm `package-lock.json` 等 Next.js 检测信号，避免 EdgeOne 误加载 OpenNext 构建器。
- 后续不再部署 Cloudflare Pages，双线流量由 DNS 分流到 EdgeOne 和 Cloudflare。
- Cloudflare 资源创建清单见 `docs/cloudflare-setup.md`。
- 提交门禁和自动部署说明见 `docs/ci-cd.md`。

## 文档维护

- 中文 README：`README.md`。
- 英文 README：`README.en.md`。
- Agent 规范：`agent.md`。
- 功能逻辑、接口、Provider、缓存、部署和架构变更必须同步更新中英文 README。
- 只调整样式、文案或测试时，如果不影响项目行为，可以只在必要时更新文档。

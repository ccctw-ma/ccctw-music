# Cloudflare 部署前置清单

## 必须创建

推荐直接使用自动化脚本：

```bash
export CLOUDFLARE_ACCOUNT_ID=<your-account-id>
export CLOUDFLARE_API_TOKEN=<token-with-pages-workers-kv-d1-r2-permissions>
pnpm cloudflare:provision
```

如果你的终端环境无法被 Agent 继承，也可以在项目根目录创建已被 `.gitignore` 忽略的 `.env.local`：

```bash
CLOUDFLARE_ACCOUNT_ID=<your-account-id>
CLOUDFLARE_API_TOKEN=<token-with-pages-workers-kv-d1-r2-permissions>
```

脚本会自动创建 Pages、KV、D1、R2，并把 KV / D1 ID 回写到 `apps/server/wrangler.toml`。

1. Cloudflare Pages 项目

- 项目名：`ccctw-music`
- 构建命令：`pnpm --filter @ccctw-music/web build`
- 输出目录：`apps/web/dist`
- 环境变量：`PUBLIC_API_BASE_URL=https://<你的-worker域名>`

2. Cloudflare Workers 项目

- Worker 名：`ccctw-music-api`
- 配置文件：`apps/server/wrangler.toml`
- 部署命令：`pnpm deploy:server`

3. KV Namespace

- 用途：缓存搜索结果、歌词、歌曲详情。
- Binding 名：`MUSIC_CACHE`
- 创建命令：

```bash
pnpm --filter @ccctw-music/server exec wrangler kv namespace create MUSIC_CACHE
pnpm --filter @ccctw-music/server exec wrangler kv namespace create MUSIC_CACHE --preview
```

创建后把返回的 `id` 和 `preview_id` 填入 `apps/server/wrangler.toml`。

4. D1 Database

- 用途：用户、收藏、歌单、播放历史。
- Binding 名：`DB`
- 数据库名：`ccctw-music`
- 创建命令：

```bash
pnpm --filter @ccctw-music/server exec wrangler d1 create ccctw-music
```

创建后把返回的 `database_id` 填入 `apps/server/wrangler.toml`。

## 可选创建

1. R2 Bucket

- 用途：封面缓存、导入导出文件、后续离线资源。
- 建议 Bucket 名：`ccctw-music-assets`

2. 自定义域名

- Web：`music.<your-domain>`
- API：`api.music.<your-domain>`

3. Turnstile

- 用途：登录、敏感写接口、防刷。
- 目前未接入，等用户系统落地后再启用。

## 当前阻塞项

当前代码可以本地完成构建、测试、E2E 和多端配置校验。真正部署到 Cloudflare 前，需要你提供：

- Cloudflare Account 权限。
- KV 的 `id` 与 `preview_id`。
- D1 的 `database_id`。
- Pages 项目的正式域名或预览域名。
- Worker 的正式域名。

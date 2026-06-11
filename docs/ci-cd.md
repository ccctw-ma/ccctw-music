# CI/CD 与提交门禁

## 本地提交门禁

项目使用 Husky + lint-staged 作为 Git pre-commit 门禁。

每次 `git commit` 前会自动执行：

```bash
pnpm lint-staged
pnpm lint
pnpm test:unit
```

门禁效果：

- `lint-staged`：对 staged 文件执行 Prettier 自动格式化。
- `pnpm lint`：执行 workspace TypeScript 类型检查。
- `pnpm test:unit`：执行 Vitest 单测和覆盖率门禁。

覆盖率阈值：

- Statements >= 90%
- Branches >= 90%
- Functions >= 90%
- Lines >= 90%

## 手动全量质量门禁

每次重要变更后执行：

```bash
pnpm quality
```

它会执行：

```bash
pnpm format:check
pnpm build
pnpm test:unit
pnpm test:e2e
pnpm check:targets
```

## GitHub Actions

Workflow 文件：

```text
.github/workflows/ci-deploy.yml
```

触发条件：

- push 到 `main`
- push 到 `master`
- 手动 `workflow_dispatch`

执行阶段：

- `quality`：安装依赖、安装 Playwright Chromium、执行 `pnpm quality`。
- `deploy`：质量门禁通过后构建 Web，并将 Web 静态资源和 API 一起部署到 Cloudflare Worker。

## GitHub Secrets

已通过 `gh` CLI 写入仓库：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

后续如果 Cloudflare token 轮换，执行：

```bash
pnpm github:secrets
```

该命令会从本地 `.env.local` 读取凭证并同步到 GitHub Secrets。

## 双线部署

生产流量通过 DNS 分流：

- 国内/中国香港：Tencent EdgeOne Pages。
- 海外：Cloudflare Worker。

## Cloudflare 部署

Worker：

```bash
pnpm deploy:server
```

当前线上地址：

- Web + API Worker: `https://music.ccctw.com`

说明：

- GitHub Actions 中的 Web 构建使用 `PUBLIC_API_BASE_URL=https://music.ccctw.com`。
- `apps/server/wrangler.toml` 通过 `[assets]` 挂载 `apps/web/dist`，因此不再部署 Cloudflare Pages。
- `pnpm test:live-playback` 在 Worker 部署后对 `https://music.ccctw.com` 做真实播放拨测。

## EdgeOne 部署

EdgeOne Pages 项目名：`ccctw-music`。

构建配置必须使用静态 SPA 配置：

```bash
pnpm install --frozen-lockfile
pnpm --filter @ccctw-music/web build
```

输出目录：

```text
apps/web/dist
```

注意事项：

- 根目录 `edgeone.json` 的 `buildCommand`、`installCommand`、`outputDirectory` 必须是顶层字段。
- 仓库内不要保留 `next.config.*`、根目录 `pages/` 或 npm `package-lock.json`，否则 EdgeOne 可能误加载 OpenNext 构建器并查找 `.next/required-server-files.json`。
- EdgeOne 函数需要覆盖 `/health` 和 `/v1/*`，确保国内线路的 API 与 Cloudflare 路径一致。
- EdgeOne 控制台还需要绑定 `MUSIC_CACHE` KV。

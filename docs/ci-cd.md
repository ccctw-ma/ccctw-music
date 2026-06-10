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
- `deploy`：质量门禁通过后部署 Cloudflare Worker 和 Cloudflare Pages。

## GitHub Secrets

已通过 `gh` CLI 写入仓库：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

后续如果 Cloudflare token 轮换，执行：

```bash
pnpm github:secrets
```

该命令会从本地 `.env.local` 读取凭证并同步到 GitHub Secrets。

## Cloudflare 部署

Worker：

```bash
pnpm deploy:server
```

Pages：

```bash
PUBLIC_API_BASE_URL=https://ccctw-music-api.1934202608.workers.dev pnpm deploy:web
```

当前线上地址：

- Worker: `https://ccctw-music-api.1934202608.workers.dev`
- Pages preview: `https://a535b68e.ccctw-music.pages.dev`
- Pages project subdomain: `ccctw-music.pages.dev`

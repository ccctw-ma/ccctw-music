# CCCTW Music

一个面向 Web、桌面端、iOS、Android 和鸿蒙端的多端音乐应用。

## 技术架构

- Web：React + Rsbuild/Rspack + TypeScript
- 服务端：Cloudflare Workers + Hono + TypeScript
- 工程：pnpm workspace + Turborepo
- 共享核心：core、contracts、api-client、music-providers、platform、ui
- 后续端壳：Tauri、Capacitor、ArkTS Shell + ArkWeb

## 开发

```bash
pnpm install
pnpm dev:web
pnpm dev:server
```

## 质量门禁

每次变更完成后运行：

```bash
pnpm quality
```

该命令会自动执行：

- 全 workspace 构建
- Vitest 单元测试和 90%+ 覆盖率门禁
- Playwright Web E2E
- Desktop / Mobile / Harmony 多端配置检查

更多说明见 `docs/quality-gates.md`。

提交门禁和 GitHub 自动部署说明见 `docs/ci-cd.md`。

## 部署

- Web：Cloudflare Pages，构建命令 `pnpm --filter @ccctw-music/web build`，产物目录 `apps/web/dist`
- API：Cloudflare Workers，执行 `pnpm deploy:server`
- Cloudflare 资源创建清单见 `docs/cloudflare-setup.md`

## 迁移说明

旧的 Next.js 代码暂时保留在 `pages/`、`components/`、`util/` 中作为迁移参考。新的主线代码位于 `apps/` 和 `packages/`。

# 质量门禁

每次变更完成后必须执行：

```bash
pnpm quality
```

该命令包含以下自动化检查：

- `pnpm build`：构建全部 workspace，并验证 Web、Server、Desktop、Mobile、Harmony。
- `pnpm test:unit`：运行 Vitest 单元测试和覆盖率门禁。
- `pnpm test:e2e`：运行 Playwright Web 端端到端测试。
- `pnpm check:targets`：验证 PC、手机、鸿蒙端壳都能复用 Web 构建产物。

## 覆盖率阈值

当前覆盖率门禁配置在 `vitest.config.ts`：

- Statements >= 90%
- Branches >= 90%
- Functions >= 90%
- Lines >= 90%

当前验证结果：

- Statements: 98.96%
- Branches: 91.03%
- Functions: 100%
- Lines: 98.91%

## 多端验收指标

- Web：`@ccctw-music/web build` 必须成功产出 `apps/web/dist/index.html`。
- Desktop：`@ccctw-music/desktop check` 必须确认 Tauri 配置指向共享 Web dist。
- Mobile：`@ccctw-music/mobile check` 必须确认 Capacitor 配置指向共享 Web dist。
- Harmony：`@ccctw-music/harmony check` 必须确认 ArkWeb 配置指向共享 Web dist，并声明 JSBridge 能力。

## 原生打包说明

当前 CI 级门禁验证的是多端工程配置和共享 Web 产物，不等同于本机完成原生商店包构建。

- Windows / Mac / Linux 原生包：执行 `pnpm --filter @ccctw-music/desktop build:native`，需要 Rust、Tauri 系统依赖和平台签名配置。
- iOS / Android 原生包：执行 `pnpm --filter @ccctw-music/mobile sync` 后在 Xcode / Android Studio 构建，需要对应 SDK。
- HarmonyOS 原生包：在 DevEco Studio 打开 `apps/harmony` 后配置 SDK，再执行 Hvigor 构建。

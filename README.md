# job-sync（Tauri + Vue + Node sidecar）

一个 Windows 桌面端（Tauri）Boss 直聘采集器：浏览器登录采集 Cookie / LocalStorage、手动 / 自动采集落库（SQLite）、导出（CSV / JSON）、简历 AI 分析。

## 目录结构

- 前端：`src/`
- Tauri（Rust）：`src-tauri/`
- Node sidecar（Puppeteer）：`packages/boss-crawler-worker/`

## 开发环境要求（Windows）

- Node.js 20
- Rust（stable）+ `cargo`
- Tauri 依赖（MSVC 工具链、WebView2 等）

## 安装依赖（可选：跳过 Chromium 下载）

在 Windows `cmd` 里（只对当前窗口生效）：

```bat
set "PUPPETEER_SKIP_DOWNLOAD=1" && npm install
```

永久生效（对“新打开”的终端生效）：

```bat
setx PUPPETEER_SKIP_DOWNLOAD 1
```

如果你跳过了下载，需要指定本机 Chrome / Edge 路径（示例二选一）：

```bat
set "PUPPETEER_EXECUTABLE_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
```

```bat
set "PUPPETEER_EXECUTABLE_PATH=C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
```

## 启动（开发）

```bat
npm run tauri:dev
```

- 说明：`src-tauri/tauri.conf.json` 的 `beforeDevCommand` 会先构建 `packages/boss-crawler-worker/dist/`，避免找不到 worker 入口。
- 如果你看到 “Waiting for your frontend dev server...”，检查 `vite.config.ts` 的端口是否为 `1430`，以及 `src-tauri/tauri.conf.json` 的 `devUrl` 是否为 `http://localhost:1430`。

## 打包（Windows）

```bat
npm run tauri:build
```

- 说明：`scripts/tauri-build.mjs` 会使用 `src-tauri/tauri.conf.release.json`（包含 `bundle.externalBin`），并在 `beforeBuildCommand` 里生成 sidecar 可执行体到 `src-tauri/bin/`，再打进安装包。

## 功能特性

- **采集**：手动 / 自动两种模式，自动模式支持关键词、城市、薪资、经验等多维筛选，带限流参数（maxPages / maxJobs / delayMs）
- **AI 分析**：简历导入支持粘贴文本或选择 PDF 文件（互斥模式切换），通过职位库搜索选择目标职位，模型列表从 API 动态加载（下拉选择），调用 OpenAI 兼容 API 生成结构化匹配报告
- **职位库**：SQLite 落库，支持搜索、详情查看、CSV / JSON 导出
- **原生对话框**：通过 `@tauri-apps/plugin-dialog` 实现 PDF 文件选择
- **窗口尺寸**：默认 1200x800，适配侧边栏布局

## 推荐 IDE

- VS Code + Vue - Official + Tauri + rust-analyzer

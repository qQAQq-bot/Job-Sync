# Tauri Rust Source

This directory contains the Rust application entrypoints, command handlers, storage, and domain services for the desktop app.

## Notable files and modules

- `main.rs`, `lib.rs` — Tauri application bootstrap and command registration.
- `commands/` — Tauri command handlers for crawling, jobs, exports, AI features, settings, and resume workspace actions.
- `db/` — SQLite models, migrations, and database helpers.
- `ipc/` — shared IPC protocol definitions.
- `paths.rs`, `settings.rs`, `storage/`, `sidecar/`, `worker.rs` — filesystem paths, settings persistence, local storage, sidecar control, and worker orchestration, including bundled `node.exe + boss-crawler-worker/` runtime discovery for release/portable builds plus development-mode Node fallback.
- `resume_text.rs` — resolves resume text from raw input or files.
- `resume_workspace.rs` — resume workspace draft models and the canonical `assemble_resume_text()` implementation that assembles confirmed sections in summary, projects, experience, and skills order.
- `resume_pdf_support.rs`, `resume_pdf_template.rs` — final resume PDF rendering support.

## Windows 便携版运行前提

- 系统已安装 WebView2 Runtime
- 系统已安装 Chrome 或 Edge
- 或用户在设置页中配置浏览器可执行文件路径

便携版目录包含：

- `job-sync.exe`
- `node.exe`
- `boss-crawler-worker/`

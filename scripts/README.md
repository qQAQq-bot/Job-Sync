# Build Scripts

This directory contains local Node-based build helpers used by the desktop release workflow.

## Files

- `tauri-build.mjs` — runs the Tauri release build with `src-tauri/tauri.conf.release.json`.
- `stage-worker-runtime.mjs` — builds `packages/boss-crawler-worker`, stages `dist/`, `package.json`, production dependencies, and the host `node.exe` into `src-tauri/bin/` for Windows release packaging.
- `build-portable.mjs` — creates the portable Windows distribution by reusing the release build, copying `job-sync.exe`, `node.exe`, and the staged `boss-crawler-worker/` runtime directory into `release-portable/job-sync/`, and generating a portable zip archive; supports `--skip-build` to package from existing release artifacts.
- `export-resume-pdf.mjs` — renders resume HTML into a PDF using Puppeteer.

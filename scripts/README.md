# Build Scripts

This directory contains local Node-based build helpers used by the desktop release workflow.

## Files

- `tauri-build.mjs` — runs the Tauri release build with `src-tauri/tauri.conf.release.json`.
- `stage-worker-runtime.mjs` — stages the Windows worker runtime into `src-tauri/bin/` for release packaging, including `node.exe`, `boss-crawler-worker/dist/`, `package.json`, and production `node_modules`.
- `build-portable.mjs` — creates the portable Windows distribution by reusing the release build, copying `job-sync.exe`, `node.exe`, and the staged `boss-crawler-worker/` runtime into `release-portable/job-sync/`, and generating a portable zip archive; supports `--skip-build` to package from existing release artifacts.
- `export-resume-pdf.mjs` — renders resume HTML into a PDF using Puppeteer.

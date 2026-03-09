# Frontend Library Modules

This directory contains reusable TypeScript helpers, API wrappers, and page composables for the Vue frontend.

## Notable files

- `resumeWorkspace.ts` — defines resume workspace types, module metadata, default draft creation, and Tauri command wrappers for diagnosis, module rewriting, final assembly, persistence, and PDF export.
- `crawl.ts`, `useCrawlPage.ts` — crawl command types and crawl page state helpers.
- `jobs.ts`, `jobsPageHelpers.ts`, `useJobsPage.ts` — job list data access and UI helpers.
- `aiReport.ts`, `aiReportsMeta.ts`, `aiSelection.ts`, `useAiReportsPage.ts` — AI report data structures, selection logic, and report page state.
- `protocol.ts`, `runtime.ts`, `sidecar.ts`, `tauri.ts` — shared runtime, sidecar, and Tauri bridge utilities.
- `useCopy.ts` — clipboard helper logic.

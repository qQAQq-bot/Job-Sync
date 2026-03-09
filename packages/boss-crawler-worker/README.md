# boss-crawler-worker

Node.js sidecar process that drives a real Chromium browser via Puppeteer Extra to collect job data from Boss Zhipin (zhipin.com).

## Directory Structure

```
src/
├── main.ts               # Sidecar entry — reads NDJSON commands from stdin, dispatches to mode handlers
├── protocol.ts           # Shared NDJSON command/event type definitions (Zod schemas)
├── stdio.ts              # stdin/stdout NDJSON transport helpers
├── boss/                 # Boss Zhipin domain logic
│   ├── selectors.ts      # Page selectors, API path constants, and URLs
│   ├── parser.ts         # Shared encryptJobId extraction & API URL matching utilities
│   └── filters.ts        # Filter application logic (city, salary, experience, etc.)
├── modes/                # Crawl mode implementations
│   ├── login.ts          # Login mode — opens browser for user to log in, collects cookies
│   ├── manual.ts         # Manual crawl — user browses, sidecar intercepts API responses
│   ├── auto.ts           # Auto crawl — keyword search, pagination, detail collection
│   └── ai.ts             # AI analysis mode — resume vs. job matching via OpenAI
├── browser/              # Browser lifecycle & anti-detection
│   ├── launch.ts         # Puppeteer Extra browser launch with stealth plugins
│   ├── stealth.ts        # Anti-bot evasion (Function.prototype.toString proxy, etc.)
│   ├── ua.ts             # User-Agent cleanup (remove HeadlessChrome markers)
│   └── navigationLock.ts # Domain allowlist — blocks off-site navigation
├── ai/                   # AI integration
│   ├── client.ts         # OpenAI API client wrapper
│   └── prompt.ts         # Prompt construction for resume-job matching
└── utils/                # General utilities
    ├── delay.ts          # Sleep / jittered delay helpers
    └── sage-time.ts      # Intelligent rate limiter (operation quota + cooldown)
```

## Communication Protocol

Communicates with the Tauri (Rust) host process over **stdin/stdout NDJSON**:

- **stdin** receives commands: `LOGIN_START`, `CRAWL_MANUAL_START`, `CRAWL_AUTO_START`, `AI_ANALYZE`, `STOP`, `PAUSE`, `RESUME`
- **stdout** emits events: `LOG`, `PROGRESS`, `LOGIN_STATUS`, `COOKIE_COLLECTED`, `JOB_LIST_CAPTURED`, `JOB_DETAIL_CAPTURED`, `AI_RESULT`, `FINISHED`, `ERROR`

## Supported API Endpoints

| Purpose | API Path |
|---------|----------|
| User info (login check) | `/wapi/zpuser/wap/getUserInfo.json` |
| Job list (search) | `/wapi/zpgeek/search/joblist.json` |
| Job list (recommend) | `/wapi/zpgeek/pc/recommend/job/list.json` |
| Job detail | `/wapi/zpgeek/job/detail.json` |

## Build

```bash
npm run build:worker
```

Output goes to `dist/main.cjs` (CommonJS bundle for pkg/sidecar packaging).

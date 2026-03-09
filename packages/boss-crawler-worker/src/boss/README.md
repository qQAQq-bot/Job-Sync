# boss/ — Boss Zhipin Domain Logic

Domain-specific modules for interacting with Boss Zhipin (zhipin.com) APIs and pages.

## Files

| File | Purpose |
|------|---------|
| `selectors.ts` | CSS selectors for page elements, API path constants (`API_PATH`), and canonical URLs (`URLS`) |
| `parser.ts` | Shared utilities for extracting `encryptJobId` from API requests/responses and matching job-list/detail API URLs |
| `filters.ts` | Logic for applying search filters (city, salary, experience, degree, etc.) by clicking UI elements |

## API Path Constants

Defined in `selectors.ts`:

- `API_PATH.USER_INFO` — `/wapi/zpuser/wap/getUserInfo.json`
- `API_PATH.JOB_LIST` — `/wapi/zpgeek/search/joblist.json` (search results)
- `API_PATH.JOB_LIST_RECOMMEND` — `/wapi/zpgeek/pc/recommend/job/list.json` (recommended jobs)
- `API_PATH.JOB_DETAIL` — `/wapi/zpgeek/job/detail.json`

## encryptJobId Extraction (parser.ts)

The `extractEncryptJobId()` function attempts multiple strategies in priority order:

1. **URL query param `encryptJobId`** — legacy format
2. **URL query param `lid`** — new format, extracts first segment before `.` (e.g. `4AaGU9eHjUb` from `4AaGU9eHjUb.search.10`)
3. **Response body** — multi-path lookup: `zpData.jobInfo.encryptJobId`, `zpData.jobInfo.encryptId`, `zpData.encryptJobId`, etc.
4. **POST data** — parses JSON body or URLSearchParams
5. **Referer header** — extracts from query params or `/job_detail/{id}.html` path pattern

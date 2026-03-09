import { API_PATH } from "./selectors.js";

/**
 * Check whether a URL matches any known job-list API path.
 */
export function isJobListApi(url: string): boolean {
  return url.includes(API_PATH.JOB_LIST) || url.includes(API_PATH.JOB_LIST_RECOMMEND);
}

/**
 * Check whether a URL matches the job-detail API path.
 */
export function isJobDetailApi(url: string): boolean {
  return url.includes(API_PATH.JOB_DETAIL);
}

/**
 * Extract encryptJobId from the request URL query params and response body.
 *
 * Priority:
 *  1. URL query param `encryptJobId` (legacy format)
 *  2. URL query param `lid` — first segment before "."
 *  3. Response body multi-path lookup
 */
export function pickEncryptJobId(requestUrl: string, body: unknown): string | null {
  try {
    const u = new URL(requestUrl);

    const fromQuery = u.searchParams.get("encryptJobId");
    if (fromQuery) return fromQuery;

    const lid = u.searchParams.get("lid");
    if (lid) {
      const seg = lid.split(".")[0];
      if (seg) return seg;
    }
  } catch {
    // ignore
  }

  return pickEncryptJobIdFromBody(body);
}

/**
 * Extract encryptJobId from a parsed JSON body (response or post-data).
 */
function pickEncryptJobIdFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const obj = body as Record<string, unknown>;

  const candidates: unknown[] = [
    obj.encryptJobId,
    (obj.zpData as Record<string, unknown> | undefined)?.jobInfo &&
      ((obj.zpData as Record<string, unknown>).jobInfo as Record<string, unknown>)?.encryptJobId,
    (obj.zpData as Record<string, unknown> | undefined)?.jobInfo &&
      ((obj.zpData as Record<string, unknown>).jobInfo as Record<string, unknown>)?.encryptId,
    (obj.zpData as Record<string, unknown> | undefined)?.encryptJobId,
    (obj.zpData as Record<string, unknown> | undefined)?.encryptId,
    (obj.zpData as Record<string, unknown> | undefined)?.encrypt_job_id,
    (obj.jobInfo as Record<string, unknown> | undefined)?.encryptJobId,
    (obj.jobInfo as Record<string, unknown> | undefined)?.encryptId,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c) return c;
  }
  return null;
}

/**
 * Extract encryptJobId from raw POST data (JSON string or URLSearchParams).
 */
export function pickEncryptJobIdFromPostData(postData: string | undefined): string | null {
  const raw = postData?.trim();
  if (!raw) return null;

  if (raw.startsWith("{") || raw.startsWith("[")) {
    try {
      return pickEncryptJobIdFromBody(JSON.parse(raw));
    } catch {
      // ignore
    }
  }

  try {
    const params = new URLSearchParams(raw);
    const fromParams = params.get("encryptJobId") ?? params.get("encrypt_job_id");
    if (fromParams) return fromParams;

    const lid = params.get("lid");
    if (lid) {
      const seg = lid.split(".")[0];
      if (seg) return seg;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Extract encryptJobId from the Referer header.
 */
export function pickEncryptJobIdFromReferer(referer: string | undefined): string | null {
  if (!referer) return null;
  try {
    const u = new URL(referer);

    const fromQuery = u.searchParams.get("encryptJobId") ?? u.searchParams.get("encrypt_job_id");
    if (fromQuery) return fromQuery;

    const lid = u.searchParams.get("lid");
    if (lid) {
      const seg = lid.split(".")[0];
      if (seg) return seg;
    }

    const m = u.pathname.match(/\/job_detail\/([^/]+)\.html/i);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Attempt all extraction strategies in priority order and return the
 * encryptJobId, or null if every strategy fails.
 */
export function extractEncryptJobId(
  requestUrl: string,
  responseBody: unknown,
  postData: string | undefined,
  headers: Record<string, string>,
): string | null {
  let id = pickEncryptJobId(requestUrl, responseBody);
  if (id) return id;

  id = pickEncryptJobIdFromPostData(postData);
  if (id) return id;

  id = pickEncryptJobIdFromReferer(headers?.referer ?? headers?.referrer);
  return id;
}

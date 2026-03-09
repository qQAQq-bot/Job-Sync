import type { Page } from "puppeteer";

import { API_PATH } from "../../boss/selectors.js";
import { delayWithJitter } from "../../utils/delay.js";

import type { ModeContext } from "./types.js";

type ApiFilters = {
  city: string;
  salary: string;
  experience: string;
  degree: string;
  industry: string;
  scale: string;
};

type PageFetchJsonResult = { status: number; json: any | null; error?: string };

export function safeError(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) return { message: err.message, stack: err.stack };
  return { message: String(err) };
}

export function detectRiskUrl(url: string): "captcha" | "denied" | null {
  const u = url.toLowerCase();
  if (u.includes("403")) return "denied";
  if (u.includes("security-check")) return "captcha";
  if (u.includes("verify-slider")) return "captcha";
  return null;
}

export function readApiCode(raw: any): number | null {
  const code = raw?.code;
  if (typeof code === "number" && Number.isFinite(code)) return code;
  if (typeof code === "string") {
    const trimmed = code.trim();
    if (/^-?\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

export function readApiMessage(raw: any): string {
  const msg = raw?.message;
  return typeof msg === "string" ? msg : "";
}

export function isAbnormalAccess(raw: any): boolean {
  const code = readApiCode(raw);
  if (code === 37) return true;
  const msg = readApiMessage(raw);
  if (msg.includes("访问行为异常")) return true;
  return false;
}

export async function setLocalStorage(page: Page, localStorage: Record<string, string>): Promise<void> {
  await page.evaluate((entries) => {
    for (const [k, v] of Object.entries(entries)) {
      window.localStorage.setItem(k, v);
    }
  }, localStorage);
}

function pickFirstScalar(v: unknown): string | undefined {
  if (typeof v === "string") {
    const s = v.trim();
    return s ? s : undefined;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return String(v);
  }
  if (Array.isArray(v)) {
    return pickFirstScalar(v[0]);
  }
  return undefined;
}

function pickCodeOrEmpty(raw: unknown, key: string, warn: (msg: string) => void): string {
  const v = pickFirstScalar(raw);
  if (!v) return "";
  if (!/^\d+$/.test(v)) {
    warn(`筛选项 ${key}=${v} 不是数字 code，将被忽略。`);
    return "";
  }
  if (v === "0") return "";
  return v;
}

export function normalizeFilters(raw: unknown, warn: (msg: string) => void): ApiFilters {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    city: pickCodeOrEmpty(obj.city, "city", warn),
    salary: pickCodeOrEmpty(obj.salary, "salary", warn),
    experience: pickCodeOrEmpty(obj.experience, "experience", warn),
    degree: pickCodeOrEmpty(obj.degree, "degree", warn),
    industry: pickCodeOrEmpty(obj.industry, "industry", warn),
    scale: pickCodeOrEmpty(obj.scale, "scale", warn),
  };
}

export function buildJobListBody(keyword: string, page: number, pageSize: number, filters: ApiFilters): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  params.set("query", keyword);
  params.set("city", filters.city);
  params.set("expectInfo", "");
  params.set("jobType", "");
  params.set("salary", filters.salary);
  params.set("experience", filters.experience);
  params.set("degree", filters.degree);
  params.set("industry", filters.industry);
  params.set("scale", filters.scale);
  params.set("scene", "1");
  params.set("encryptExpectId", "");
  return params.toString();
}

export function buildJobDetailUrl(securityId: string, lid?: string): string {
  const u = new URL(`https://www.zhipin.com${API_PATH.JOB_DETAIL}`);
  u.searchParams.set("securityId", securityId);
  if (lid) u.searchParams.set("lid", lid);
  u.searchParams.set("scene", "1");
  return u.toString();
}

export function buildJobDetailBody(securityId: string, lid?: string): string {
  const params = new URLSearchParams();
  params.set("securityId", securityId);
  if (lid) params.set("lid", lid);
  params.set("scene", "1");
  return params.toString();
}

export async function fetchJsonFromPage(
  page: Page,
  url: string,
  options: { method: "GET" | "POST"; body?: string; timeoutMs?: number },
): Promise<PageFetchJsonResult> {
  const timeoutMs = typeof options.timeoutMs === "number" ? options.timeoutMs : 30_000;
  const body = typeof options.body === "string" ? options.body : null;

  return await page.evaluate(
    async (u, method, bodyText, timeout, contentType) => {
      const controller = new AbortController();
      const t = window.setTimeout(() => controller.abort(), timeout);
      try {
        const headers: Record<string, string> = {
          "x-requested-with": "XMLHttpRequest",
        };
        if (contentType) headers["content-type"] = contentType;

        const res = await fetch(u, {
          method,
          credentials: "include",
          headers,
          body: bodyText ?? undefined,
          signal: controller.signal,
        });

        let json: any = null;
        try {
          json = await res.json();
        } catch {
          json = null;
        }
        return { status: res.status, json } as PageFetchJsonResult;
      } catch (err) {
        return { status: 0, json: null, error: String(err) } as PageFetchJsonResult;
      } finally {
        window.clearTimeout(t);
      }
    },
    url,
    options.method,
    body,
    timeoutMs,
    options.method === "POST" ? "application/x-www-form-urlencoded; charset=UTF-8" : null,
  );
}

export async function waitUntilApiOk(
  page: Page,
  ctx: ModeContext,
  label: string,
  request: () => Promise<PageFetchJsonResult>,
): Promise<PageFetchJsonResult | null> {
  ctx.emit({
    type: "LOG",
    payload: {
      level: "warn",
      message: `${label} 触发风控或访问异常，已暂停自动采集；请在浏览器窗口完成人机验证/登录，程序会自动重试。`,
    },
  });

  let lastStatus: string | null = null;
  while (!ctx.signal.aborted) {
    const risk = detectRiskUrl(page.url());
    if (risk && lastStatus !== risk) {
      ctx.emit({ type: "LOGIN_STATUS", payload: { status: risk, message: `检测到风控页面：${page.url()}` } });
      lastStatus = risk;
    }

    await delayWithJitter(5000, ctx.signal, 5000);
    if (ctx.signal.aborted) return null;

    const res = await request();
    if (ctx.signal.aborted) return null;

    if (res.status === 403) {
      if (lastStatus !== "denied") {
        ctx.emit({
          type: "LOGIN_STATUS",
          payload: { status: "denied", message: `${label} 接口返回 403（可能触发风控）。` },
        });
        lastStatus = "denied";
      }
      continue;
    }

    const raw = res.json;
    if (!raw || typeof raw !== "object") continue;

    const code = readApiCode(raw);
    if (code === 0) {
      if (lastStatus) ctx.emit({ type: "LOGIN_STATUS", payload: { status: "ok" } });
      return res;
    }

    if (isAbnormalAccess(raw)) {
      if (lastStatus !== "captcha") {
        const msg = readApiMessage(raw);
        ctx.emit({
          type: "LOGIN_STATUS",
          payload: {
            status: "captcha",
            message: `${label} 接口返回访问异常：${msg || "code=37"}。请在浏览器窗口完成人机验证后自动重试。`,
          },
        });
        lastStatus = "captcha";
      }
      continue;
    }

    return res;
  }

  return null;
}

export async function waitUntilNoRiskUrl(page: Page, ctx: ModeContext): Promise<void> {
  let lastRisk: string | null = null;
  while (!ctx.signal.aborted) {
    const url = page.url();
    const risk = detectRiskUrl(url);
    if (risk) {
      if (lastRisk !== risk) {
        ctx.emit({ type: "LOGIN_STATUS", payload: { status: risk, message: `检测到风控页面：${url}` } });
        lastRisk = risk;
      }
      await delayWithJitter(1500, ctx.signal, 1000);
      continue;
    }
    if (lastRisk) ctx.emit({ type: "LOGIN_STATUS", payload: { status: "ok" } });
    return;
  }
}

export function extractJobList(raw: any): { jobs: any[]; hasMore: boolean } {
  const zpData = raw?.zpData;
  const jobs = Array.isArray(zpData?.jobList) ? zpData.jobList : [];
  const hasMore = zpData?.hasMore === true;
  return { jobs, hasMore };
}


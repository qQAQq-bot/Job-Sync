import type { Page, HTTPResponse } from "puppeteer";

import { API_PATH } from "./selectors.js";

export type BossMetaParts = {
  synced_at?: string;
  city_group?: unknown;
  filter_conditions?: unknown;
  industry_filter_exemption?: unknown;
};

function nowIso(): string {
  return new Date().toISOString();
}

function isCityGroupApi(url: string): boolean {
  return url.includes(API_PATH.CITY_GROUP);
}

function isFilterConditionsApi(url: string): boolean {
  return url.includes(API_PATH.FILTER_CONDITIONS);
}

function isIndustryFilterExemptionApi(url: string): boolean {
  return url.includes(API_PATH.INDUSTRY_FILTER_EXEMPTION);
}

async function safeJson(res: HTTPResponse): Promise<any | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function pickZpData(raw: any): unknown | null {
  if (!raw || typeof raw !== "object") return null;
  if (raw.code !== 0) return null;
  return raw.zpData ?? null;
}

export async function collectBossMetaByListening(
  page: Page,
  signal: AbortSignal,
  options?: { timeoutMs?: number },
): Promise<BossMetaParts> {
  const timeoutMs = typeof options?.timeoutMs === "number" ? options.timeoutMs : 8000;

  let city_group: unknown | undefined;
  let filter_conditions: unknown | undefined;
  let industry_filter_exemption: unknown | undefined;

  let resolveDone: (() => void) | null = null;
  const done = new Promise<void>((resolve) => { resolveDone = resolve; });

  const maybeDone = (): void => {
    if (city_group && filter_conditions && industry_filter_exemption) resolveDone?.();
  };

  const onResponse = async (res: HTTPResponse): Promise<void> => {
    if (signal.aborted) return;
    const url = res.url();

    if (!city_group && isCityGroupApi(url)) {
      const raw = await safeJson(res);
      const zpData = pickZpData(raw);
      if (zpData) {
        city_group = zpData;
        maybeDone();
      }
      return;
    }

    if (!filter_conditions && isFilterConditionsApi(url)) {
      const raw = await safeJson(res);
      const zpData = pickZpData(raw);
      if (zpData) {
        filter_conditions = zpData;
        maybeDone();
      }
    }

    if (!industry_filter_exemption && isIndustryFilterExemptionApi(url)) {
      const raw = await safeJson(res);
      const zpData = pickZpData(raw);
      if (zpData) {
        industry_filter_exemption = zpData;
        maybeDone();
      }
    }
  };

  page.on("response", onResponse);

  try {
    const ts = Date.now();
    await page.evaluate(
      async (cityPath, conditionsPath, industryPath, t) => {
        const base = "https://www.zhipin.com";
        await Promise.allSettled([
          fetch(`${base}${cityPath}?_=${t}`, { credentials: "include" }),
          fetch(`${base}${conditionsPath}?_=${t}`, { credentials: "include" }),
          fetch(`${base}${industryPath}?_=${t}`, { credentials: "include" }),
        ]);
      },
      API_PATH.CITY_GROUP,
      API_PATH.FILTER_CONDITIONS,
      API_PATH.INDUSTRY_FILTER_EXEMPTION,
      ts,
    );

    await Promise.race([
      done,
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
      new Promise<void>((resolve) => {
        if (signal.aborted) return resolve();
        signal.addEventListener("abort", () => resolve(), { once: true });
      }),
    ]);
  } finally {
    page.off("response", onResponse);
  }

  const out: BossMetaParts = { synced_at: nowIso() };
  if (city_group) out.city_group = city_group;
  if (filter_conditions) out.filter_conditions = filter_conditions;
  if (industry_filter_exemption) out.industry_filter_exemption = industry_filter_exemption;
  return out;
}

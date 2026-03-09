import type { Page } from "puppeteer";
import type { z } from "zod";

import { launchBrowser } from "../browser/launch.js";
import { blockNavigation } from "../browser/navigationLock.js";
import type { CrawlManualStartPayloadSchema, EventOut } from "../protocol.js";
import { collectBossMetaByListening } from "../boss/meta.js";
import { URLS } from "../boss/selectors.js";
import { isJobListApi, isJobDetailApi, extractEncryptJobId } from "../boss/parser.js";
import { delay } from "../utils/delay.js";

export type CrawlManualStartPayload = z.infer<typeof CrawlManualStartPayloadSchema>;

export type ModeContext = {
  emit: (event: EventOut) => void;
  signal: AbortSignal;
};

function safeError(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) return { message: err.message, stack: err.stack };
  return { message: String(err) };
}

async function safeJson(res: any): Promise<any | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function detectRiskUrl(url: string): "captcha" | "denied" | null {
  const u = url.toLowerCase();
  if (u.includes("403")) return "denied";
  if (u.includes("security-check")) return "captcha";
  if (u.includes("verify-slider")) return "captcha";
  return null;
}

async function setLocalStorage(page: Page, localStorage: Record<string, string>): Promise<void> {
  await page.evaluate((entries) => {
    for (const [k, v] of Object.entries(entries)) {
      window.localStorage.setItem(k, v);
    }
  }, localStorage);
}

function extractSecurityIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.searchParams.get("securityId");
  } catch {
    return null;
  }
}

export async function runManualMode(payload: CrawlManualStartPayload, ctx: ModeContext): Promise<void> {
  ctx.emit({ type: "LOG", payload: { level: "info", message: "启动手动采集模式。" } });

  const { browser, page } = await launchBrowser({ headless: false });

  try {
    await blockNavigation(page, { allow_domain_suffixes: ["zhipin.com"] });

    let missingDetailIdLogs = 0;
    page.on("response", async (res) => {
      const url = res.url();
      if (isJobListApi(url)) {
        const raw = await safeJson(res);
        if (raw) {
          ctx.emit({ type: "JOB_LIST_CAPTURED", payload: { raw } });
        }
        return;
      }

      if (isJobDetailApi(url)) {
        const raw = await safeJson(res);
        if (!raw) return;
        const req = res.request();
        const reqUrl = req.url();
        const headers: Record<string, string> = req.headers?.() ?? {};

        // Prefer securityId as the canonical job identifier.
        let encrypt_job_id: string | null = extractSecurityIdFromUrl(reqUrl);
        if (!encrypt_job_id) {
          encrypt_job_id = extractEncryptJobId(reqUrl, raw, req.postData(), headers);
        }

        if (!encrypt_job_id) {
          if (missingDetailIdLogs < 3) {
            missingDetailIdLogs += 1;
            ctx.emit({
              type: "LOG",
              payload: { level: "warn", message: `捕获到 job/detail 接口，但无法解析 securityId：${reqUrl}` },
            });
          }
          return;
        }
        const zp_data = raw?.zpData ?? raw;
        ctx.emit({ type: "JOB_DETAIL_CAPTURED", payload: { encrypt_job_id, zp_data } });
      }
    });

    const cookies = payload.session.cookies;
    if (Array.isArray(cookies) && cookies.length > 0) {
      await page.setCookie(...(cookies as any[]));
    }

    await page.goto(URLS.DESKTOP, { waitUntil: "domcontentloaded" });
    const local_storage = payload.session.local_storage;
    if (local_storage && typeof local_storage === "object") {
      await setLocalStorage(page, local_storage as Record<string, string>);
    }

    await page.goto(URLS.GEEK_JOBS, { waitUntil: "domcontentloaded" });

    const meta = await collectBossMetaByListening(page, ctx.signal).catch(() => null);
    if (meta && (meta.city_group || meta.filter_conditions || meta.industry_filter_exemption)) {
      ctx.emit({ type: "BOSS_META_SYNCED", payload: meta });
    }

    let lastRisk: string | null = null;
    while (!ctx.signal.aborted) {
      const currentUrl = page.url();
      const risk = detectRiskUrl(currentUrl);
      if (risk) {
        if (lastRisk !== risk) {
          ctx.emit({
            type: "LOGIN_STATUS",
            payload: { status: risk, message: `检测到风控页面：${currentUrl}` },
          });
          lastRisk = risk;
        }
        await delay(1000, ctx.signal);
        continue;
      }
      if (lastRisk) {
        ctx.emit({ type: "LOGIN_STATUS", payload: { status: "ok" } });
        lastRisk = null;
      }
      await delay(1000, ctx.signal);
    }
  } catch (err) {
    ctx.emit({ type: "ERROR", payload: safeError(err) });
  } finally {
    await browser.close().catch(() => undefined);
    ctx.emit({ type: "FINISHED" });
  }
}

import type { Page } from "puppeteer";
import type { z } from "zod";

import { launchBrowser } from "../browser/launch.js";
import { blockNavigation } from "../browser/navigationLock.js";
import { collectBossMetaByListening } from "../boss/meta.js";
import { URLS } from "../boss/selectors.js";
import type { BossMetaSyncPayloadSchema, EventOut } from "../protocol.js";

export type BossMetaSyncPayload = z.infer<typeof BossMetaSyncPayloadSchema>;

export type ModeContext = {
  emit: (event: EventOut) => void;
  signal: AbortSignal;
};

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

export async function runBossMetaSyncMode(payload: BossMetaSyncPayload, ctx: ModeContext): Promise<void> {
  ctx.emit({ type: "LOG", payload: { level: "info", message: "同步 Boss 城市、行业与筛选项…" } });

  const { browser, page } = await launchBrowser({ headless: true });
  try {
    await blockNavigation(page, { allow_domain_suffixes: ["zhipin.com"] });

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

    const risk = detectRiskUrl(page.url());
    if (risk) {
      ctx.emit({ type: "LOGIN_STATUS", payload: { status: risk, message: `检测到风控页面：${page.url()}` } });
    }

    const meta = await collectBossMetaByListening(page, ctx.signal);
    if (meta.city_group || meta.filter_conditions || meta.industry_filter_exemption) {
      ctx.emit({ type: "BOSS_META_SYNCED", payload: meta });
    } else {
      ctx.emit({ type: "LOG", payload: { level: "warn", message: "未获取到城市/行业/筛选项元数据（可能是网络/风控/未登录）。" } });
    }
  } finally {
    await browser.close().catch(() => undefined);
    ctx.emit({ type: "FINISHED" });
  }
}

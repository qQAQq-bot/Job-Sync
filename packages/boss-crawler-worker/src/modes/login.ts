import type { Page } from "puppeteer";
import type { z } from "zod";

import { launchBrowser } from "../browser/launch.js";
import { blockNavigation } from "../browser/navigationLock.js";
import type { LoginStartPayloadSchema, EventOut } from "../protocol.js";
import { URLS, API_PATH } from "../boss/selectors.js";
import { collectBossMetaByListening } from "../boss/meta.js";
import { delay } from "../utils/delay.js";

export type LoginStartPayload = z.infer<typeof LoginStartPayloadSchema>;

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

async function checkLoginOnce(page: Page): Promise<unknown | null> {
  try {
    return await page.evaluate(async (path) => {
      const res = await fetch(`https://www.zhipin.com${path}`, { credentials: "include" });
      try {
        return await res.json();
      } catch {
        return null;
      }
    }, API_PATH.USER_INFO);
  } catch {
    return null;
  }
}

async function readLocalStorage(page: Page): Promise<Record<string, string>> {
  return await page.evaluate(() => {
    const out: Record<string, string> = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      out[key] = window.localStorage.getItem(key) ?? "";
    }
    return out;
  });
}

export async function runLoginMode(payload: LoginStartPayload, ctx: ModeContext): Promise<void> {
  ctx.emit({ type: "LOG", payload: { level: "info", message: "启动浏览器，等待用户登录。" } });

  const { browser, page } = await launchBrowser({
    headless: false,
    executable_path: payload.executable_path,
    user_data_dir: payload.user_data_dir,
  });

  try {
    await blockNavigation(page, { allow_domain_suffixes: ["zhipin.com"] });
    await page.goto(URLS.USER, { waitUntil: "domcontentloaded" });

    let lastStatus: string | null = null;
    while (!ctx.signal.aborted) {
      const risk = detectRiskUrl(page.url());
      if (risk) {
        if (lastStatus !== risk) {
          ctx.emit({
            type: "LOGIN_STATUS",
            payload: { status: risk, message: `检测到风控页面：${page.url()}` },
          });
          lastStatus = risk;
        }
        await delay(1500, ctx.signal);
        continue;
      }

      const userInfo = await checkLoginOnce(page);
      const code = typeof userInfo === "object" && userInfo !== null ? (userInfo as any).code : null;
      if (code === 0) {
        ctx.emit({ type: "LOGIN_STATUS", payload: { status: "valid" } });
        const cookies = await page.cookies();
        const local_storage = await readLocalStorage(page);
        ctx.emit({ type: "COOKIE_COLLECTED", payload: { cookies, local_storage } });
        const meta = await collectBossMetaByListening(page, ctx.signal).catch(() => null);
        if (meta && (meta.city_group || meta.filter_conditions || meta.industry_filter_exemption)) {
          ctx.emit({ type: "BOSS_META_SYNCED", payload: meta });
        }
        return;
      }

      if (lastStatus !== "invalid") {
        ctx.emit({ type: "LOGIN_STATUS", payload: { status: "invalid" } });
        lastStatus = "invalid";
      }
      await delay(1500, ctx.signal);
    }
  } finally {
    await browser.close().catch(() => undefined);
    ctx.emit({ type: "FINISHED" });
  }
}

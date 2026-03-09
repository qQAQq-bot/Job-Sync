/**
 * User-Agent cleanup.
 *
 * Replaces the `puppeteer-extra-plugin-anonymize-ua` dependency with a direct
 * implementation that also handles pre-existing pages (the `onBrowser` fix from
 * geekgeekrun).
 */

import type { Browser, Page } from "puppeteer";

export async function stripHeadlessUserAgent(browser: Browser, page: Page): Promise<void> {
  let ua = await browser.userAgent();
  ua = ua.replace("HeadlessChrome/", "Chrome/");
  await page.setUserAgent(ua);
}

export async function stripUaForAllPages(browser: Browser): Promise<void> {
  const pages = await browser.pages();
  for (const page of pages) {
    await stripHeadlessUserAgent(browser, page);
  }
}

import type { Browser, Page, Target } from "puppeteer";
import { existsSync } from "node:fs";
import { join } from "node:path";
import puppeteerExtra from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";

import { injectStealthScript, applyStealthToAllPages } from "./stealth.js";
import { stripHeadlessUserAgent, stripUaForAllPages } from "./ua.js";

let pluginsInstalled = false;

async function installPlugins(puppeteer: any): Promise<void> {
  if (pluginsInstalled) return;
  puppeteer.use((stealthPlugin as any).default?.() ?? (stealthPlugin as any)());
  pluginsInstalled = true;
}

function pickFirstExistingFile(paths: string[]): string | undefined {
  for (const p of paths) {
    try {
      if (p && existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return undefined;
}

function resolveBundledBrowserExecutablePath(): string | undefined {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
  if (envPath && existsSync(envPath)) return envPath;

  if (process.platform !== "win32") return undefined;

  const programFiles = process.env.PROGRAMFILES;
  const programFilesX86 = process.env["PROGRAMFILES(X86)"];
  const localAppData = process.env.LOCALAPPDATA;

  const candidates: string[] = [];

  // Edge
  if (programFiles) candidates.push(join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"));
  if (programFilesX86) candidates.push(join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"));

  // Chrome
  if (programFiles) candidates.push(join(programFiles, "Google", "Chrome", "Application", "chrome.exe"));
  if (programFilesX86) candidates.push(join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"));
  if (localAppData) candidates.push(join(localAppData, "Google", "Chrome", "Application", "chrome.exe"));

  return pickFirstExistingFile(candidates);
}

export type LaunchBrowserOptions = {
  headless: boolean;
  executable_path?: string;
  user_data_dir?: string;
};

export async function launchBrowser(options: LaunchBrowserOptions): Promise<{
  browser: Browser;
  page: Page;
}> {
  const puppeteer = (puppeteerExtra as any).default ?? puppeteerExtra;
  await installPlugins(puppeteer);

  const executablePath =
    options.executable_path ?? resolveBundledBrowserExecutablePath() ?? undefined;

  if (!executablePath && process.env.PUPPETEER_SKIP_DOWNLOAD) {
    throw new Error(
      "未找到可用的 Chrome / Edge。你设置了 PUPPETEER_SKIP_DOWNLOAD，Puppeteer 不会自动下载 Chrome for Testing。请设置 PUPPETEER_EXECUTABLE_PATH 指向本机浏览器 exe（例如 Chrome 或 Edge）。",
    );
  }

  const browser = await puppeteer.launch({
    headless: options.headless,
    executablePath,
    userDataDir: options.user_data_dir,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  await applyStealthToAllPages(browser);
  await stripUaForAllPages(browser);

  browser.on("targetcreated", async (target: Target) => {
    if (target.type() === "page") {
      const newPage = await target.page();
      if (newPage) {
        await injectStealthScript(newPage);
        await stripHeadlessUserAgent(browser, newPage);
      }
    }
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  return { browser, page };
}

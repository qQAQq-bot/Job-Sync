import type { Page } from "puppeteer";

export type NavigationLockOptions = {
  allow_prefixes?: string[];
  allow_domain_suffixes?: string[];
};

function isAllowedUrl(url: string, options: NavigationLockOptions): boolean {
  const allowPrefixes = options.allow_prefixes ?? [];
  const allowDomainSuffixes = options.allow_domain_suffixes ?? [];

  if (allowPrefixes.length === 0 && allowDomainSuffixes.length === 0) return true;

  if (allowPrefixes.some((prefix) => url.startsWith(prefix))) return true;

  const lower = url.toLowerCase();
  if (lower.startsWith("about:") || lower.startsWith("data:") || lower.startsWith("blob:")) return true;

  try {
    const u = new URL(url);
    const hostname = u.hostname.toLowerCase();
    return allowDomainSuffixes.some((suffix) => {
      const normalized = suffix.trim().toLowerCase();
      if (!normalized) return false;
      return hostname === normalized || hostname.endsWith(`.${normalized}`);
    });
  } catch {
    return false;
  }
}

export async function blockNavigation(page: Page, options: NavigationLockOptions): Promise<void> {
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (!req.isNavigationRequest()) {
      req.continue().catch(() => undefined);
      return;
    }

    // Only block top-level navigations. Some sites load login / captcha in iframes
    // and blocking those navigations can break normal browsing.
    try {
      if (req.frame() !== page.mainFrame()) {
        req.continue().catch(() => undefined);
        return;
      }
    } catch {
      // ignore
    }

    const url = req.url();
    if (!isAllowedUrl(url, options)) {
      req.abort().catch(() => undefined);
      return;
    }

    req.continue().catch(() => undefined);
  });
}

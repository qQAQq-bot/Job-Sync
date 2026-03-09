import type { Page } from "puppeteer";

export type BossFilters = {
  city?: string | string[];
  salary?: string | string[];
  experience?: string | string[];
  degree?: string | string[];
  industry?: string | string[];
  scale?: string | string[];
};

function asArray(v: unknown): string[] {
  if (typeof v === "string" && v.trim()) return [v.trim()];
  if (Array.isArray(v)) {
    return v
      .filter((x) => typeof x === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

async function openFilterPanel(page: Page, label: string): Promise<void> {
  await page.evaluate((l) => {
    const el = Array.from(document.querySelectorAll<HTMLElement>("a,button,span,div")).find((n) => {
      const t = n.innerText?.trim();
      return t === l;
    });
    el?.click();
  }, label);
}

async function clickByText(page: Page, text: string): Promise<boolean> {
  const ok = await page.evaluate((t) => {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>("a,button,li,span,div")).filter(
      (el) => el && el.innerText && el.innerText.trim() === t,
    );
    const el = candidates[0];
    if (!el) return false;
    el.click();
    return true;
  }, text);
  return Boolean(ok);
}

async function clickByKaIncludes(page: Page, fragment: string): Promise<boolean> {
  const ok = await page.evaluate((frag) => {
    const el = document.querySelector<HTMLElement>(`[ka*="${frag}"]`);
    if (!el) return false;
    el.click();
    return true;
  }, fragment);
  return Boolean(ok);
}

async function applyTextOrKa(page: Page, value: string): Promise<boolean> {
  const byKa = await clickByKaIncludes(page, value);
  if (byKa) return true;
  return await clickByText(page, value);
}

export async function applyFilters(page: Page, rawFilters: unknown): Promise<void> {
  const filters = (rawFilters ?? {}) as BossFilters;

  const city = asArray(filters.city);
  if (city.length > 0) {
    await openFilterPanel(page, "城市").catch(() => undefined);
    for (const v of city) {
      await applyTextOrKa(page, v).catch(() => undefined);
    }
  }

  const salary = asArray(filters.salary);
  if (salary.length > 0) {
    await openFilterPanel(page, "薪资").catch(() => undefined);
    for (const v of salary) {
      await applyTextOrKa(page, v).catch(() => undefined);
    }
  }

  const experience = asArray(filters.experience);
  if (experience.length > 0) {
    await openFilterPanel(page, "经验").catch(() => undefined);
    for (const v of experience) {
      await applyTextOrKa(page, v).catch(() => undefined);
    }
  }

  const degree = asArray(filters.degree);
  if (degree.length > 0) {
    await openFilterPanel(page, "学历").catch(() => undefined);
    for (const v of degree) {
      await applyTextOrKa(page, v).catch(() => undefined);
    }
  }

  const industry = asArray(filters.industry);
  if (industry.length > 0) {
    await openFilterPanel(page, "行业").catch(() => undefined);
    for (const v of industry) {
      await applyTextOrKa(page, v).catch(() => undefined);
    }
  }

  const scale = asArray(filters.scale);
  if (scale.length > 0) {
    await openFilterPanel(page, "规模").catch(() => undefined);
    for (const v of scale) {
      await applyTextOrKa(page, v).catch(() => undefined);
    }
  }
}


export type CrawlMode = "manual" | "auto";
export type BossOption = { code: number; name: string };
export type BossCityGroup = { firstChar: string; cityList: BossOption[] };
export type BossIndustryGroup = { name: string; options: BossOption[] };

export const DEFAULT_CRAWL_MODE: CrawlMode = "manual";
export const DEFAULT_MAX_PAGES = 3;
export const DEFAULT_MAX_JOBS = 50;
export const DEFAULT_DELAY_MS = 800;
export const BOSS_META_SYNC_TIMEOUT_MS = 20_000;
export const CRAWL_TASK_TYPE_MANUAL = "crawl_manual";
export const CRAWL_TASK_TYPE_AUTO = "crawl_auto";
export const CRAWL_TASK_TYPE_LOGIN = "login";
export const CRAWL_TASK_TYPE_META_SYNC = "meta_sync";

export function parseList(text: string): string[] {
  return text
    .split(/[\n,，]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function asBossOptions(list: unknown): BossOption[] {
  if (!Array.isArray(list)) return [];
  const out: BossOption[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const codeRaw = (item as any).code;
    const code = typeof codeRaw === "number" ? codeRaw : Number(codeRaw);
    const name = typeof (item as any).name === "string" ? (item as any).name : "";
    if (!Number.isFinite(code) || !name) continue;
    out.push({ code, name });
  }
  return out;
}

export function buildBossCityGroups(meta: unknown): BossCityGroup[] {
  const groups = (meta as any)?.city_group?.cityGroup;
  if (!Array.isArray(groups)) return [];
  const out: BossCityGroup[] = [];
  for (const group of groups) {
    if (!group || typeof group !== "object") continue;
    const firstChar = typeof (group as any).firstChar === "string" ? (group as any).firstChar : "";
    const cityList = asBossOptions((group as any).cityList);
    if (!firstChar || cityList.length === 0) continue;
    out.push({ firstChar, cityList });
  }
  return out;
}

export function buildBossIndustryGroups(meta: unknown): BossIndustryGroup[] {
  const raw = (meta as any)?.industry_filter_exemption;
  if (!Array.isArray(raw)) return [];
  const out: BossIndustryGroup[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const name = typeof (item as any).name === "string" ? (item as any).name : "";
    if (!name) continue;
    const options = asBossOptions((item as any).subLevelModelList);
    if (options.length > 0) {
      out.push({ name, options });
      continue;
    }
    const codeRaw = (item as any).code;
    const code = typeof codeRaw === "number" ? codeRaw : Number(codeRaw);
    if (!Number.isFinite(code)) continue;
    out.push({ name, options: [{ code, name }] });
  }
  return out;
}

export function filterBossOptions(list: unknown): BossOption[] {
  return asBossOptions(list).filter((item) => item.code !== 0);
}

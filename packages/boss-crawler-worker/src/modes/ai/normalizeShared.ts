import { envFlag } from "./shared.js";

export function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object") return null;
  if (Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

export function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

export function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v
      .map((it) => (typeof it === "string" ? it.trim() : ""))
      .filter((s) => s.length > 0);
  }
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return [];
    return trimmed
      .split(/\r?\n|;|；|，|,/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

export function toNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function clampScore(v: unknown, fallback = 50): number {
  const n = toNumber(v);
  if (n === null) return fallback;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

export function pickFirstString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    const s = asNonEmptyString(c);
    if (s) return s;
  }
  return null;
}

export function normalizeLearningItems(v: unknown): Array<{ topic: string; why: string; expectedOutput: string[] }> {
  if (!Array.isArray(v)) return [];
  const out: Array<{ topic: string; why: string; expectedOutput: string[] }> = [];
  for (const it of v) {
    if (typeof it === "string") {
      const topic = it.trim();
      if (!topic) continue;
      out.push({ topic, why: "", expectedOutput: [] });
      continue;
    }
    const obj = asRecord(it);
    if (!obj) continue;
    const topic = pickFirstString(obj.topic, (obj as any).title, (obj as any).name);
    if (!topic) continue;
    const why = pickFirstString(obj.why, (obj as any).reason, (obj as any).because) ?? "";
    const expectedOutput = toStringArray((obj as any).expectedOutput ?? (obj as any).outputs ?? (obj as any).deliverables);
    out.push({ topic, why, expectedOutput });
  }
  return out;
}


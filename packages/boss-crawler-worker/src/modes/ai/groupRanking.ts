import { asRecord, clampScore, pickFirstString, toStringArray } from "./normalizeShared.js";

export function buildMergedJobRanking(obj: Record<string, unknown>, jobs: unknown[]): unknown[] {
  const outlines: Array<{ encrypt_job_id: string; position_name?: string; brand_name?: string }> = [];
  for (const job of jobs) {
    const record = asRecord(job);
    if (!record) continue;
    const id = pickFirstString(record.encrypt_job_id, (record as any).encryptJobId, (record as any).jobId, (record as any).id) ?? "";
    if (!id) continue;
    outlines.push({
      encrypt_job_id: id,
      position_name: pickFirstString(record.position_name, (record as any).positionName, (record as any).title) ?? undefined,
      brand_name: pickFirstString(record.brand_name, (record as any).brandName, (record as any).company) ?? undefined,
    });
  }

  const outlineById = new Map<string, { encrypt_job_id: string; position_name?: string; brand_name?: string }>();
  for (const outline of outlines) outlineById.set(outline.encrypt_job_id, outline);

  const rankingRaw =
    (obj as any).jobRanking ??
    (obj as any).job_rankings ??
    (obj as any).jobRank ??
    (obj as any).ranking ??
    (obj as any).jobs ??
    (obj as any).positions ??
    (obj as any)["岗位排序"] ??
    (obj as any)["岗位排名"] ??
    (obj as any)["岗位推荐"] ??
    (obj as any)["匹配度排序"] ??
    (obj as any)["适配度排序"] ??
    [];

  const rankingItems = normalizeRankingItems(rankingRaw);
  const jobRanking = rankingItems
    .map((item, index) => normalizeRankingItem(item, index, outlines, outlineById))
    .filter((item) => typeof item.encrypt_job_id === "string" && item.encrypt_job_id.trim().length > 0)
    .sort((left, right) => right.matchScore - left.matchScore);

  return mergeMissingOutlines(jobRanking, outlines);
}

function normalizeRankingItems(rankingRaw: unknown): unknown[] {
  if (Array.isArray(rankingRaw)) {
    return rankingRaw;
  }

  const parsedFromString = typeof rankingRaw === "string" ? tryParseJson(rankingRaw) : null;
  if (Array.isArray(parsedFromString)) {
    return parsedFromString;
  }
  if (parsedFromString && typeof parsedFromString === "object" && !Array.isArray(parsedFromString)) {
    return Object.entries(parsedFromString as Record<string, unknown>).map(([key, value]) => {
      const record = asRecord(value) ?? {};
      return { encrypt_job_id: key, ...record };
    });
  }

  const record = asRecord(rankingRaw);
  if (!record) {
    return [];
  }
  return Object.entries(record).map(([key, value]) => {
    const entry = asRecord(value) ?? {};
    return { encrypt_job_id: key, ...entry };
  });
}

function normalizeRankingItem(
  raw: unknown,
  index: number,
  outlines: Array<{ encrypt_job_id: string; position_name?: string; brand_name?: string }>,
  outlineById: Map<string, { encrypt_job_id: string; position_name?: string; brand_name?: string }>,
) {
  const record = asRecord(raw) ?? {};
  const fallbackId = outlines[index]?.encrypt_job_id;
  const id = pickFirstString(
    record.encrypt_job_id,
    (record as any).encryptJobId,
    (record as any).encryptJobID,
    (record as any).jobId,
    (record as any).id,
    (record as any)["encrypt_job_id"],
    (record as any)["职位ID"],
    (record as any)["岗位ID"],
    fallbackId,
  ) ?? "";
  const outline = outlineById.get(id);
  const matchScore = clampScore(
    (record as any).matchScore ?? (record as any).match_score ?? (record as any).score ?? (record as any)["匹配度"] ?? (record as any)["适配度"] ?? (record as any)["评分"] ?? (record as any)["分数"],
    50,
  );
  const conclusion = pickFirstString(
    (record as any).conclusion,
    (record as any).summary,
    (record as any).recommendation,
    (record as any)["结论"],
    (record as any)["建议"],
    (record as any)["推荐建议"],
  ) ?? defaultConclusion(matchScore);
  const reasons = toStringArray(
    (record as any).reasons ??
      (record as any).reason ??
      (record as any).keyReasons ??
      (record as any).why ??
      (record as any)["理由"] ??
      (record as any)["原因"] ??
      (record as any)["推荐理由"],
  );
  const risks = toStringArray(
    (record as any).risks ??
      (record as any).riskNotes ??
      (record as any).risk ??
      (record as any).risk_notes ??
      (record as any)["风险"] ??
      (record as any)["风险提示"] ??
      (record as any)["注意事项"],
  );

  return {
    encrypt_job_id: id,
    position_name:
      pickFirstString(
        (record as any).position_name,
        (record as any).positionName,
        (record as any).title,
        (record as any)["职位名称"],
        (record as any)["岗位名称"],
        (record as any)["职位"],
        (record as any)["岗位"],
        outline?.position_name,
      ) ?? undefined,
    brand_name:
      pickFirstString(
        (record as any).brand_name,
        (record as any).brandName,
        (record as any).company,
        (record as any)["公司名称"],
        (record as any)["公司"],
        (record as any)["品牌"],
        outline?.brand_name,
      ) ?? undefined,
    matchScore,
    conclusion,
    reasons: reasons.length ? reasons : ["信息不足：建议补充更多当前情况（或简历）以减少误判。"],
    risks,
  };
}

function mergeMissingOutlines(
  jobRanking: Array<{
    encrypt_job_id: string;
    position_name?: string;
    brand_name?: string;
    matchScore: number;
    conclusion: string;
    reasons: string[];
    risks: string[];
  }>,
  outlines: Array<{ encrypt_job_id: string; position_name?: string; brand_name?: string }>,
) {
  const out: Array<{
    encrypt_job_id: string;
    position_name?: string;
    brand_name?: string;
    matchScore: number;
    conclusion: string;
    reasons: string[];
    risks: string[];
  }> = [];
  const seen = new Set<string>();

  for (const item of jobRanking) {
    const id = item.encrypt_job_id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }

  for (const outline of outlines) {
    const id = outline.encrypt_job_id.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      encrypt_job_id: id,
      position_name: outline.position_name,
      brand_name: outline.brand_name,
      matchScore: 0,
      conclusion: "模型输出缺失：该岗位未被纳入 jobRanking，建议重新生成综合报告。",
      reasons: ["模型输出未覆盖该岗位，已补充占位项（请重新生成以获得完整理由与风险）。"],
      risks: [],
    });
  }

  return out.length
    ? out.sort((left, right) => right.matchScore - left.matchScore)
    : outlines.map((outline) => ({
        encrypt_job_id: outline.encrypt_job_id,
        position_name: outline.position_name,
        brand_name: outline.brand_name,
        matchScore: 50,
        conclusion: "信息不足：需要更多当前情况说明或简历来判断。",
        reasons: ["未能从模型输出中解析到完整排序信息。"],
        risks: [],
      }));
}

function defaultConclusion(score: number): string {
  if (score >= 80) return "优先投递，匹配度较高。";
  if (score >= 60) return "可以投递尝试，但需要补齐关键点。";
  return "不建议优先，除非你愿意针对性补齐缺口。";
}

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

import { asNonEmptyString, asRecord, normalizeLearningItems, pickFirstString, toStringArray } from "./normalizeShared.js";
import { buildMergedJobRanking } from "./groupRanking.js";

export function normalizeAiGroupResult(raw: unknown, jobs: unknown[]): unknown {
  const unwrapToRecord = (v: unknown): Record<string, unknown> | null => {
    const rec = asRecord(v);
    if (rec) return rec;
    if (typeof v === "string") {
      const s = v.trim();
      if (!s) return null;
      try {
        return asRecord(JSON.parse(s));
      } catch {
        return null;
      }
    }
    return null;
  };

  let obj: Record<string, unknown> =
    unwrapToRecord(raw) ??
    (Array.isArray(raw) ? ({ jobRanking: raw } as Record<string, unknown>) : {}) ??
    {};

  const wrapped = (obj as any).result ?? (obj as any).data ?? (obj as any).output ?? (obj as any).payload;
  const unwrapped = unwrapToRecord(wrapped);
  if (unwrapped) obj = unwrapped;

  const mergedJobRanking = buildMergedJobRanking(obj, jobs);
  const common = asRecord(
    (obj as any).commonRequirements ??
      (obj as any).requirements ??
      (obj as any).common ??
      (obj as any)["共同要求"] ??
      (obj as any)["共性要求"] ??
      (obj as any)["通用要求"] ??
      (obj as any)["岗位画像"],
  ) ?? {};
  const commonRequirements = {
    mustHave: toStringArray(
      (common as any).mustHave ??
        (common as any).must_have ??
        (obj as any).mustHave ??
        (common as any)["必须"] ??
        (common as any)["必备"] ??
        (common as any)["硬性要求"],
    ),
    niceToHave: toStringArray(
      (common as any).niceToHave ??
        (common as any).nice_to_have ??
        (obj as any).niceToHave ??
        (common as any)["加分项"] ??
        (common as any)["优选"] ??
        (common as any)["可选"],
    ),
    responsibilities: toStringArray(
      (common as any).responsibilities ??
        (common as any).duties ??
        (obj as any).responsibilities ??
        (common as any)["职责"] ??
        (common as any)["工作内容"],
    ),
    keywords: toStringArray(
      (common as any).keywords ??
        (common as any).keywordSuggestions ??
        (obj as any).keywords ??
        (common as any)["关键词"] ??
        (common as any)["关键字"],
    ),
  };

  const resumeRaw =
    (obj as any).resumeStrategy ??
    (obj as any).resume ??
    (obj as any).resume_strategy ??
    (obj as any)["简历策略"] ??
    (obj as any)["简历建议"] ??
    (obj as any)["简历写法"] ??
    {};
  const resume = asRecord(resumeRaw) ?? {};
  const resumeStrategy = {
    positioning:
      pickFirstString(
        (resume as any).positioning,
        (resume as any).position,
        (resume as any).summary,
        (resume as any)["定位"],
        (resume as any)["方向"],
        typeof resumeRaw === "string" ? resumeRaw : undefined,
      ) ?? "",
    mustHighlight: toStringArray(
      (resume as any).mustHighlight ??
        (resume as any).must_highlight ??
        (resume as any).highlights ??
        (resume as any)["必须突出"] ??
        (resume as any)["重点强调"],
    ),
    bullets: toStringArray((resume as any).bullets ?? (resume as any).templates ?? (resume as any).bulletTemplates),
  };

  const boostersRaw =
    (obj as any).projectBoosters ??
    (obj as any).projects ??
    (obj as any).project_boosters ??
    (obj as any).boosters ??
    (obj as any)["加分项目"] ??
    (obj as any)["项目建议"] ??
    (obj as any)["项目加分项"] ??
    [];
  const boostersArr = Array.isArray(boostersRaw) ? boostersRaw : [];
  const projectBoosters = boostersArr
    .map((it) => {
      if (typeof it === "string") {
        const title = it.trim();
        if (!title) return null;
        return { title, why: "", deliverables: [], resumeBullets: [] };
      }
      const rec = asRecord(it);
      if (!rec) return null;
      const title = pickFirstString(rec.title, (rec as any).topic, (rec as any).name);
      if (!title) return null;
      return {
        title,
        why: pickFirstString((rec as any).why, (rec as any).reason) ?? "",
        deliverables: toStringArray((rec as any).deliverables ?? (rec as any).outputs),
        resumeBullets: toStringArray((rec as any).resumeBullets ?? (rec as any).bullets),
      };
    })
    .filter(Boolean);

  const learning = asRecord((obj as any).learningPlan ?? (obj as any).learning_plan ?? (obj as any).studyPlan ?? (obj as any).plan) ?? {};
  const learningPlan = {
    p0: normalizeLearningItems((learning as any).p0 ?? (learning as any).P0 ?? (learning as any).p0List ?? []),
    p1: normalizeLearningItems((learning as any).p1 ?? (learning as any).P1 ?? (learning as any).p1List ?? []),
    p2: normalizeLearningItems((learning as any).p2 ?? (learning as any).P2 ?? (learning as any).p2List ?? []),
  };

  const summary =
    pickFirstString(
      (obj as any).summary,
      (obj as any).overview,
      (obj as any).conclusion,
      (obj as any)["总结"],
      (obj as any)["总体结论"],
      (obj as any)["概览"],
    ) ?? "已生成综合分析。";

  return {
    summary,
    jobRanking: mergedJobRanking,
    commonRequirements,
    resumeStrategy,
    projectBoosters,
    learningPlan,
    assumptions: toStringArray((obj as any).assumptions ?? (obj as any).assumption ?? (obj as any)["假设"]),
    questions: toStringArray((obj as any).questions ?? (obj as any).question ?? (obj as any)["问题"] ?? (obj as any)["待澄清"]),
    riskNotes: toStringArray(
      (obj as any).riskNotes ?? (obj as any).risk_notes ?? (obj as any).risks ?? (obj as any)["风险提示"] ?? (obj as any)["注意事项"],
    ),
    nextSteps: toStringArray(
      (obj as any).nextSteps ?? (obj as any).next_steps ?? (obj as any).actions ?? (obj as any)["下一步"] ?? (obj as any)["行动建议"],
    ),
  };
}


export function isWaitingForInputLike(raw: unknown): boolean {
  const obj = asRecord(raw);
  if (!obj) return false;
  const status = asNonEmptyString((obj as any).status);
  if (status && status.toUpperCase().includes("WAIT")) return true;
  const meta = asRecord((obj as any).meta);
  if (meta && (meta as any).required_inputs) return true;
  const message = asNonEmptyString((obj as any).message);
  if (message && (message.includes("请提供") || message.includes("required_inputs"))) return true;
  return false;
}

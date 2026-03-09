import { asRecord, clampScore, pickFirstString, toStringArray } from "./normalizeShared.js";

export function normalizeAiResult(raw: unknown): unknown {
  const obj = asRecord(raw) ?? {};

  const resume = asRecord((obj as any).resumeRewrite ?? (obj as any).resume_rewrite ?? (obj as any).rewrite ?? (obj as any).resume) ?? {};

  const summaryRewrite =
    pickFirstString((resume as any).summaryRewrite, (resume as any).summary_rewrite, (resume as any).summary, (resume as any).positioning) ??
    undefined;
  const experienceBulletsRewrite = toStringArray(
    (resume as any).experienceBulletsRewrite ?? (resume as any).experience_bullets_rewrite ?? (resume as any).bullets ?? (resume as any).bulletTemplates,
  );

  const resumeRewrite =
    summaryRewrite || experienceBulletsRewrite.length
      ? {
          summaryRewrite,
          experienceBulletsRewrite: experienceBulletsRewrite.length ? experienceBulletsRewrite : undefined,
        }
      : undefined;

  return {
    matchScore: clampScore((obj as any).matchScore ?? (obj as any).match_score ?? (obj as any).score, 50),
    strengths: toStringArray((obj as any).strengths ?? (obj as any).pros ?? (obj as any).advantages ?? (obj as any).highlights),
    gaps: toStringArray((obj as any).gaps ?? (obj as any).cons ?? (obj as any).weaknesses ?? (obj as any).missing),
    keywordSuggestions: toStringArray(
      (obj as any).keywordSuggestions ?? (obj as any).keyword_suggestions ?? (obj as any).keywords ?? (obj as any).keyword,
    ),
    resumeRewrite,
    riskNotes: toStringArray((obj as any).riskNotes ?? (obj as any).risk_notes ?? (obj as any).risks ?? (obj as any).warnings),
  };
}


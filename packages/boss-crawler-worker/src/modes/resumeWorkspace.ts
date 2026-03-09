import { z } from "zod";

import { callOpenAiJson } from "../ai/client.js";
import { buildResumeDiagnosisPrompts, buildResumeModuleRewritePrompts, type ResumeModuleKind } from "../ai/resumeWorkspacePrompt.js";
import type { EventOut, ResumeDiagnosePayloadSchema, ResumeRewriteModulePayloadSchema } from "../protocol.js";
import type { z as zType } from "zod";

export type ResumeDiagnosePayload = zType.infer<typeof ResumeDiagnosePayloadSchema>;
export type ResumeRewriteModulePayload = zType.infer<typeof ResumeRewriteModulePayloadSchema>;

type ModeContext = {
  emit: (event: EventOut) => void;
  signal: AbortSignal;
};

const DiagnosisSectionSchema = z.object({
  assessment: z.string(),
  missing_info: z.array(z.string()),
  suggestions: z.array(z.string()),
});

const ResumeDiagnosisSchema = z.object({
  overall_summary: z.string(),
  summary: DiagnosisSectionSchema,
  projects: DiagnosisSectionSchema,
  experience: DiagnosisSectionSchema,
  skills: DiagnosisSectionSchema,
  next_steps: z.array(z.string()),
});

const ResumeModuleCandidateSchema = z.object({
  module: z.enum(["summary", "projects", "experience", "skills"]),
  candidate: z.string(),
  notes: z.array(z.string()),
  checklist: z.array(z.string()),
});

function safeError(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) return { message: err.message, stack: err.stack };
  return { message: String(err) };
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function toStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((it) => (typeof it === "string" ? it.trim() : "")).filter(Boolean);
}

function pickText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDiagnosis(raw: unknown): unknown {
  const obj = asRecord(raw) ?? {};
  const asSection = (value: unknown) => {
    const rec = asRecord(value) ?? {};
    return {
      assessment: pickText(rec.assessment),
      missing_info: toStringArray(rec.missing_info ?? rec.missingInfo),
      suggestions: toStringArray(rec.suggestions),
    };
  };
  return {
    overall_summary: pickText(obj.overall_summary ?? obj.overallSummary),
    summary: asSection(obj.summary),
    projects: asSection(obj.projects),
    experience: asSection(obj.experience),
    skills: asSection(obj.skills),
    next_steps: toStringArray(obj.next_steps ?? obj.nextSteps),
  };
}

function normalizeModuleCandidate(raw: unknown, module: ResumeModuleKind): unknown {
  const obj = asRecord(raw) ?? {};
  return {
    module,
    candidate: pickText(obj.candidate ?? obj.rewrite ?? obj.content),
    notes: toStringArray(obj.notes),
    checklist: toStringArray(obj.checklist),
  };
}

export async function runResumeDiagnoseMode(payload: ResumeDiagnosePayload, ctx: ModeContext): Promise<void> {
  try {
    ctx.emit({ type: "LOG", payload: { level: "info", message: "开始简历工作区诊断。" } });
    const { system, user } = buildResumeDiagnosisPrompts(payload.resume_text, payload.context_text, payload.resume_files);
    const raw = await callOpenAiJson({
      systemPrompt: system,
      userPrompt: user,
      client: { signal: ctx.signal },
    });
    const parsed = ResumeDiagnosisSchema.safeParse(normalizeDiagnosis(raw));
    if (!parsed.success) {
      ctx.emit({
        type: "ERROR",
        payload: { message: "简历诊断输出不符合 schema", stack: parsed.error.toString() },
      });
      return;
    }
    ctx.emit({ type: "AI_RESULT", payload: { result: parsed.data } });
  } catch (err) {
    ctx.emit({ type: "ERROR", payload: safeError(err) });
  } finally {
    ctx.emit({ type: "FINISHED" });
  }
}

export async function runResumeRewriteModuleMode(payload: ResumeRewriteModulePayload, ctx: ModeContext): Promise<void> {
  try {
    ctx.emit({ type: "LOG", payload: { level: "info", message: `开始生成模块候选稿：${payload.module}` } });
    const confirmedModules = {
      summary: payload.confirmed_summary,
      projects: payload.confirmed_projects,
      experience: payload.confirmed_experience,
      skills: payload.confirmed_skills,
    };
    const { system, user } = buildResumeModuleRewritePrompts({
      module: payload.module as ResumeModuleKind,
      resumeText: payload.resume_text,
      moduleInput: payload.module_input,
      contextText: payload.context_text,
      confirmedModules,
    });
    const raw = await callOpenAiJson({
      systemPrompt: system,
      userPrompt: user,
      client: { signal: ctx.signal },
    });
    const parsed = ResumeModuleCandidateSchema.safeParse(
      normalizeModuleCandidate(raw, payload.module as ResumeModuleKind),
    );
    if (!parsed.success) {
      ctx.emit({
        type: "ERROR",
        payload: { message: "模块候选稿输出不符合 schema", stack: parsed.error.toString() },
      });
      return;
    }
    ctx.emit({ type: "AI_RESULT", payload: { result: parsed.data } });
  } catch (err) {
    ctx.emit({ type: "ERROR", payload: safeError(err) });
  } finally {
    ctx.emit({ type: "FINISHED" });
  }
}

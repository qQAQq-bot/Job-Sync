import { callOpenAiJson } from "../../ai/client.js";
import { buildAiPrompts } from "../../ai/prompt.js";

import { normalizeAiResult } from "./normalizeResume.js";
import { asRecord } from "./normalizeShared.js";
import { AiResultSchema } from "./schemas.js";
import { envFlag, safeError } from "./shared.js";
import type { AiAnalyzePayload, ModeContext } from "./types.js";

export async function runAiMode(payload: AiAnalyzePayload, ctx: ModeContext): Promise<void> {
  try {
    ctx.emit({ type: "LOG", payload: { level: "info", message: "开始 AI 分析。" } });
    const { system, user } = buildAiPrompts(payload.resume_text, payload.job_detail, payload.context_text, payload.resume_files);
    const debugEnabled = envFlag("JOB_SYNC_AI_DEBUG");
    const runId = `ai-${Date.now().toString(36)}`;
    const raw = await callOpenAiJson({
      systemPrompt: system,
      userPrompt: user,
      client: { signal: ctx.signal },
      debug: debugEnabled
        ? {
            enabled: true,
            runId,
            maxPreviewChars: 1600,
            includePromptPreview: true,
            log: (message) => ctx.emit({ type: "LOG", payload: { level: "info", message } }),
          }
        : undefined,
    });

    const normalized = normalizeAiResult(raw);
    const parsed = AiResultSchema.safeParse(normalized);
    if (!parsed.success) {
      let preview = "";
      try {
        preview = JSON.stringify(raw);
      } catch {
        preview = String(raw);
      }
      const keys = asRecord(raw) ? Object.keys(raw as any).slice(0, 50).join(", ") : "";
      ctx.emit({
        type: "ERROR",
        payload: {
          message: "AI 输出不符合 schema",
          stack: [`zod_error: ${parsed.error.toString()}`, keys ? `raw_keys: ${keys}` : "", `raw_preview: ${preview.slice(0, 4000)}`]
            .filter(Boolean)
            .join("\n"),
        },
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


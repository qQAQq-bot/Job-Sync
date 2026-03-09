import { callOpenAiJson } from "../../ai/client.js";
import { buildAiGroupPrompts } from "../../ai/prompt.js";

import { normalizeAiGroupResult, isWaitingForInputLike } from "./normalizeGroup.js";
import { asRecord } from "./normalizeShared.js";
import { AiGroupResultSchema } from "./schemas.js";
import { envFlag, safeError } from "./shared.js";
import type { AiAnalyzeGroupPayload, ModeContext } from "./types.js";

export async function runAiGroupMode(payload: AiAnalyzeGroupPayload, ctx: ModeContext): Promise<void> {
  try {
    ctx.emit({ type: "LOG", payload: { level: "info", message: "开始 AI 综合分析（仅当前情况 + 多职位）。" } });
    const { system, user } = buildAiGroupPrompts(payload.context_text, payload.jobs);
    const debugEnabled = envFlag("JOB_SYNC_AI_DEBUG");
    const runId = `ai-group-${Date.now().toString(36)}`;
    const configuredMode = (process.env.OPENAI_API_MODE ?? "chat_completions").toString().trim().toLowerCase();
    let raw = await callOpenAiJson({
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

    if (configuredMode === "responses" && isWaitingForInputLike(raw)) {
      raw = await callOpenAiJson({
        systemPrompt: system,
        userPrompt: user,
        client: { signal: ctx.signal, apiMode: "chat_completions" },
      });
    }

    if (isWaitingForInputLike(raw)) {
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
          message: "AI 返回了“等待输入”的占位结构，未输出综合分析报告。请检查 API 模式 / 供应商兼容性，或切换为 chat_completions。",
          stack: [keys ? `raw_keys: ${keys}` : "", `raw_preview: ${preview.slice(0, 4000)}`].filter(Boolean).join("\n"),
        },
      });
      return;
    }

    const normalized = normalizeAiGroupResult(raw, payload.jobs);
    const parsed = AiGroupResultSchema.safeParse(normalized);
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
          message: "AI 输出不符合 schema（综合分析）",
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

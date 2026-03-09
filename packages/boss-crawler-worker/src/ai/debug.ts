import { randomUUID } from "node:crypto";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { OpenAiDebugOptions } from "./clientTypes.js";

const ensuredLogDirs = new Set<string>();

export type OpenAiDebugContext = {
  enabled: boolean;
  runId: string;
  maxPreviewChars: number;
  includePromptPreview: boolean;
  traceDir: string;
  log: (message: string) => void;
};

export function buildDebugContext(debug: OpenAiDebugOptions | undefined): OpenAiDebugContext {
  const enabled = debug?.enabled ?? envFlag("JOB_SYNC_AI_DEBUG");
  const runId = (debug?.runId ?? "").trim() || randomUUID().slice(0, 8);
  const maxPreviewChars = typeof debug?.maxPreviewChars === "number" ? debug.maxPreviewChars : 1200;
  const includePromptPreview = debug?.includePromptPreview ?? true;
  const traceDir = (debug?.traceDir ?? process.env.JOB_SYNC_AI_TRACE_DIR ?? "").toString();
  return {
    enabled,
    runId,
    maxPreviewChars,
    includePromptPreview,
    traceDir,
    log: (message: string): void => {
      if (!enabled) return;
      debug?.log?.(`[AI API][${runId}] ${message}`);
    },
  };
}

export function envFlag(name: string): boolean {
  const raw = (process.env[name] ?? "").toString().trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function envBool(name: string, defaultValue: boolean): boolean {
  const raw = (process.env[name] ?? "").toString().trim().toLowerCase();
  if (!raw) return defaultValue;
  if (raw === "0" || raw === "false" || raw === "no" || raw === "off") return false;
  if (raw === "1" || raw === "true" || raw === "yes" || raw === "on") return true;
  return defaultValue;
}

export function envNumber(name: string, defaultValue: number): number {
  const raw = (process.env[name] ?? "").toString().trim();
  if (!raw) return defaultValue;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return defaultValue;
  return Math.floor(value);
}

export function createTimeoutSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new Error(`AI request timeout after ${timeoutMs}ms`));
  }, timeoutMs);

  const abort = (reason?: unknown) => {
    clearTimeout(timeout);
    controller.abort(reason);
  };

  if (signal) {
    if (signal.aborted) {
      abort(signal.reason);
    } else {
      signal.addEventListener("abort", () => abort(signal.reason), { once: true });
    }
  }

  controller.signal.addEventListener("abort", () => clearTimeout(timeout), { once: true });
  return controller.signal;
}

export function truncateText(text: string, maxChars: number): string {
  if (maxChars <= 0) return "";
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1))}…`;
}

export function safeJsonPreview(value: unknown, maxChars: number): string {
  try {
    return truncateText(JSON.stringify(value), maxChars);
  } catch {
    return truncateText(String(value), maxChars);
  }
}

export function logMaxChars(): number {
  const raw = (process.env.JOB_SYNC_AI_API_LOG_MAX_CHARS ?? "").toString().trim();
  if (!raw) return 20000;
  const value = Number(raw);
  if (!Number.isFinite(value)) return 20000;
  return Math.max(0, Math.floor(value));
}

export function truncateTextForLog(text: string, maxChars: number): string {
  if (maxChars <= 0) return text;
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1))}…`;
}

export function truncateStringFieldsForLog(value: unknown, maxChars: number, depth = 0): unknown {
  if (maxChars <= 0) return value;
  if (depth > 12) return value;
  if (typeof value === "string") return truncateTextForLog(value, maxChars);
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => truncateStringFieldsForLog(item, maxChars, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    out[key] = truncateStringFieldsForLog(entry, maxChars, depth + 1);
  }
  return out;
}

export async function appendApiLogLine(entry: unknown): Promise<void> {
  const filePath = (process.env.JOB_SYNC_AI_API_LOG_FILE ?? "").toString().trim();
  if (!filePath) return;

  const dir = dirname(filePath);
  if (dir && !ensuredLogDirs.has(dir)) {
    try {
      await mkdir(dir, { recursive: true });
    } catch {
      return;
    }
    ensuredLogDirs.add(dir);
  }

  try {
    await appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf-8");
  } catch {
    return;
  }
}

export async function writeTraceFile(options: {
  traceDir: string;
  runId: string;
  payload: unknown;
  log?: (message: string) => void;
}): Promise<string | null> {
  const dir = options.traceDir.trim();
  if (!dir) return null;
  try {
    await mkdir(dir, { recursive: true });
    const filename = `openai-trace-${options.runId}-${Date.now()}.json`;
    const fullPath = join(dir, filename);
    await writeFile(fullPath, JSON.stringify(options.payload, null, 2), "utf-8");
    options.log?.(`[AI API][${options.runId}] trace_saved: ${fullPath}`);
    return fullPath;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    options.log?.(`[AI API][${options.runId}] trace_save_failed: ${message}`);
    return null;
  }
}

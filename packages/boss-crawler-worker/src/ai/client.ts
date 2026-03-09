import type { OpenAiClientOptions, OpenAiDebugOptions } from "./clientTypes.js";
import { buildDebugContext, envFlag } from "./debug.js";
import { callChatCompletionsJson } from "./chatCompletions.js";
import { normalizeBaseUrl } from "./json.js";
import { callResponsesJson } from "./responses.js";

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_OPENAI_API_MODE = "chat_completions";
const DEFAULT_OPENAI_TEMPERATURE = 0.2;

export type { OpenAiClientOptions, OpenAiDebugOptions } from "./clientTypes.js";

export async function callOpenAiJson(options: {
  systemPrompt: string;
  userPrompt: string;
  client?: OpenAiClientOptions;
  debug?: OpenAiDebugOptions;
}): Promise<unknown> {
  const apiKey = options.client?.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const baseUrl = normalizeBaseUrl(options.client?.baseUrl ?? process.env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL);
  const model = (options.client?.model ?? process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL).trim() || DEFAULT_OPENAI_MODEL;
  const temperature = typeof options.client?.temperature === "number" ? options.client.temperature : DEFAULT_OPENAI_TEMPERATURE;
  const rawMode = (options.client?.apiMode ?? (process.env.OPENAI_API_MODE as OpenAiClientOptions["apiMode"]) ?? DEFAULT_OPENAI_API_MODE)
    .toString()
    .trim()
    .toLowerCase();
  const apiMode: OpenAiClientOptions["apiMode"] = rawMode === "responses" ? "responses" : "chat_completions";

  const debugEnabled = options.debug?.enabled ?? envFlag("JOB_SYNC_AI_DEBUG");
  const debugContext = buildDebugContext({
    ...options.debug,
    enabled: debugEnabled,
    traceDir: options.debug?.traceDir ?? process.env.JOB_SYNC_AI_TRACE_DIR,
  });
  const debug: OpenAiDebugOptions | undefined = debugEnabled
    ? {
        ...options.debug,
        enabled: true,
        runId: debugContext.runId,
        traceDir: debugContext.traceDir,
      }
    : undefined;

  if (debugEnabled) {
    options.debug?.log?.(
      `[AI API][${debugContext.runId}] resolved: api_mode=${apiMode} model=${model} base_url=${baseUrl} temperature=${temperature}`,
    );
  }

  const requestOptions = {
    apiKey,
    baseUrl,
    model,
    temperature,
    systemPrompt: options.systemPrompt,
    userPrompt: options.userPrompt,
    signal: options.client?.signal,
    debug,
  };

  if (apiMode === "responses") {
    return await callResponsesJson(requestOptions);
  }
  return await callChatCompletionsJson(requestOptions);
}

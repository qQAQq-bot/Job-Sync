import type { ChatCompletionResponse, OpenAiRequestOptions } from "./clientTypes.js";
import { appendApiLogLine, buildDebugContext, createTimeoutSignal, envBool, envNumber, logMaxChars, safeJsonPreview, truncateStringFieldsForLog, truncateText, truncateTextForLog, writeTraceFile } from "./debug.js";
import { extractJsonObject, JsonParseError } from "./json.js";

export async function callChatCompletionsJson(options: OpenAiRequestOptions): Promise<unknown> {
  const debug = buildDebugContext(options.debug);
  const url = `${options.baseUrl}/chat/completions`;
  const timeoutMs = envNumber("JOB_SYNC_AI_TIMEOUT_MS", 90000);
  const reqBody = {
    model: options.model,
    temperature: options.temperature,
    messages: [
      { role: "system", content: options.systemPrompt },
      { role: "user", content: options.userPrompt },
    ],
    response_format: { type: "json_object" },
  };

  await appendApiLogLine({
    ts: new Date().toISOString(),
    run_id: debug.runId,
    api_mode: "chat_completions",
    stage: "request",
    url,
    body: truncateStringFieldsForLog(reqBody, logMaxChars()),
  });

  debug.log(`request: api=chat_completions model=${options.model} temperature=${options.temperature} url=${url}`);
  debug.log(`prompt_len: system=${options.systemPrompt.length} user=${options.userPrompt.length}`);
  if (debug.includePromptPreview) {
    debug.log(`system_preview: ${truncateText(options.systemPrompt, Math.min(debug.maxPreviewChars, 800))}`);
    debug.log(`user_preview: ${truncateText(options.userPrompt, Math.min(debug.maxPreviewChars, 1200))}`);
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reqBody),
    signal: createTimeoutSignal(options.signal, timeoutMs),
  });

  const json = (await res.json().catch(() => ({}))) as ChatCompletionResponse;
  if (!res.ok) {
    const message = json?.error?.message ?? `HTTP ${res.status}`;
    await appendApiLogLine({
      ts: new Date().toISOString(),
      run_id: debug.runId,
      api_mode: "chat_completions",
      stage: "response_error",
      url,
      status: res.status,
      ok: res.ok,
      response_json: truncateStringFieldsForLog(json, logMaxChars()),
      error: { message },
    });
    debug.log(`response_error: status=${res.status} message=${message} body_preview=${safeJsonPreview(json, debug.maxPreviewChars)}`);
    await writeTraceFile({
      traceDir: debug.traceDir,
      runId: debug.runId,
      payload: {
        ts: new Date().toISOString(),
        api: "chat_completions",
        request: { url, body: reqBody },
        response: { status: res.status, ok: res.ok, json },
        error: { message },
      },
      log: options.debug?.log,
    });
    throw new Error(`OpenAI request failed: ${message}`);
  }

  const content = json?.choices?.[0]?.message?.content ?? "";
  debug.log(`response_ok: status=${res.status} content_len=${content.length}`);
  debug.log(`content_preview: ${truncateText(content, Math.min(debug.maxPreviewChars, 1400))}`);

  try {
    const extracted = extractJsonObject(content, { enableRepair: envBool("JOB_SYNC_AI_JSON_REPAIR", true) });
    const parsed = extracted.value;
    const jsonParseMeta = extracted.meta;
    await appendApiLogLine({
      ts: new Date().toISOString(),
      run_id: debug.runId,
      api_mode: "chat_completions",
      stage: "response_ok",
      url,
      status: res.status,
      ok: res.ok,
      response_json: truncateStringFieldsForLog(json, logMaxChars()),
      extracted_content: truncateTextForLog(content, logMaxChars()),
      json_parse: truncateStringFieldsForLog(jsonParseMeta, logMaxChars()),
      parsed: truncateStringFieldsForLog(parsed, logMaxChars()),
    });
    debug.log(`parsed_preview: ${safeJsonPreview(parsed, debug.maxPreviewChars)}`);
    debug.log(`json_parse: repair=${jsonParseMeta.repairApplied} substring=${jsonParseMeta.usedSubstring} steps=${jsonParseMeta.repairSteps.join("|")}`);
    await writeTraceFile({
      traceDir: debug.traceDir,
      runId: debug.runId,
      payload: {
        ts: new Date().toISOString(),
        api: "chat_completions",
        request: { url, body: reqBody },
        response: { status: res.status, ok: res.ok, json },
        extracted: { content },
        json_parse: jsonParseMeta,
        parsed,
      },
      log: options.debug?.log,
    });
    return parsed;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    const jsonParseMeta = cause instanceof JsonParseError ? cause.meta : null;
    await appendApiLogLine({
      ts: new Date().toISOString(),
      run_id: debug.runId,
      api_mode: "chat_completions",
      stage: "parse_error",
      url,
      status: res.status,
      ok: res.ok,
      response_json: truncateStringFieldsForLog(json, logMaxChars()),
      extracted_content: truncateTextForLog(content, logMaxChars()),
      json_parse: truncateStringFieldsForLog(jsonParseMeta, logMaxChars()),
      error: { message },
    });
    debug.log(`parse_error: ${message}`);
    await writeTraceFile({
      traceDir: debug.traceDir,
      runId: debug.runId,
      payload: {
        ts: new Date().toISOString(),
        api: "chat_completions",
        request: { url, body: reqBody },
        response: { status: res.status, ok: res.ok, json },
        extracted: { content },
        json_parse: jsonParseMeta,
        error: { message },
      },
      log: options.debug?.log,
    });
    throw cause;
  }
}

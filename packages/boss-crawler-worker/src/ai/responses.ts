import type { OpenAiRequestOptions, ResponsesResponse } from "./clientTypes.js";
import { appendApiLogLine, buildDebugContext, envBool, envNumber, logMaxChars, safeJsonPreview, truncateStringFieldsForLog, truncateText, truncateTextForLog, writeTraceFile } from "./debug.js";
import { extractJsonObject, JsonParseError } from "./json.js";

function extractResponsesOutputText(json: ResponsesResponse): string {
  if (typeof json.output_text === "string" && json.output_text.trim()) {
    return json.output_text;
  }

  const output = Array.isArray(json.output) ? json.output : [];
  const parts: string[] = [];
  for (const item of output) {
    if (!item || item.type !== "message") continue;
    if (item.role && item.role !== "assistant") continue;
    const content = Array.isArray(item.content) ? item.content : [];
    for (const entry of content) {
      if (!entry) continue;
      if (typeof entry.text === "string") {
        parts.push(entry.text);
      }
    }
  }

  return parts.join("\n").trim();
}

export async function callResponsesJson(options: OpenAiRequestOptions): Promise<unknown> {
  const debug = buildDebugContext(options.debug);
  const url = `${options.baseUrl}/responses`;
  const timeoutMs = envNumber("JOB_SYNC_AI_TIMEOUT_MS", 90000);
  const reqBodyItems = {
    model: options.model,
    instructions: options.systemPrompt,
    input: [
      {
        role: "user",
        content: [{ type: "input_text", text: options.userPrompt }],
      },
    ],
    temperature: options.temperature,
    text: { format: { type: "json_object" } },
  };
  const reqBodyString = {
    model: options.model,
    instructions: options.systemPrompt,
    input: options.userPrompt,
    temperature: options.temperature,
    text: { format: { type: "json_object" } },
  };

  await appendApiLogLine({
    ts: new Date().toISOString(),
    run_id: debug.runId,
    api_mode: "responses",
    stage: "request",
    url,
    body: truncateStringFieldsForLog(reqBodyItems, logMaxChars()),
  });

  debug.log(`request: api=responses model=${options.model} temperature=${options.temperature} url=${url}`);
  debug.log(`prompt_len: system=${options.systemPrompt.length} user=${options.userPrompt.length}`);
  if (debug.includePromptPreview) {
    debug.log(`system_preview: ${truncateText(options.systemPrompt, Math.min(debug.maxPreviewChars, 800))}`);
    debug.log(`user_preview: ${truncateText(options.userPrompt, Math.min(debug.maxPreviewChars, 1200))}`);
  }

  const doFetch = async (body: unknown, attempt: "items" | "string") => {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });
    const json = (await res.json().catch(() => ({}))) as ResponsesResponse;
    return { res, json, attempt };
  };

  let { res, json, attempt } = await doFetch(reqBodyItems, "items");

  if (!res.ok) {
    const errText = typeof json?.error === "string" ? json.error : json?.error?.message;
    const message = errText ?? `HTTP ${res.status}`;
    const hint = (errText ?? "").toLowerCase();
    const canRetryWithString =
      res.status === 400 &&
      hint.includes("input") &&
      (hint.includes("string") || hint.includes("text")) &&
      attempt === "items";

    await appendApiLogLine({
      ts: new Date().toISOString(),
      run_id: debug.runId,
      api_mode: "responses",
      stage: "response_error",
      url,
      status: res.status,
      ok: res.ok,
      response_json: truncateStringFieldsForLog(json, logMaxChars()),
      error: { message },
    });

    if (canRetryWithString) {
      await appendApiLogLine({
        ts: new Date().toISOString(),
        run_id: debug.runId,
        api_mode: "responses",
        stage: "request_retry",
        url,
        body: truncateStringFieldsForLog(reqBodyString, logMaxChars()),
      });
      const retry = await doFetch(reqBodyString, "string");
      res = retry.res;
      json = retry.json;
      attempt = retry.attempt;
    } else {
      debug.log(`response_error: status=${res.status} message=${message} body_preview=${safeJsonPreview(json, debug.maxPreviewChars)}`);
      await writeTraceFile({
        traceDir: debug.traceDir,
        runId: debug.runId,
        payload: {
          ts: new Date().toISOString(),
          api: "responses",
          request: { url, body: reqBodyItems },
          response: { status: res.status, ok: res.ok, json },
          error: { message },
        },
        log: options.debug?.log,
      });
      throw new Error(`OpenAI request failed: ${message}`);
    }
  }

  if (!res.ok) {
    const errText = typeof json?.error === "string" ? json.error : json?.error?.message;
    const message = errText ?? `HTTP ${res.status}`;
    await appendApiLogLine({
      ts: new Date().toISOString(),
      run_id: debug.runId,
      api_mode: "responses",
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
        api: "responses",
        request: { url, body: attempt === "string" ? reqBodyString : reqBodyItems },
        response: { status: res.status, ok: res.ok, json },
        error: { message },
      },
      log: options.debug?.log,
    });
    throw new Error(`OpenAI request failed: ${message}`);
  }

  const text = extractResponsesOutputText(json);
  if (!text) {
    await appendApiLogLine({
      ts: new Date().toISOString(),
      run_id: debug.runId,
      api_mode: "responses",
      stage: "response_ok_but_empty",
      url,
      status: res.status,
      ok: res.ok,
      response_json: truncateStringFieldsForLog(json, logMaxChars()),
      error: { message: "OpenAI responses output is empty" },
    });
    debug.log(`response_ok_but_empty: status=${res.status} body_preview=${safeJsonPreview(json, debug.maxPreviewChars)}`);
    await writeTraceFile({
      traceDir: debug.traceDir,
      runId: debug.runId,
      payload: {
        ts: new Date().toISOString(),
        api: "responses",
        request: { url, body: attempt === "string" ? reqBodyString : reqBodyItems },
        response: { status: res.status, ok: res.ok, json },
        error: { message: "OpenAI responses output is empty" },
      },
      log: options.debug?.log,
    });
    throw new Error("OpenAI responses output is empty");
  }

  debug.log(`response_ok: status=${res.status} text_len=${text.length}`);
  debug.log(`text_preview: ${truncateText(text, Math.min(debug.maxPreviewChars, 1400))}`);

  try {
    const extracted = extractJsonObject(text, { enableRepair: envBool("JOB_SYNC_AI_JSON_REPAIR", true) });
    const parsed = extracted.value;
    const jsonParseMeta = extracted.meta;
    await appendApiLogLine({
      ts: new Date().toISOString(),
      run_id: debug.runId,
      api_mode: "responses",
      stage: "response_ok",
      url,
      status: res.status,
      ok: res.ok,
      response_json: truncateStringFieldsForLog(json, logMaxChars()),
      extracted_text: truncateTextForLog(text, logMaxChars()),
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
        api: "responses",
        request: { url, body: attempt === "string" ? reqBodyString : reqBodyItems },
        response: { status: res.status, ok: res.ok, json },
        extracted: { text },
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
      api_mode: "responses",
      stage: "parse_error",
      url,
      status: res.status,
      ok: res.ok,
      response_json: truncateStringFieldsForLog(json, logMaxChars()),
      extracted_text: truncateTextForLog(text, logMaxChars()),
      json_parse: truncateStringFieldsForLog(jsonParseMeta, logMaxChars()),
      error: { message },
    });
    debug.log(`parse_error: ${message}`);
    await writeTraceFile({
      traceDir: debug.traceDir,
      runId: debug.runId,
      payload: {
        ts: new Date().toISOString(),
        api: "responses",
        request: { url, body: attempt === "string" ? reqBodyString : reqBodyItems },
        response: { status: res.status, ok: res.ok, json },
        extracted: { text },
        json_parse: jsonParseMeta,
        error: { message },
      },
      log: options.debug?.log,
    });
    throw cause;
  }
}

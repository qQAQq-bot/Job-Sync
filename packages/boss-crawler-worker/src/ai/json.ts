import {
  escapeUnescapedQuotesInStrings,
  findFirstJsonSubstring,
  insertMissingCommas,
  removeTrailingCommas,
  stripCodeFences,
} from "./jsonRepair.js";

const MAX_AI_JSON_SNIPPET_CHARS = 2000;

type JsonParseMeta = {
  readonly usedSubstring: boolean;
  readonly repairApplied: boolean;
  readonly repairSteps: readonly string[];
  readonly rawSnippet: string;
};

type ExtractJsonOptions = {
  readonly enableRepair: boolean;
};

type ExtractJsonResult = {
  readonly value: unknown;
  readonly meta: JsonParseMeta;
};

export class JsonParseError extends Error {
  readonly meta: JsonParseMeta;

  constructor(message: string, meta: JsonParseMeta) {
    super(message);
    this.name = "JsonParseError";
    this.meta = meta;
  }
}

export function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (/\/v1$/i.test(trimmed)) return trimmed;
  return `${trimmed}/v1`;
}

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function extractJsonObject(text: string, options: ExtractJsonOptions): ExtractJsonResult {
  const cleaned = stripCodeFences(text).trim().replace(/^\uFEFF/, "");
  if (!cleaned) {
    throw new JsonParseError("Model output is empty", {
      usedSubstring: false,
      repairApplied: false,
      repairSteps: [],
      rawSnippet: "",
    });
  }

  const direct = tryParseJson(cleaned);
  if (direct !== null) {
    return {
      value: direct,
      meta: { usedSubstring: false, repairApplied: false, repairSteps: [], rawSnippet: "" },
    };
  }

  const substring = findFirstJsonSubstring(cleaned);
  const usedSubstring = Boolean(substring);
  const candidate = substring ?? cleaned;
  const slicedParsed = tryParseJson(candidate);
  if (slicedParsed !== null) {
    return {
      value: slicedParsed,
      meta: { usedSubstring, repairApplied: false, repairSteps: [], rawSnippet: "" },
    };
  }

  const rawSnippet = candidate.slice(0, MAX_AI_JSON_SNIPPET_CHARS);
  if (!options.enableRepair) {
    throw new JsonParseError(
      'Model output is not valid JSON (repair disabled). Set env "JOB_SYNC_AI_JSON_REPAIR=true" to enable best-effort repair.',
      { usedSubstring, repairApplied: false, repairSteps: [], rawSnippet },
    );
  }

  let current = candidate;
  const repairSteps: string[] = [];
  const applyRepairStep = (step: string, fn: (input: string) => string): void => {
    const next = fn(current);
    if (next !== current) repairSteps.push(step);
    current = next;
  };
  const tryAfter = (step: string, fn: (input: string) => string): unknown | null => {
    applyRepairStep(step, fn);
    return tryParseJson(current);
  };

  const repaired =
    tryAfter("remove_trailing_commas", removeTrailingCommas) ??
    tryAfter("escape_unescaped_quotes", escapeUnescapedQuotesInStrings) ??
    tryAfter("insert_missing_commas", insertMissingCommas) ??
    tryAfter("remove_trailing_commas", removeTrailingCommas);

  if (repaired !== null) {
    return {
      value: repaired,
      meta: { usedSubstring, repairApplied: true, repairSteps, rawSnippet },
    };
  }

  throw new JsonParseError("Model output is not valid JSON (after repair).", {
    usedSubstring,
    repairApplied: true,
    repairSteps,
    rawSnippet,
  });
}

export function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }
  const withoutFirst = trimmed.replace(/^```[a-zA-Z0-9_-]*\n?/, "");
  return withoutFirst.replace(/```$/, "").trim();
}

export function findFirstJsonSubstring(text: string): string | null {
  const idxObj = text.indexOf("{");
  const idxArr = text.indexOf("[");
  const start = idxObj >= 0 && idxArr >= 0 ? Math.min(idxObj, idxArr) : Math.max(idxObj, idxArr);
  if (start < 0) return null;

  const stack: Array<"{" | "["> = [];
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") {
      stack.push("{");
      continue;
    }
    if (ch === "[") {
      stack.push("[");
      continue;
    }
    if (ch === "}" || ch === "]") {
      const top = stack[stack.length - 1];
      if (!top) return null;
      if (ch === "}" && top === "{") stack.pop();
      else if (ch === "]" && top === "[") stack.pop();
      else return null;
      if (stack.length === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

export function removeTrailingCommas(text: string): string {
  return text.replace(/,\s*([}\]])/g, "$1");
}

export function escapeUnescapedQuotesInStrings(text: string): string {
  const isWs = (ch: string): boolean => ch === " " || ch === "\n" || ch === "\r" || ch === "\t";
  const nextNonWs = (from: number): string => {
    for (let i = from; i < text.length; i += 1) {
      const ch = text[i];
      if (!isWs(ch)) return ch;
    }
    return "";
  };

  const stack: Array<"{" | "["> = [];
  let lastNonWsOutsideString = "";
  let inString = false;
  let escaped = false;
  let stringContext: "key" | "value" | "unknown" = "unknown";
  const out: string[] = [];

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (!inString) {
      out.push(ch);
      if (isWs(ch)) continue;
      if (ch === '"') {
        inString = true;
        escaped = false;
        const top = stack[stack.length - 1];
        if (top === "{" && (lastNonWsOutsideString === "{" || lastNonWsOutsideString === ",")) {
          stringContext = "key";
        } else if (lastNonWsOutsideString === ":" || top === "[") {
          stringContext = "value";
        } else {
          stringContext = "unknown";
        }
        lastNonWsOutsideString = ch;
        continue;
      }
      if (ch === "{" || ch === "[") {
        stack.push(ch as "{" | "[");
        lastNonWsOutsideString = ch;
        continue;
      }
      if (ch === "}" || ch === "]") {
        const top = stack[stack.length - 1];
        if (ch === "}" && top === "{") stack.pop();
        else if (ch === "]" && top === "[") stack.pop();
        lastNonWsOutsideString = ch;
        continue;
      }
      lastNonWsOutsideString = ch;
      continue;
    }

    if (escaped) {
      out.push(ch);
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      out.push(ch);
      escaped = true;
      continue;
    }
    if (ch === "\r" || ch === "\n") {
      out.push("\\n");
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      continue;
    }
    if (ch === '"') {
      const next = nextNonWs(i + 1);
      const shouldClose =
        stringContext === "key"
          ? next === ":"
          : next === "," || next === "}" || next === "]" || next === "";
      if (shouldClose) {
        out.push(ch);
        inString = false;
        lastNonWsOutsideString = ch;
      } else {
        out.push("\\\"");
      }
      continue;
    }

    out.push(ch);
  }

  return out.join("");
}

export function insertMissingCommas(text: string): string {
  const out: string[] = [];
  let inString = false;
  let escaped = false;
  let lastNonWs = "";
  let hadWhitespaceSinceLastNonWs = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      out.push(ch);
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      if (
        (lastNonWs === '"' || lastNonWs === "}" || lastNonWs === "]" || /[0-9a-zA-Z]/.test(lastNonWs)) &&
        hadWhitespaceSinceLastNonWs
      ) {
        out.push(",");
      }
      out.push(ch);
      inString = true;
      lastNonWs = ch;
      hadWhitespaceSinceLastNonWs = false;
      continue;
    }

    if (/\s/.test(ch)) {
      out.push(ch);
      hadWhitespaceSinceLastNonWs = true;
      continue;
    }

    if (
      (ch === "{" || ch === "[") &&
      (lastNonWs === '"' || lastNonWs === "}" || lastNonWs === "]" || /[0-9a-zA-Z]/.test(lastNonWs)) &&
      hadWhitespaceSinceLastNonWs
    ) {
      out.push(",");
    }

    out.push(ch);
    lastNonWs = ch;
    hadWhitespaceSinceLastNonWs = false;
  }

  return out.join("");
}

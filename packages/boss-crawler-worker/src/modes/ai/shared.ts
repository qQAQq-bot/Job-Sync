export function envFlag(name: string): boolean {
  const raw = (process.env[name] ?? "").toString().trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function safeError(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) {
    const meta = (err as any)?.meta;
    if (meta && typeof meta === "object") {
      const safeMeta = { ...(meta as Record<string, unknown>) };
      if ("rawSnippet" in safeMeta) delete safeMeta.rawSnippet;
      const metaLine = `meta: ${JSON.stringify(safeMeta)}`;
      const stack = [err.stack, metaLine].filter(Boolean).join("\n");
      return { message: err.message, stack };
    }
    return { message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}


import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as any;

  // Tauri runtime globals (v1/v2). Names differ across versions/bundlers.
  if (typeof w.__TAURI__ !== "undefined") return true;
  if (typeof w.__TAURI_INTERNALS__ !== "undefined") return true;
  if (typeof w.__TAURI_INVOKE__ !== "undefined") return true;
  if (typeof w.__TAURI_METADATA__ !== "undefined") return true;

  // Fallback: some platforms include "Tauri" in UA.
  if (typeof navigator !== "undefined" && /tauri/i.test(navigator.userAgent)) return true;

  return false;
}

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    throw new Error("Not running in Tauri runtime");
  }
  return await tauriInvoke<T>(cmd, args);
}

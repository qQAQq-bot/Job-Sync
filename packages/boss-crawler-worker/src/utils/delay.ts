/**
 * Shared delay utilities with AbortSignal support.
 */

export function delay(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });
}

export function delayWithJitter(baseMs: number, signal: AbortSignal, jitterMs = 1000): Promise<void> {
  return delay(baseMs + Math.random() * jitterMs, signal);
}

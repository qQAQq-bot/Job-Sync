import { ref } from "vue";

const DEFAULT_COPY_TIMEOUT_MS = 1200;

export function useCopy(timeoutMs = DEFAULT_COPY_TIMEOUT_MS): {
  readonly copiedKey: Readonly<{ value: string | null }>;
  copy: (key: string, text: string) => Promise<void>;
  copyLabel: (key: string, label: string) => string;
} {
  const copiedKey = ref<string | null>(null);

  async function copy(key: string, text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      copiedKey.value = key;
      window.setTimeout(() => {
        if (copiedKey.value === key) copiedKey.value = null;
      }, timeoutMs);
    } catch {
      // ignore
    }
  }

  function copyLabel(key: string, label: string): string {
    return copiedKey.value === key ? "已复制" : label;
  }

  return { copiedKey, copy, copyLabel };
}

